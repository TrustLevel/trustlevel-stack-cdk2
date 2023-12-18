# Trustlevel grpc container

## Local execution

```bash
# build the container
docker build -t trustlevel-grpc-server .
# run the container
docker run --name trustlevel-grpc-server -p 7077:7077 -e STAGE_URL=<stage-url> -e STAGE_API_KEY=<stage-api-key> trustlevel-grpc-server

# example:
docker run --name trustlevel-grpc-server -p 7077:7077 -e STAGE_URL=https://2q2ffhhelb.execute-api.eu-west-1.amazonaws.com/v1/ -e STAGE_API_KEY=<dev-stage-api-key> trustlevel-grpc-server

# connect to the container bash
docker exec -it trustlevel-grpc-server bash
# execute test client
python client.py --host localhost --port 7077
```

## Repository creation

```bash
# authenticate docker to the ECR repository
AWS_PROFILE=trustlevel aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 086829801639.dkr.ecr.eu-west-1.amazonaws.com

# create ECR repository
AWS_PROFILE=trustlevel aws ecr create-repository --repository-name trustlevel-grpc --region eu-west-1
```

## Build and push docker image

```bash
# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

docker buildx build --platform linux/amd64,linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/trustlevel-grpc:latest --push .

# validation only
docker manifest inspect 086829801639.dkr.ecr.eu-west-1.amazonaws.com/trustlevel-grpc:latest
```

## Update service on aws

```bash
# push new image based on current local state
docker buildx build --platform linux/amd64,linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/trustlevel-grpc:latest --push .

# force new deployment
AWS_PROFILE=trustlevel aws ecs update-service --cluster <stage>-TrustlevelGrpcCluster --service <stage>-TrustlevelGrpcFargateService --force-new-deployment --region eu-west-1

# example:
AWS_PROFILE=trustlevel aws ecs update-service --cluster dev-TrustlevelGrpcCluster --service dev-TrustlevelGrpcFargateService --force-new-deployment --region eu-west-1 
```