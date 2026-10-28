variable "project" {
  default = "roboshop"
}

variable "environment" {
  default = "dev"
}

variable "zone_id" {
  default = "Z07086101C1CVP7AT2UK4"
}

variable "domain_name" {
  default = "daws90s.shop"
}

variable "mysql_root_password" {
  type = string
}
variable "ec2_key_name" {
  description = "Name of the AWS EC2 key pair"
  type        = string
  default     = "daws-90s"
}
variable "ssh_private_key_path" {
  description = "Local path to the private SSH key used by Terraform"
  type        = string
  sensitive   = true
}
