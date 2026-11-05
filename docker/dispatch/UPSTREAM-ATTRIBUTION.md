# Dispatch worker provenance

The RoboShop order-event contract used by this worker is compatible with the archived [Instana Robot Shop](https://github.com/instana/robot-shop/tree/master/dispatch) dispatch example: the `robot-shop` direct exchange, durable `orders` queue, and `orders` routing key.

The upstream project is licensed under Apache License 2.0. Its license text is retained in [LICENSE](LICENSE). This repository's worker is a new implementation of the AMQP consumer contract; it does not copy the upstream Go implementation. It adds environment-based RabbitMQ credentials, manual message acknowledgements, reconnect handling, health/readiness endpoints, and graceful shutdown.

**Functional boundary:** the worker validates and accepts order events, then acknowledges them. It does not call a real warehouse, courier, or shipping carrier. Integrate a real fulfilment provider before describing this as production dispatch automation.
