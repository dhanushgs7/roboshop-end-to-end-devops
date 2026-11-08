# RoboShop End-to-End DevOps

An end-to-end DevOps implementation for the RoboShop microservices application. The project covers source validation, containerization, infrastructure automation, Kubernetes deployment, Jenkins CI/CD, and Argo CD GitOps.

## Project architecture

```text
Developer
   |
   v
GitHub repository
   |
   +--> GitHub Actions
   |      +--> Application unit tests
   |      +--> Docker Compose integration tests
   |      +--> Docker image build and Trivy scan
   |      +--> Kubernetes manifest validation
   |      +--> Terraform validation
   |      +--> Ansible syntax validation
   |      +--> Jenkinsfile validation
   |
   v
Jenkins CI pipeline
   +--> Checkout source
   +--> Run unit tests
   +--> Build nine custom images
   +--> Scan images with Trivy
   +--> [opt-in] Push immutable tags to Amazon ECR
   +--> [opt-in] Update the GitOps branch
                         |
                         v
                    Argo CD
                         |
                         v
                  Amazon EKS
                         |
                         v
                 RoboShop services
```

The application contains the frontend, Catalogue, User, Cart, Shipping, Payment and Dispatch services, with MongoDB, MySQL, Redis and RabbitMQ supporting them. The Docker Compose stack runs 11 containers.

### Deployment responsibilities

- **Jenkins** builds, tests and scans images. When explicitly enabled, it pushes images to ECR and updates the Kubernetes image references on the `gitops` branch.
- **Argo CD** watches the `gitops` branch and reconciles the Kubernetes manifests into EKS.
- **Terraform** provisions AWS infrastructure only when an operator reviews and runs it. Jenkins never runs `terraform apply`.
- **Ansible** configures the supported EC2 and Jenkins hosts.
- **GitHub Actions** validates source and infrastructure configuration. It does not deploy to AWS.

Jenkins does not run `kubectl apply` and does not require EKS cluster-admin permissions. Argo CD is the deployment controller.

## Repository structure

```text
roboshop-end-to-end-devops/
├── .github/workflows/
├── ansible/
│   ├── group_vars/
│   ├── playbooks/
│   └── templates/
├── docker/
│   ├── frontend/
│   ├── catalogue/
│   ├── user/
│   ├── cart/
│   ├── shipping/
│   ├── payment/
│   ├── dispatch/
│   ├── mongodb/
│   ├── mysql/
│   ├── docker-compose.yml
│   └── docker-compose.ci.yml
├── jenkins/
│   └── Jenkinsfile
├── kubernetes/
│   ├── argocd-application.yaml
│   ├── namespace.yaml
│   ├── frontend.yaml
│   ├── frontend-ingress.yaml
│   ├── catalogue.yaml
│   ├── user.yaml
│   ├── cart.yaml
│   ├── shipping.yaml
│   ├── payment.yaml
│   ├── dispatch.yaml
│   ├── redis.yaml
│   ├── rabbitmq.yaml
│   └── database/
│       ├── mongodb.yaml
│       └── mysql.yaml
├── terraform/
│   ├── 00-vpc/
│   ├── 10-sg/
│   ├── 20-sg-rules/
│   ├── 30-bastion/
│   ├── 40-databases/
│   ├── 50-backend-alb/
│   ├── 60-catalogue/
│   ├── 70-acm/
│   ├── 80-frontend-alb/
│   ├── 90-components/
│   ├── 95-cdn/
│   ├── 96-vpn/
│   └── 100-eks/
├── tests/
│   └── integration/
└── README.md
```

The repository also contains service-specific source files, tests, Dockerfiles, Terraform module files and GitHub Actions workflow definitions inside these directories.

## Technology stack

| Layer | Technologies |
|---|---|
| Source control | Git, GitHub |
| Application | Node.js, Python, Java/Spring Boot, Go |
| Containers | Docker, Docker Compose |
| CI | GitHub Actions, Jenkins |
| Image security | Trivy |
| Infrastructure as Code | Terraform |
| Configuration management | Ansible |
| Container registry | Amazon ECR |
| Container orchestration | Kubernetes, Amazon EKS |
| GitOps continuous delivery | Argo CD |
| AWS services | VPC, EC2, IAM, EKS, ECR, EBS, ALB, Route 53 |

Prometheus, Grafana, Alertmanager and Node Exporter are not part of this RoboShop project.

