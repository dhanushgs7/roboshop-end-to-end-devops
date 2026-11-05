# Ansible usage and safety

## Jenkins agent preparation

The `playbooks/jenkins-agent-prerequisites.yaml` playbook prepares an Ubuntu 22.04+ x86_64 Jenkins agent with Java 17, Git, Docker Engine, Docker Compose v2, AWS CLI v2, kubectl (default v1.34.0; override `kubectl_version` to match your EKS minor version), Trivy, and common utilities.

1. Create an inventory file named `ansible/inventory.ini` (it is intentionally not committed) with a `[jenkins_agents]` group.
2. Verify SSH access and privilege escalation.
3. Run a syntax check: `ansible-playbook --syntax-check ansible/playbooks/jenkins-agent-prerequisites.yaml`.
4. Review the target hosts, then run the playbook from the repository root with the appropriate inventory.

The playbook does not install or register Jenkins itself, configure controller credentials, create cloud resources, or assign IAM permissions. Install AWS CLI v2, kubectl, and Trivy from their official sources and register the agent using a securely handled Jenkins secret. Prefer an instance profile/IAM role over static AWS keys.

## Legacy EC2/Route 53 playbook

`playbooks/roboshop.yaml` is a legacy EC2/Route 53 provisioning example. It can create or delete billable AWS resources and DNS records. It is not part of the EKS Terraform workflow and must not be run as part of normal CI/CD. It now requires an explicit confirmation variable and caller-supplied AMI/domain values before it can proceed.

## Application configuration playbooks

The numbered application playbooks are legacy EC2 configuration examples. They download application artifacts from the training S3 bucket and expect host inventory and service endpoints to be supplied by the operator. They are not used by the EKS deployment pipeline.

Never commit private inventory files, credentials, account IDs, domain names, SSH private keys, or generated secrets.
