# Terraform infrastructure

Terraform is split into independent components. Review each component's README and variables before running a plan. The EKS component is `100-eks`; other folders contain the earlier RoboShop infrastructure components.

## State backend configuration

The repository deliberately does not contain an AWS account-specific state bucket. Each component uses a partial S3 backend with a distinct state key.

1. Create or select a private S3 bucket in your own AWS account for Terraform state. Enable encryption and appropriate access controls.
2. From the `terraform/` directory, copy `backend.hcl.example` to `backend.hcl` and set your bucket name.
3. Keep `backend.hcl` local; it is ignored by Git.
4. Initialize a component from its own directory:

```bash
cd terraform/100-eks
terraform init -backend-config=../backend.hcl
```

The backend uses native S3 lockfiles (Terraform 1.10+) and encryption. Do not reuse a state key across components. Never commit state files, backend configuration, tfvars, credentials, or private keys.

## EKS inputs

The EKS module no longer contains account-specific VPC or subnet IDs. Supply values in an ignored local tfvars file or through approved environment variables:

- `vpc_id`
- `private_subnet_ids` (at least two AZs; worker nodes need NAT or suitable VPC endpoints for ECR/AWS APIs)
- `public_subnet_ids` (at least two AZs; internet-facing ALB subnet discovery)
- `admin_cidr` (one trusted public IPv4 address in /32 format)

Example shape for a local `terraform.tfvars` file (replace every placeholder with verified values):

```hcl
vpc_id            = "vpc-REPLACE_ME"
private_subnet_ids = ["subnet-PRIVATE_A", "subnet-PRIVATE_B"]
public_subnet_ids  = ["subnet-PUBLIC_A", "subnet-PUBLIC_B"]
admin_cidr         = "203.0.113.10/32"
```

Do not commit the file. The example address is documentation-only and must be replaced with your current trusted public IP.

## EKS add-ons

The EKS component provisions the cluster and managed node group, configures subnet discovery tags, installs VPC CNI, kube-proxy, CoreDNS and the AWS EBS CSI add-on, and creates a narrowly scoped OIDC role for the EBS CSI controller. The `gp3-csi` StorageClass in `kubernetes/storage/` depends on the EBS CSI add-on becoming healthy.

The AWS Load Balancer Controller is a separate prerequisite for the ALB Ingress. Follow the official AWS EKS installation procedure for the controller and its IAM policy; this project does not use Helm.

## Cost and safety

Terraform plans and applies can create billable EKS control planes, EC2 nodes, NAT gateways, ALBs, EBS volumes, public IPv4 addresses and other AWS resources. Review the full plan and estimated cost before applying. No GitHub Actions workflow runs `terraform apply`.
