# Spacytextblob container

Based on [spacytextblob-poc](https://github.com/TrustLevel/spacytextblob-poc) this is the Spacytextblob container project deployed to AWS.

## Repository creation

```bash
# authenticate docker to the ECR repository
AWS_PROFILE=trustlevel aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 086829801639.dkr.ecr.eu-west-1.amazonaws.com

# create ECR repository
AWS_PROFILE=trustlevel aws ecr create-repository --repository-name spacytextblob --region eu-west-1
```

## Build and push docker image

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

docker buildx build --platform linux/amd64,linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/spacytextblob:latest --push .

# validation only
docker manifest inspect 086829801639.dkr.ecr.eu-west-1.amazonaws.com/spacytextblob:latest
```

## Update service on aws

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

# push new image based on current local state
docker buildx build --platform linux/amd64,linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/spacytextblob:latest --push .

# force new deployment
AWS_PROFILE=trustlevel aws ecs update-service --cluster <stage>-SpacytextblobCluster --service <stage>-SpacytextblobService --force-new-deployment --region eu-west-1

# example:
AWS_PROFILE=trustlevel aws ecs update-service --cluster dev-SpacytextblobCluster --service dev-SpacytextblobService --force-new-deployment --region eu-west-1 
```
