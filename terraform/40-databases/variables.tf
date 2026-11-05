variable "project" {
  default = "roboshop"
}

variable "environment" {
  default = "dev"
}

variable "zone_id" {}

variable "domain_name" {}

variable "mysql_root_password" {
  description = "Root password for the database instance"
  type        = string
  sensitive   = true
}
variable "ec2_key_name" {
  description = "Name of the AWS EC2 key pair"
  type        = string
}
variable "ssh_private_key_path" {
  description = "Local path to the private SSH key used by Terraform"
  type        = string
  sensitive   = true
}
