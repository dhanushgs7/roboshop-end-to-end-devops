# Ansible usage and safety

## Jenkins agent preparation

The `playbooks/jenkins-agent-prerequisites.yaml` playbook prepares an Ubuntu 22.04+ x86_64 Jenkins agent with Java 17, Git, Docker Engine, Docker Compose v2, AWS CLI v2, kubectl (default v1.34.0; override `kubectl_version` to match your EKS minor version), Trivy, and common utilities.

1. From the repository root, copy `ansible/inventory.ini.example` to `ansible/inventory.ini` and replace the example host with your Jenkins agent's private DNS name or IP.
2. Verify SSH access and privilege escalation for the `ansible_user`.
3. Change into `ansible/` so `ansible.cfg` and its relative inventory path are loaded.
4. Run a syntax check: `ansible-playbook --syntax-check playbooks/jenkins-agent-prerequisites.yaml`.
5. Review the target hosts, then run `ansible-playbook playbooks/jenkins-agent-prerequisites.yaml`. The playbook changes the target host; do not run it against production without reviewing the tasks first.

The playbook does not install or register Jenkins itself, configure controller credentials, create cloud resources, or assign IAM permissions. Install AWS CLI v2, kubectl, and Trivy from their official sources and register the agent using a securely handled Jenkins secret. Prefer an instance profile/IAM role over static AWS keys.

## Legacy EC2/Route 53 playbook

`playbooks/roboshop.yaml` is a legacy EC2/Route 53 provisioning example. It can create or delete billable AWS resources and DNS records. It is not part of the EKS Terraform workflow and must not be run as part of normal CI/CD. It now requires an explicit confirmation variable and caller-supplied AMI/domain values before it can proceed.

## Application configuration playbooks

The numbered application playbooks are legacy EC2 configuration examples. They download application artifacts from the training S3 bucket and expect host inventory and service endpoints to be supplied by the operator. They are not used by the EKS deployment pipeline.

Never commit private inventory files, credentials, account IDs, domain names, SSH private keys, or generated secrets.
