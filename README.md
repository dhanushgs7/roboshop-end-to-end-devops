# RoboShop End-to-End DevOps

A source-built RoboShop microservices project that demonstrates the path from application code to container images, CI validation, AWS infrastructure and Kubernetes deployment.

> **Project rule:** Kubernetes deployments use plain YAML manifests with `kubectl`. Helm is intentionally not part of this project.

## EKS deployment prerequisites

The Jenkins EKS deployment stage is opt-in and expects a pre-provisioned cluster, EBS CSI driver with the `gp3-csi` StorageClass, AWS Load Balancer Controller, and Kubernetes credentials. Before applying workloads, it verifies the required MySQL and RabbitMQ Secret names and keys and refuses to deploy if any trainer-owned image reference remains after rendering. Review [the EKS deployment prerequisites](docs/eks-deployment-prerequisites.md) before enabling `DEPLOY_TO_EKS`. Terraform provisioning is a separate reviewed operation; application pushes never run `terraform apply`.

## Architecture

```text
Browser
  |
  v
Frontend (Nginx :80)
  |-- /api/catalogue --> Catalogue --> MongoDB
  |-- /api/user -------> User -------> MongoDB + Redis
  |-- /api/cart -------> Cart -------> Redis + Catalogue
  |-- /api/shipping ---> Shipping ---> MySQL + Cart
  |-- /api/payment ----> Payment ----> User + Cart + RabbitMQ
  |
  v
Docker Compose (local integration environment)

GitHub
  |
  v
Jenkins CI/CD
  |-- payment service unit tests
  |-- Docker image build
  |-- Trivy vulnerability scan
  |-- push images to AWS ECR
  |
  v
Amazon EKS
  |-- Kubernetes YAML manifests
  |-- Services / Deployments / ConfigMaps / Secrets
  |-- AWS load-balancer integration
  |
  v
RoboShop application
```

Terraform provisions AWS infrastructure separately from application deployments. Infrastructure changes must be reviewed before `terraform apply`; application pushes must not automatically create or destroy AWS infrastructure.

## Repository layout

| Path | Purpose |
|---|---|
| `.github/workflows/` | GitHub Actions validation and source-check workflows |
| `docker/` | Application source, Dockerfiles and Compose stack |
| `jenkins/` | Jenkins pipeline and automation |
| `ansible/` | Ansible configuration and playbooks |
| `terraform/` | AWS infrastructure components, including `100-eks` |
| `kubernetes/` | Kubernetes Deployments, Services, storage and ingress resources |
| `docker/payment/tests/` | Payment service unit tests |\n| `docker/shipping/src/test/` | Shipping service controller unit tests |
| `monitoring/` | Monitoring configuration (to be completed) |
| `docs/` | Architecture and operational documentation |

The application build contexts currently present under `docker/` are `catalogue`, `user`, `cart`, `payment`, `shipping`, `frontend`, `mongodb` and `mysql`. Redis and RabbitMQ use upstream images.

## Run locally with Docker Compose

Requirements: Docker Engine or Docker Desktop with the Compose plugin.

1. Create a local environment file from the example:

   ```bash
   cp docker/.env.example docker/.env
   ```

2. Edit `docker/.env` and replace the example passwords with strong local-only values. Do not commit this file.

3. Build the custom images from this repository and start the stack:

   ```bash
   docker compose -f docker/docker-compose.yml --env-file docker/.env up -d --build
   ```

4. Inspect service status and logs:

   ```bash
   docker compose -f docker/docker-compose.yml --env-file docker/.env ps
   docker compose -f docker/docker-compose.yml --env-file docker/.env logs --tail 100
   ```

5. Open the frontend at [http://localhost](http://localhost).

6. Stop the stack without deleting persistent volumes:

   ```bash
   docker compose -f docker/docker-compose.yml --env-file docker/.env down
   ```

Do not use `down -v` unless you intentionally want to delete local database volumes.

## CI validation

GitHub Actions validates the Compose configuration and builds all eight custom images from source. Trivy scans each built image and uploads JSON vulnerability reports as workflow artifacts. The initial Trivy pass is report-only so existing findings can be reviewed before a blocking severity threshold is introduced.

Terraform CI runs formatting and validation for the existing infrastructure components and the EKS component. These checks do not provision AWS resources.

## AWS and Kubernetes deployment

- Terraform configuration is under `terraform/`; the EKS component is `terraform/100-eks`.
- Kubernetes manifests are under `kubernetes/`.
- Images must be built and pushed to repositories in the user's own ECR registry before EKS deployment.
- Replace example image references and environment-specific values through reviewed configuration; do not copy trainer account IDs, ARNs, domains, credentials or state bucket names.
- Supply database and application credentials through Kubernetes Secrets or an approved secret-management integration. Never commit real secrets.
- Review network routing, NAT/internet egress, IAM permissions, EKS add-ons, EBS CSI and load-balancer-controller configuration before deployment.
- EKS, EC2 worker nodes, NAT gateways, load balancers and EBS storage can incur AWS charges. Run a plan and review costs before applying infrastructure.

No AWS infrastructure is created by the local Compose workflow or the CI validation workflows.

## Important implementation notes

- Dispatch source was not present in the trainer RoboShop source repositories inspected for this project. It is not represented by fabricated application code; add it only when a legitimate source package is available.
- Payment and shipping service unit tests are wired into GitHub Actions and Jenkins. Catalogue, User and Cart currently receive JavaScript syntax validation in CI; automated behavioral unit/integration/regression coverage for these Node.js services and the full checkout flow remains to be added. A green Compose health check is not a substitute for successful end-to-end checkout tests.
- The User service must hash passwords and must never return password values in API responses before production use.
- Use a dedicated, least-privilege CI identity for ECR push and EKS deployment. Prefer short-lived AWS role credentials over static access keys.

## Project scope

Git/GitHub, Jenkins, Docker, AWS ECR, Terraform, Ansible, AWS EKS, Kubernetes YAML, service testing, Trivy, and Prometheus/Grafana monitoring. Helm is excluded by design.
