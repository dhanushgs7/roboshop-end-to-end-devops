// Dispatch worker for RoboShop.
// The order-event contract follows the archived Instana Robot Shop example;
// this implementation adds explicit configuration, health endpoints,
// manual acknowledgements, reconnect handling, and graceful shutdown.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type orderMessage struct {
	OrderID string          `json:"orderid"`
	User    string          `json:"user"`
	Cart    json.RawMessage `json:"cart"`
}

type config struct {
	amqpHost   string
	amqpPort   string
	amqpUser   string
	amqpPass   string
	amqpVHost  string
	exchange   string
	queue      string
	routingKey string
	httpPort   string
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func loadConfig() config {
	return config{
		amqpHost:   env("AMQP_HOST", "rabbitmq"),
		amqpPort:   env("AMQP_PORT", "5672"),
		amqpUser:   env("AMQP_USER", "guest"),
		amqpPass:   os.Getenv("AMQP_PASS"),
		amqpVHost:  env("AMQP_VHOST", "/"),
		exchange:   env("AMQP_EXCHANGE", "robot-shop"),
		queue:      env("AMQP_QUEUE", "orders"),
		routingKey: env("AMQP_ROUTING_KEY", "orders"),
		httpPort:   env("HTTP_PORT", "8080"),
	}
}

func (c config) amqpURL() string {
	vhost := c.amqpVHost
	if !strings.HasPrefix(vhost, "/") {
		vhost = "/" + vhost
	}
	u := url.URL{
		Scheme: "amqp",
		User:   url.UserPassword(c.amqpUser, c.amqpPass),
		Host:   net.JoinHostPort(c.amqpHost, c.amqpPort),
		Path:   vhost,
	}
	return u.String()
}

func decodeOrder(body []byte) (orderMessage, error) {
	var order orderMessage
	if err := json.Unmarshal(body, &order); err != nil {
		return order, fmt.Errorf("decode order JSON: %w", err)
	}
	if strings.TrimSpace(order.OrderID) == "" {
		return order, errors.New("orderid is required")
	}
	if len(order.Cart) == 0 || string(order.Cart) == "null" {
		return order, errors.New("cart is required")
	}
	var cart map[string]json.RawMessage
	if err := json.Unmarshal(order.Cart, &cart); err != nil || cart == nil {
		return order, errors.New("cart must be a JSON object")
	}
	return order, nil
}

func consumeOnce(ctx context.Context, c config, ready *atomic.Bool) error {
	conn, err := amqp.DialConfig(c.amqpURL(), amqp.Config{
		Heartbeat: 10 * time.Second,
		Locale:    "en_US",
	})
	if err != nil {
		return fmt.Errorf("connect to RabbitMQ: %w", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return fmt.Errorf("open RabbitMQ channel: %w", err)
	}
	defer ch.Close()

	if err := ch.ExchangeDeclare(c.exchange, "direct", true, false, false, false, nil); err != nil {
		return fmt.Errorf("declare exchange: %w", err)
	}
	q, err := ch.QueueDeclare(c.queue, true, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("declare queue: %w", err)
	}
	if err := ch.QueueBind(q.Name, c.routingKey, c.exchange, false, nil); err != nil {
		return fmt.Errorf("bind queue: %w", err)
	}
	if err := ch.Qos(10, 0, false); err != nil {
		return fmt.Errorf("configure consumer prefetch: %w", err)
	}

	deliveries, err := ch.Consume(q.Name, "roboshop-dispatch", false, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("start order consumer: %w", err)
	}

	ready.Store(true)
	defer ready.Store(false)
	log.Printf("connected to RabbitMQ; consuming exchange=%s queue=%s routing_key=%s", c.exchange, q.Name, c.routingKey)

	for {
		select {
		case <-ctx.Done():
			return nil
		case delivery, ok := <-deliveries:
			if !ok {
				return errors.New("RabbitMQ delivery channel closed")
			}
			order, decodeErr := decodeOrder(delivery.Body)
			if decodeErr != nil {
				log.Printf("rejecting invalid order message: %v", decodeErr)
				if err := delivery.Nack(false, false); err != nil {
					return fmt.Errorf("reject invalid order: %w", err)
				}
				continue
			}

			// The supplied RoboShop sample has no carrier/warehouse integration.
			// This worker records successful dispatch acceptance and acknowledges
			// the event; a real fulfilment adapter can replace this boundary.
			log.Printf("dispatch accepted order_id=%s user=%s", order.OrderID, order.User)
			if err := delivery.Ack(false); err != nil {
				return fmt.Errorf("acknowledge order %s: %w", order.OrderID, err)
			}
		}
	}
}

func runConsumer(ctx context.Context, c config, ready *atomic.Bool) {
	for {
		if ctx.Err() != nil {
			return
		}
		if err := consumeOnce(ctx, c, ready); err != nil && ctx.Err() == nil {
			log.Printf("RabbitMQ consumer stopped: %v; retrying in 2 seconds", err)
		}
		ready.Store(false)
		select {
		case <-ctx.Done():
			return
		case <-time.After(2 * time.Second):
		}
	}
}

func healthHandler(ready *atomic.Bool) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, _ *http.Request) {
		if !ready.Load() {
			http.Error(w, "RabbitMQ consumer is not connected", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ready"))
	})
	return mux
}

func main() {
	c := loadConfig()
	if _, err := strconv.Atoi(c.httpPort); err != nil {
		log.Fatalf("HTTP_PORT must be a number: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var ready atomic.Bool
	go runConsumer(ctx, c, &ready)

	server := &http.Server{
		Addr:              ":" + c.httpPort,
		Handler:           healthHandler(&ready),
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}()

	log.Printf("dispatch health server listening on :%s", c.httpPort)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("HTTP server failed: %v", err)
	}
}
