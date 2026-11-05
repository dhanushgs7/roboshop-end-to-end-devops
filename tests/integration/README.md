# RoboShop post-deployment integration smoke tests

These tests run against an already deployed RoboShop environment. They do not create infrastructure or deploy application workloads.

## Requirements

- Node.js 20 or newer (no third-party npm dependencies required)
- RoboShop services deployed and reachable
- Catalogue seeded with at least one product
- Cart, User, Catalogue, Shipping, and Payment endpoints reachable from the machine running the tests

## Local EKS access with port-forwarding

Run these commands in separate terminals after the EKS deployment is ready:

```bash
kubectl -n roboshop port-forward service/cart 18080:8080
kubectl -n roboshop port-forward service/catalogue 18081:8080
kubectl -n roboshop port-forward service/user 18082:8080
kubectl -n roboshop port-forward service/shipping 18083:8080
kubectl -n roboshop port-forward service/payment 18084:8080
```

Then, from the repository root:

```bash
npm --prefix tests/integration run test:integration
```

If services are exposed through another network path, override the endpoint variables:

- `CART_URL`
- `CATALOGUE_URL`
- `USER_URL`
- `SHIPPING_URL`
- `PAYMENT_URL`

## Coverage

The smoke suite checks database/cache readiness, catalogue seed data, cart-to-catalogue integration, cart persistence, shipping-to-cart integration, payment validation, and the Cart/Payment Prometheus metrics endpoints.

The suite intentionally does not submit a real payment, create a user, or trigger RabbitMQ order publishing. It creates one uniquely named test cart and attempts to delete it during cleanup. These are deployment smoke tests, not a replacement for full checkout regression, security, load, or failure-recovery testing.
