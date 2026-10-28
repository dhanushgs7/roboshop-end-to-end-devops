
resource "aws_iam_role" "vpn" {
  name = "${local.common_name}-vpn-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "vpn_secret" {
  name = "${local.common_name}-vpn-secret-read"
  role = aws_iam_role.vpn.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameter"]
      Resource = "arn:aws:ssm:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/vpn_admin_password"
    }]
  })
}

data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

resource "aws_iam_instance_profile" "vpn" {
  name = "${local.common_name}-vpn-profile"
  role = aws_iam_role.vpn.name
}

resource "aws_instance" "vpn" {
  ami                    = local.ami_id
  instance_type          = "t3.micro"
  vpc_security_group_ids = [local.vpn_sg_id]
  subnet_id              = local.public_subnet_id
  iam_instance_profile   = aws_iam_instance_profile.vpn.name

  user_data = templatefile("${path.module}/vpn.sh.tftpl", {
    password_parameter = "/${var.project}/${var.environment}/vpn_admin_password"
  })

  tags = merge(
    {
      Name = "${local.common_name}-vpn"
    },
    local.common_tags
  )
}
