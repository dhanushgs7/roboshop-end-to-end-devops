# Amazon EKS component

This component creates the RoboShop EKS control plane and managed node group in an existing VPC.

## Inputs

Supply the following values in a local, ignored `terraform.tfvars` file:

- `vpc_id`
- `private_subnet_ids` — at least two private subnets across AZs, with NAT or VPC endpoints for ECR and AWS APIs
- `public_subnet_ids` — at least two public subnets across AZs for internet-facing ALB discovery
- `admin_cidr` — a trusted public IPv4 /32 for the EKS public API endpoint

No account-specific VPC, subnet, state bucket, or CIDR values are embedded in this component. See [the Terraform guide](../README.md) for backend configuration.

## Resources

- EKS control plane with API authentication and restricted public endpoint CIDR
- Managed EC2 node group in private subnets
- Cluster subnet discovery tags for load balancer provisioning
- EKS access entry for the Terraform caller's IAM issuer principal
- VPC CNI, kube-proxy and CoreDNS EKS add-ons
- EKS OIDC provider and scoped EBS CSI controller IAM role
- AWS EBS CSI EKS add-on required by the `gp3-csi` StorageClass

The AWS Load Balancer Controller remains a separate prerequisite for the project's ALB Ingress. Install it using the official AWS EKS procedure and a least-privilege IAM policy. Helm is not used in this project.

## Network checks

Before applying, verify private subnet route tables provide outbound connectivity to ECR and required AWS APIs (NAT gateway or appropriate VPC endpoints). Verify public subnets have internet-gateway routes for internet-facing ALBs. Terraform adds the standard EKS and ELB subnet discovery tags.

## Cost and safety

EKS control plane, EC2 worker nodes, NAT gateways, public IPv4 addresses, EBS volumes and ALBs can incur charges. Review `terraform plan` and cost estimates. CI runs formatting, initialization without a backend, and validation only. It never runs `terraform apply`.
