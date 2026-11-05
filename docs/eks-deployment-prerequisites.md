# EKS deployment prerequisites

The Jenkins deployment stage is deliberately opt-in. It assumes the EKS platform has already been provisioned and configured. It does not create or modify the EKS cluster, VPC, IAM roles, add-ons, or secrets.

## 1. Required AWS platform components

Before selecting `DEPLOY_TO_EKS`, verify all of the following:

- The EKS cluster named by `EKS_CLUSTER_NAME` exists in `AWS_REGION`.
- The Jenkins agent's IAM role can call ECR login/push and EKS DescribeCluster. Set `deployment_principal_arn` in `terraform/100-eks` to this IAM role ARN and apply the reviewed Terraform change to create a namespace-scoped EKS access entry for `roboshop` and `monitoring`.
- The cluster has at least one Ready worker node with enough CPU and memory for the application.
- The Amazon EBS CSI driver is installed and healthy.
- The `gp3-csi` StorageClass exists and provisions EBS volumes in the worker-node Availability Zones.
- The AWS Load Balancer Controller is installed in `kube-system`, has the required IAM permissions, and can discover the public subnets.
- Public subnets have the AWS Load Balancer Controller discovery tag `kubernetes.io/role/elb=1`; private subnets (if used for internal load balancers) use `kubernetes.io/role/internal-elb=1`. Tag values and routing must match the intended architecture.
- The cluster's node and pod network paths allow access to ECR, required AWS APIs, and the application dependencies.

The Ingress manifest uses an internet-facing ALB with IP targets. The controller must be installed before applying it. The ALB and data volumes incur AWS charges.

## 2. Required Kubernetes secrets

Create both namespaces once with a cluster-administrator identity:

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f monitoring/kubernetes/namespace.yaml
```

Before handing access to Jenkins, an administrator must also verify the AWS Load Balancer Controller is healthy in `kube-system` and that the `gp3-csi` StorageClass exists. The Jenkins role is intentionally namespace-scoped and does not read or mutate cluster-scoped resources. The administrator must verify the StorageClass and AWS Load Balancer Controller before handing deployment access to Jenkins.

Supply credentials through a secure local shell or approved secret manager. Do not commit the values or put them in Jenkinsfile, YAML, GitHub Actions logs, or shell history.

The current manifests expect these exact secret names and keys:

| Secret | Required keys | Consumers |
|---|---|---|
| `mysql-credentials` | `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `DB_PASSWORD` | MySQL and Shipping |
| `rabbitmq-credentials` | `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS` | RabbitMQ, Payment and Dispatch |
| `grafana-admin` (namespace `monitoring`) | `admin-password` | Grafana admin login |

The three MySQL keys must be set to the intended values. `MYSQL_PASSWORD` and `DB_PASSWORD` represent the same application database password in the current manifests. Create the `grafana-admin` secret in the `monitoring` namespace as described in `monitoring/README.md`; the Jenkins deployment stage checks for it before applying the monitoring stack.

Example command shape (replace environment variable values securely before running):

```bash
kubectl -n roboshop create secret generic mysql-credentials \
  --from-literal=MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  --from-literal=MYSQL_PASSWORD="$DB_PASSWORD" \
  --from-literal=DB_PASSWORD="$DB_PASSWORD"

kubectl -n roboshop create secret generic rabbitmq-credentials \
  --from-literal=RABBITMQ_DEFAULT_USER="$RABBITMQ_DEFAULT_USER" \
  --from-literal=RABBITMQ_DEFAULT_PASS="$RABBITMQ_DEFAULT_PASS"
```

For repeatable production use, manage these values with an approved external secret manager rather than storing literal values in repository files.

## 3. Jenkins agent requirements

The Jenkins agent needs:

- Docker Engine and Docker Compose v2
- AWS CLI v2
- kubectl compatible with the EKS cluster
- Trivy
- Git and a shell compatible with the Jenkins pipeline

Use an attached IAM role or workload identity where available. Do not store long-lived AWS access keys in the repository.

The IAM policy should be scoped to this project's ECR repositories and the minimum EKS discovery/push operations. The Terraform EKS component can create an access entry for `deployment_principal_arn` and associate `AmazonEKSAdminPolicy` only with the `roboshop` and `monitoring` namespaces. This avoids granting Jenkins cluster-admin access. The Jenkins pipeline does not create namespaces, inspect `kube-system`, or read cluster-scoped StorageClass resources.

## 4. Deployment order

The pipeline:

1. Builds and scans all nine custom images from this repository's source.
2. When `PUSH_IMAGES=true`, creates missing ECR repositories and pushes immutable build-specific tags.
3. When `DEPLOY_TO_EKS=true`, connects to the configured cluster and checks the required namespace-scoped Secrets and keys. StorageClass and AWS Load Balancer Controller readiness must be verified by the cluster administrator before deployment.
4. Renders the Kubernetes manifests to use the exact ECR image tag from the current build.
5. Applies MongoDB, MySQL, Redis and RabbitMQ first, then waits for all four backing-service Deployments to become Ready.
6. Applies the application services, Dispatch worker, frontend and Ingress, then waits for each application Deployment rollout. Payment has HTTP readiness and liveness probes on `/health`.
7. Applies the monitoring stack into the pre-created `monitoring` namespace and waits for Prometheus and Grafana rollouts.

Terraform provisioning remains a separate, manually reviewed operation. A source-code push never runs `terraform apply`.

## 5. Cost and teardown

EKS control plane, worker nodes, NAT gateways, ALBs, EBS volumes, public IPv4 addresses, and data transfer can incur charges. Review the AWS Pricing Calculator and the current account's Free Tier eligibility before provisioning.

When the demonstration is complete, remove resources deliberately in dependency order. Deleting a namespace does not necessarily delete retained EBS volumes or all AWS load balancer resources. Inspect AWS resources and Terraform state before teardown.
