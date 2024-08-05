# SNet CLI
SNet CLI is a command line tool for SingularityNET platform. It allows you to interact with the platform from the command line.

## Usage - TestNet
```bash
# Build the docker image
docker build -t snet-cli .

# Run the container as deamon
docker run --name snet-cli -d -v $(pwd)/.snet:/root/.snet \
    -v $(pwd)/../snetd/configs/dev/data:/data \
    -v $(pwd)/../snetd/configs/dev/src:/app/src \
    -v $(pwd)/../grpc-service/src/spec:/app/spec \
    --entrypoint "" \
    snet-cli tail -f /dev/null

# Run commands in the container
docker exec snet-cli snet identity list

# Create consumer identity
docker exec snet-cli snet identity create consumer-identity-2 key --private-key $(op read "op://Private/MetaMask Wallet/Wallet/private key") --network sepolia

# Check identity balance
docker exec snet-cli snet account balance

# Check organization info
docker exec snet-cli snet organization info trustlevel-aws-test

# Open payment channel - current block + 200 blocks (assuming 15 sec/block) - min 100
docker exec -it snet-cli snet channel open-init trustlevel-aws-test default_groups 1.0 +200

# Execute service call
docker exec -it snet-cli snet client call trustlevel-aws-test-id trustlevel-aws-service default_groups determineTrustLevel '{"query":"Hello World"}'

# Close payment channel - only possible if the channel has been expired
docker exec -it snet-cli snet channel claim-timeout-all
```


## Usage - MainNet
```bash
docker exec snet-cli snet identity create consumer-identity-2 key --private-key $(op read "op://Private/MetaMask Wallet/Wallet/private key") --network sepolia


snet organization info fafe2dc448cd4e0bb581d2c29020282f

snet service print-metadata fafe2dc448cd4e0bb581d2c29020282f trustlevel-bias-service
```


## Repository creation

```bash
# authenticate docker to the ECR repository
AWS_PROFILE=trustlevel aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 086829801639.dkr.ecr.eu-west-1.amazonaws.com

# create ECR repository
AWS_PROFILE=trustlevel aws ecr create-repository --repository-name snet-cli --region eu-west-1
```

## Build and push docker image

```bash
# authenticate docker to the ECR repository
AWS_PROFILE=trustlevel aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin 086829801639.dkr.ecr.eu-west-1.amazonaws.com

# setup buildx to build for different platfroms (such as amd64 and arm64)
docker buildx create --name mybuilder --use
docker buildx inspect --bootstrap

docker buildx build --platform linux/arm64 -t 086829801639.dkr.ecr.eu-west-1.amazonaws.com/snet-cli:latest --push .

# validation only
docker manifest inspect 086829801639.dkr.ecr.eu-west-1.amazonaws.com/snet-cli:latest
```