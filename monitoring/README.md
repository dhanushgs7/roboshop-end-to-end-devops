# Prometheus and Grafana monitoring

This directory contains the application scrape configuration, Grafana dashboard, and plain Kubernetes manifests for a small in-cluster monitoring stack. No Helm chart or operator is used.

## Components

- Prometheus scrapes its own health/metrics endpoint and the Cart and Payment `/metrics` endpoints every 15 seconds.
- Grafana is provisioned with the Prometheus data source and the RoboShop application dashboard.
- The dashboard shows the Cart `items_added` and Payment `sold_count` counters.
- Prometheus retains seven days of time-series data.
- Prometheus and Grafana use separate EBS-backed PVCs with the existing `gp3-csi` StorageClass.

Catalogue, User, and Shipping are not configured as scrape targets because the current application source does not expose Prometheus metrics endpoints for them.

## Prerequisites

1. EKS cluster is ready and the AWS EBS CSI driver is installed.
2. The `gp3-csi` StorageClass exists.
3. Cart and Payment are deployed in namespace `roboshop` and expose their existing `/metrics` routes on port 8080.
4. Create the Grafana admin secret in the `monitoring` namespace before applying the stack. Generate a unique password locally and do not commit it:

```bash
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
kubectl -n monitoring create secret generic grafana-admin \
  --from-literal=admin-password='REPLACE_WITH_A_UNIQUE_STRONG_PASSWORD'
```

Use a shell that safely handles your chosen password; avoid placing secrets in shell history in shared environments.

## Deploy

From the repository root:

```bash
kubectl apply -f monitoring/kubernetes/monitoring-stack.yaml
kubectl -n monitoring rollout status deployment/prometheus --timeout=5m
kubectl -n monitoring rollout status deployment/grafana --timeout=5m
```

The manifests create only ClusterIP services. They do not expose Prometheus or Grafana publicly. Access Grafana locally with:

```bash
kubectl -n monitoring port-forward service/grafana 3000:3000
```

Open `http://localhost:3000` and sign in with username `admin` and the password supplied in the Kubernetes Secret. The dashboard is provisioned automatically.

## Cost and lifecycle

The two PVCs request 5 GiB and 2 GiB of EBS gp3 storage. EBS storage incurs charges while provisioned, and the EKS worker nodes also incur charges. The PVCs and underlying volumes are persistent; review retention and deletion policy before removing the monitoring namespace. The StorageClass currently uses `reclaimPolicy: Delete`, so deleting a bound PVC can delete its EBS volume.

This configuration is a starter monitoring stack, not a highly available production observability platform. Prometheus and Grafana each run as a single replica.
