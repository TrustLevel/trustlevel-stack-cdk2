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
    --entrypoint "" \
    snet-cli tail -f /dev/null

# Run commands in the container
docker exec snet-cli snet identity list

# Create consumer identity
docker exec snet-cli snet identity create consumer-identity-2 key --private-key $(op read "op://Private/MetaMask Wallet/Wallet/private key") --network goerli

# Check identity balance
docker exec snet-cli snet account balance

# Check organization info
docker exec snet-cli snet organization info trustlevel-aws-test

# Open payment channel - current block + 200 blocks (assuming 15 sec/block) - min 100
docker exec -it snet-cli snet channel open-init trustlevel-aws-test default_groups 1.0 +200

# Execute service call
docker exec -it snet-cli snet client call trustlevel-aws-test trustlevel-aws-service-test-5 default_groups determineTrustLevel '{"query":"Hello World"}'

# Close payment channel - only possible if the channel has been expired
docker exec -it snet-cli snet channel claim-timeout-all
```