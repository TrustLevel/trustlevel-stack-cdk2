# Snetd container

## Repository creation

```bash
# authenticate docker to the ECR repository
AWS_PROFILE=trustlevel aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 086829801639.dkr.ecr.eu-west-1.amazonaws.com

# create ECR repository
AWS_PROFILE=trustlevel aws ecr create-repository --repository-name snetd --region eu-west-1
```

## Build and push docker image

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

docker buildx build --platform linux/amd64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/snetd:latest --push .

# validation only
docker manifest inspect 086829801639.dkr.ecr.eu-west-1.amazonaws.com/snetd:latest
```

## Upload config

```bash

# Upload config once bucket is there
AWS_PROFILE=trustlevel aws s3 cp ./configs/dev/.snet/snetd.config.json s3://dev-snetd-config/snetd.config.json

AWS_PROFILE=trustlevel aws s3 cp ./configs/prd/.snet/snetd.config.json s3://prd-snetd-config/snetd.config.json

```

## Create org

 c.f.: https://github.com/TrustLevel/snet-poc?tab=readme-ov-file#identity-and-org-setup

## Restart

```bash
AWS_PROFILE=trustlevel aws ecs update-service --cluster dev-SnetdCluster --service dev-SnetdFargateService --force-new-deployment --region eu-west-1 
```
