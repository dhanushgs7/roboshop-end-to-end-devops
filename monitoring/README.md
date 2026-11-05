# Monitoring configuration

This directory contains starter configuration for Prometheus and Grafana. It is not an installation or a claim that monitoring is already running in the cluster.

## Prometheus

- `prometheus/prometheus.yml` scrapes the Cart and Payment services on their existing `/metrics` endpoints.
- The targets assume the Kubernetes namespace is `roboshop` and that Prometheus is deployed in a namespace named `monitoring`.
- The Prometheus target itself is included for self-monitoring.
- The current Shipping service does not expose a Prometheus metrics endpoint in this repository, so it is intentionally not listed.
- Catalogue and User currently expose health endpoints, not Prometheus metrics endpoints.

Before applying this configuration, deploy Prometheus in the `monitoring` namespace, mount this file as its configuration, and ensure network policies permit scraping. The service DNS names and ports must match the deployed Services.

## Grafana

Import `grafana/dashboards/roboshop-app-metrics.json` into Grafana and select the Prometheus data source when prompted. It charts the Cart `items_added` and Payment `sold_count` counters. These are cumulative counters; use rate-based PromQL panels for throughput trends in a production dashboard.

No Helm chart or operator is required by these files. Deployment manifests for Prometheus/Grafana and persistent storage are separate follow-up work.
