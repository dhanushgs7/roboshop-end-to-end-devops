variable "project" {
  default = "roboshop"
}

variable "environment" {
  default = "dev"
}

variable "app_version" {
  default = "v3"
}

variable "domain_name" {}
variable "ec2_key_name" {
  description = "Name of the AWS EC2 key pair"
  type        = string
}

variable "ssh_private_key_path" {
  description = "Local path to the private SSH key used by Terraform"
  type        = string
  sensitive   = true
}
