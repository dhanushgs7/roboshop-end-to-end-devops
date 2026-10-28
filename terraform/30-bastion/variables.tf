variable "project" {
  default = "roboshop"
}

variable "environment" {
  default = "dev"
}
variable "ec2_key_name" {
  description = "Name of the existing AWS EC2 key pair"
  type        = string
  default     = "daws-90s"
}