## Run locally with Docker Compose

### Requirements

- Docker Engine or Docker Desktop
- Docker Compose v2
- Git

### 1. Configure local environment variables

From the repository root:

```bash
cp docker/.env.example docker/.env
```

Edit `docker/.env` and set strong local-only values for the database and RabbitMQ passwords. Do not commit this file.

### 2. Build and start the application

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml up -d --build
```

### 3. Verify the stack

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml ps
docker compose --env-file docker/.env -f docker/docker-compose.yml logs --tail 100
```

Open the frontend at [http://localhost](http://localhost).

### 4. Stop the stack

```bash
docker compose --env-file docker/.env -f docker/docker-compose.yml down
```

This keeps named volumes. Add `-v` only when you intentionally want to delete local database data.

## Automated validation

GitHub Actions contains the following workflows:

| Workflow | What it validates |
|---|---|
| `application-tests.yml` | Payment, Shipping and Dispatch unit tests |
| `compose-integration.yml` | Builds the stack, checks service connectivity and verifies Dispatch consumes a RabbitMQ order event |
| `docker-validation.yml` | Compose configuration, all nine custom image builds and Trivy scans |
| `kubernetes-validation.yml` | Kubernetes manifests and the Argo CD Application declaration |
| `terraform-validation.yml` | Formatting, initialization and validation for every Terraform component |
| `ansible-validation.yml` | Inventory parsing and playbook syntax |
| `jenkins-validation.yml` | Jenkinsfile Groovy syntax and CI/GitOps safety gates |

These workflows validate code and configuration. They do not provision AWS infrastructure or deploy application workloads.

Run the local integration suite with the Compose CI override:

```bash
docker compose \
  --env-file docker/.env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.ci.yml \
  up -d --build

npm --prefix tests/integration run test:integration

docker compose \
  --env-file docker/.env \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.ci.yml \
  down --volumes --remove-orphans
```

The integration suite checks service health, MongoDB and Redis connectivity, seeded catalogue products, Cart persistence, Shipping behavior, Payment validation and Dispatch readiness. The Compose workflow also publishes a synthetic RabbitMQ order and verifies that Dispatch consumes it.

The registered-user full-checkout test is opt-in with `RUN_FULL_CHECKOUT=true`. It calls the configured demo payment endpoint and creates test data; run it only in a disposable, non-production environment.

## Terraform and AWS infrastructure

Terraform components are under `terraform/`. The `100-eks` component creates the EKS control plane, managed node group, cluster access entry for the operator, core EKS add-ons and the EBS CSI driver integration.

The earlier numbered components also contain the trainer's EC2-based RoboShop infrastructure. Do not apply the EC2 application components and the EKS application deployment as if they were one interchangeable stack. Select the intended architecture and review each component's dependencies before provisioning.

### EKS inputs

The EKS component expects:

- An existing VPC ID.
- At least two private subnets in separate Availability Zones for worker nodes.
- At least two public subnets for internet-facing load balancers.
- An operator public IPv4 CIDR in `/32` format for the EKS API endpoint.
- A supported EKS Kubernetes version and suitable node capacity.

The EKS component creates an EBS CSI driver IAM role and installs the EBS CSI add-on. The Kubernetes database manifests define the encrypted `gp3-csi` StorageClass and persistent volume claims.

### Safe infrastructure workflow

For each Terraform component:

1. Review its `variables.tf`, `parameters.tf`, provider configuration and README.
2. Supply environment-specific values outside source control.
3. Initialize Terraform using the correct backend configuration.
4. Run `terraform fmt -check` and `terraform validate`.
5. Run `terraform plan` and inspect every proposed resource change.
6. Confirm the expected AWS cost and obtain approval before `terraform apply`.

Never commit AWS credentials, private keys, Terraform state, state bucket names or real environment secrets. EKS control planes, EC2 nodes, NAT gateways, load balancers, EBS volumes, public IPv4 addresses and data transfer can incur charges.

## Ansible

Ansible configuration, inventory examples, group variables, templates and playbooks are under `ansible/`.

1. Copy `ansible/inventory.ini.example` to `ansible/inventory.ini`.
2. Replace documentation IP addresses with the actual private addresses of the target hosts.
3. Supply SSH access using a private key outside version control.
4. Review the target hosts and variables before running a playbook.
5. Run syntax validation before making host changes.

The legacy EC2 management playbook has explicit confirmation variables because it can create or delete billable EC2 instances and Route 53 records. Do not enable those operations without reviewing the target AWS account, region and expected cost.

## Jenkins CI/CD and Argo CD GitOps

### Jenkins pipeline behavior

The Jenkins pipeline runs tests, validates Compose, builds all nine custom images and scans them with Trivy. Image publishing and GitOps updates are opt-in parameters and default to `false`.

| Parameter | Default | Effect |
|---|---:|---|
| `PUSH_IMAGES` | `false` | Push build-tagged images to the configured ECR repositories |
| `UPDATE_GITOPS` | `false` | Update Kubernetes image references on the `gitops` branch |

To enable image publishing, configure the Jenkins agent with Docker, AWS CLI v2 and Trivy, and attach an AWS IAM role with permissions scoped to the RoboShop ECR repositories. The pipeline uses region `us-east-1` and repository prefix `roboshop`.

To enable GitOps publication:

1. Add a Jenkins **Secret text** credential with ID `github-gitops-token`.
2. Give the token write access to repository contents for this repository. Do not store it in the Jenkinsfile.
3. Ensure the Jenkins job builds the application source branch and has permission to push to the `gitops` branch.
4. Run a build with `PUSH_IMAGES=true` and `UPDATE_GITOPS=true`.

The pipeline creates the `gitops` branch on its first publication. On later runs it merges the source commit into that branch, updates the nine custom image references to the immutable ECR tag, and pushes the GitOps commit. It does not connect to the Kubernetes API.

### Install and connect Argo CD

Argo CD must be installed in the EKS cluster by a cluster administrator. The following is a manual cluster setup operation, not part of the Jenkins pipeline:

```bash
kubectl create namespace argocd

kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

If this GitHub repository is private, configure a read-only repository credential in Argo CD using a GitHub token stored securely outside the repository. Do not commit the token or put it in a manifest.

After the first Jenkins build has created and populated the `gitops` branch, apply the Argo CD Application:

```bash
kubectl apply -f kubernetes/argocd-application.yaml
```

The Application tracks the `gitops` branch and recursively reads the `kubernetes/` directory. It excludes its own Application manifest. Automated sync, self-healing and pruning are enabled. Argo CD then reconciles the image tags published by Jenkins into EKS.

### Required EKS add-ons and secrets

Before syncing the application, verify that:

- EBS CSI is installed and healthy, and `gp3-csi` can provision EBS volumes.
- AWS Load Balancer Controller is installed with its recommended IAM permissions and service account. The `frontend-ingress.yaml` resource depends on this controller to create the Application Load Balancer. Follow the [AWS Load Balancer Controller installation guide](https://docs.aws.amazon.com/eks/latest/userguide/lbc-manifest.html).
- Public subnets have the `kubernetes.io/role/elb=1` discovery tag.
- The application namespace and required credentials are available.

Create the application secrets securely before the first Argo CD sync. The manifests expect:

| Secret | Required keys | Consumers |
|---|---|---|
| `mysql-credentials` | `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `DB_PASSWORD` | MySQL and Shipping |
| `rabbitmq-credentials` | `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS` | RabbitMQ, Payment and Dispatch |

The three MySQL values must be set consistently with the intended database credentials. Store secrets in a secret manager or create them interactively; never commit secret values.

## Application behavior and limitations

- Payment retains the existing dummy gateway reachability check. It is not a real payment processor. Do not use this implementation for real transactions.
- Dispatch consumes the Payment service's `robot-shop` / `orders` RabbitMQ event contract. It records dispatch acceptance; it does not integrate with a real warehouse or courier.
- The User service stores new passwords as salted scrypt hashes and upgrades legacy plaintext records after successful login. Production use still requires rate limiting, robust session/token authentication, email validation and broader security testing.
- Persistent database volumes require deliberate backup and teardown planning. Removing a namespace or PVC can affect stored data depending on the StorageClass reclaim policy.

## Project scope

This repository covers Git/GitHub, Jenkins, Docker, Docker Compose, AWS ECR, Terraform, Ansible, AWS EKS, Kubernetes YAML, GitHub Actions, Trivy, integration testing and Argo CD GitOps.

Prometheus, Grafana, Alertmanager, Node Exporter and the monitoring stack are intentionally excluded from RoboShop.
