package main

import (
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
)

func TestDecodeOrderAcceptsPaymentEvent(t *testing.T) {
	body := []byte(`{"orderid":"order-123","user":"alice","cart":{"total":120,"items":[{"sku":"SKU-1","qty":2}]}}`)
	order, err := decodeOrder(body)
	if err != nil {
		t.Fatalf("decodeOrder returned error: %v", err)
	}
	if order.OrderID != "order-123" || order.User != "alice" {
		t.Fatalf("unexpected order: %+v", order)
	}
}

func TestDecodeOrderRejectsInvalidPayloads(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{name: "invalid JSON", body: `{"orderid":`},
		{name: "missing order id", body: `{"cart":{"items":[]}}`},
		{name: "missing cart", body: `{"orderid":"order-123"}`},
		{name: "cart is not an object", body: `{"orderid":"order-123","cart":[]}`},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, err := decodeOrder([]byte(test.body)); err == nil {
				t.Fatal("expected invalid payload to be rejected")
			}
		})
	}
}

func TestHealthAndReadinessEndpoints(t *testing.T) {
	var ready atomic.Bool
	handler := healthHandler(&ready)

	health := httptest.NewRecorder()
	handler.ServeHTTP(health, httptest.NewRequest(http.MethodGet, "/health", nil))
	if health.Code != http.StatusOK || health.Body.String() != "OK" {
		t.Fatalf("unexpected health response: %d %q", health.Code, health.Body.String())
	}

	notReady := httptest.NewRecorder()
	handler.ServeHTTP(notReady, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if notReady.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected not-ready status, got %d", notReady.Code)
	}

	ready.Store(true)
	isReady := httptest.NewRecorder()
	handler.ServeHTTP(isReady, httptest.NewRequest(http.MethodGet, "/readyz", nil))
	if isReady.Code != http.StatusOK || isReady.Body.String() != "ready" {
		t.Fatalf("unexpected ready response: %d %q", isReady.Code, isReady.Body.String())
	}
}
