resource "aws_iam_role" "mysql" {
  name = "${local.common_name}-mysql" # roboshop-dev-mysql

  # This is the trust policy, means we can attach this role to EC2 instance
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
    ]
  })

  tags = merge(
    {
      Name = "${local.common_name}-mysql"
    },
    local.common_tags
  )
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

data "aws_iam_policy_document" "mysql" {
  statement {
    sid       = "ReadMySQLRootPassword"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = ["arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/${var.project}/${var.environment}/mysql_root_password"]
  }

  statement {
    sid       = "DescribeParameters"
    effect    = "Allow"
    actions   = ["ssm:DescribeParameters"]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "mysql" {
  name        = "${local.common_name}-mysql"
  description = "Allow the MySQL instance to read its root password from this AWS account's SSM Parameter Store"
  policy      = data.aws_iam_policy_document.mysql.json
}

resource "aws_iam_role_policy_attachment" "mysql" {
  role       = aws_iam_role.mysql.name
  policy_arn = aws_iam_policy.mysql.arn
}

resource "aws_iam_instance_profile" "mysql" {
  name = "${local.common_name}-mysql"
  role = aws_iam_role.mysql.name
}