variable "project" {
  default = "roboshop"
}

variable "environment" {
  default = "dev"
}
variable "admin_cidr" {
  description = "Trusted public IPv4 CIDR allowed to SSH to the bastion, e.g. your IP with /32"
  type        = string

  validation {
    condition     = can(cidrnetmask(var.admin_cidr))
    error_message = "admin_cidr must be a valid IPv4 CIDR block."
  }
}