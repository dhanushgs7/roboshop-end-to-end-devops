# RoboShop post-deployment integration smoke tests

These tests run against an already deployed RoboShop environment. They do not create infrastructure or deploy application workloads.

## Requirements

- Node.js 20 or newer (no third-party npm dependencies required)
- RoboShop services deployed and reachable
- Catalogue seeded with at least one product
- Cart, User, Catalogue, Shipping, Payment, and Dispatch endpoints reachable from the machine running the tests

## Local EKS access with port-forwarding

Run these commands in separate terminals after the EKS deployment is ready:

```bash
kubectl -n roboshop port-forward service/cart 18080:8080
kubectl -n roboshop port-forward service/catalogue 18081:8080
kubectl -n roboshop port-forward service/user 18082:8080
kubectl -n roboshop port-forward service/shipping 18083:8080
kubectl -n roboshop port-forward service/payment 18084:8080
kubectl -n roboshop port-forward service/dispatch 18085:8080
```

Then, from the repository root:

```bash
npm --prefix tests/integration run test:integration

# Optional: run the full registered-user checkout flow in a non-production environment
RUN_FULL_CHECKOUT=true npm --prefix tests/integration run test:integration
```

If services are exposed through another network path, override the endpoint variables:

- `CART_URL`
- `CATALOGUE_URL`
- `USER_URL`
- `SHIPPING_URL`
- `PAYMENT_URL`
- `DISPATCH_URL`

## Coverage

The smoke suite checks database/cache readiness, catalogue seed data, cart-to-catalogue integration, cart persistence, shipping-to-cart integration, payment validation, Dispatch-to-RabbitMQ readiness, and the Cart/Payment Prometheus metrics endpoints.

By default, the suite does not submit a checkout payment, create a user, or trigger RabbitMQ order publishing. It creates one uniquely named test cart and attempts to delete it during cleanup. To additionally run the registered-user end-to-end checkout flow (registration → login → cart → shipping → payment → order history), set `RUN_FULL_CHECKOUT=true` before running the command. That optional flow calls the payment service's configured external demo gateway and publishes an order to RabbitMQ; it creates a uniquely named test user that remains in MongoDB because the current API has no user-delete endpoint. Use a non-production environment. The suite does not charge a real card. These are post-deployment regression checks, not a replacement for security, load, or failure-recovery testing.
