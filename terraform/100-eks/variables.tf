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
  type    = string
  default = "vpc-00e7139437975be1a"
}

variable "private_subnet_ids" {
  type = list(string)
  default = [
    "subnet-0877a0e382708af4e",
    "subnet-08c8de13e77ffb359"
  ]

  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "Provide private subnets in at least two Availability Zones."
  }
}

variable "public_subnet_ids" {
  type = list(string)
  default = [
    "subnet-0bb8e47f90f5f8097",
    "subnet-0918ed91c3ff270f0"
  ]
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
  type    = number
  default = 1
}

variable "min_nodes" {
  type    = number
  default = 1
}

variable "max_nodes" {
  type    = number
  default = 2
}
