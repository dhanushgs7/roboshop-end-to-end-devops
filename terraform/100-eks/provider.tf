terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.48.0"
    }
  }

  backend "s3" {
    bucket       = "roboshop-terraform-state-357229908934"
    key          = "roboshop-eks.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
}
