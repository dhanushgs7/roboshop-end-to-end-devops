variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  type    = string
  default = "roboshop"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "cluster_name" {
  type    = string
  default = "roboshop-dev"
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version; confirm regional support before applying"
  type        = string
  default     = "1.34"
}

variable "vpc_id" {
  description = "ID of the existing VPC for the EKS cluster"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnets in at least two Availability Zones with outbound access to ECR and AWS APIs"
  type        = list(string)

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "Provide private subnets in at least two Availability Zones."
  }
}

variable "public_subnet_ids" {
  description = "Public subnets in at least two Availability Zones for internet-facing AWS load balancers"
  type        = list(string)

  validation {
    condition     = length(var.public_subnet_ids) >= 2
    error_message = "Provide public subnets in at least two Availability Zones."
  }
}

variable "admin_cidr" {
  description = "Your public IPv4 CIDR for EKS API access, e.g. 203.0.113.10/32"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.admin_cidr)) && endswith(var.admin_cidr, "/32")
    error_message = "Use one public IPv4 address in /32 format."
  }
}

variable "node_instance_types" {
  description = "EC2 instance types for EKS worker nodes"
  type        = list(string)
  default     = ["t3.small"]
}

variable "desired_nodes" {
  description = "Initial worker count; two small nodes provide pod and memory capacity for the 11-service stack"
  type        = number
  default     = 2
}

variable "min_nodes" {
  type    = number
  default = 2
}

variable "max_nodes" {
  type    = number
  default = 3
}
