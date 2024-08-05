#!/bin/bash

# This script tests the testnet by running a series of commands 
# to ensure that the testnet deployment is running correctly.

snet_cli_path="$(dirname "$0")/../docker/snet-cli"

function build_snet_cli_image() {
    echo "🏗️ Building snet-cli image"
    # navigate to docker directory relative to script location
    cd "$snet_cli_path" || exit 
    docker build -t snet-cli -f Dockerfile .
    cd - || exit
}

function start_snet_cli_container() {
    echo "🚀 Starting snet-cli container"
    docker run --rm --name snet-cli -d -v "$snet_cli_path/.snet:/root/.snet" \
    -v "$snet_cli_path/../snetd/configs/dev/data:/data" \
    -v "$snet_cli_path/../snetd/configs/dev/src:/app/src" \
    -v "$snet_cli_path/../grpc-service/src/spec:/app/spec" \
    --entrypoint "" \
    snet-cli tail -f /dev/null
}


# check if the docker image snet-cli exists
if [ "$(docker images -q snet-cli 2> /dev/null)" ]; then
    echo "✅ snet-cli image exists"
else
    echo "📋 snet-cli image does not exist"
    build_snet_cli_image
fi

# check if the docker container snet-cli is running
if [ "$(docker ps -q -f name=snet-cli)" ]; then
    echo "✅ snet-cli is running"
else
    echo "📋 snet-cli is not running"
    start_snet_cli_container
fi

echo "🔍 Checking snet-cli identity list"
# TODO add check if identities exists. If not, exit with error
docker exec snet-cli snet identity list

echo "🔀 Switching to consumer-identity-2"
docker exec snet-cli snet identity consumer-identity-2
    
echo "💰 check consumer account balance"
output=$(docker exec snet-cli snet account balance)
echo "$output"

if [[ $output == *"AGIX: 0"* ]]; then
    echo "❌ AGIX balance is 0"
    exit 1
else
    echo "✅ AGIX balance is greater than 0"
fi

echo "🔍 Checking snet-cli organization list"
docker exec snet-cli snet organization info trustlevel-aws-test-id

echo "💰 Deposit Token to MPE"
docker exec -it snet-cli snet account deposit 0.000001

echo "📻 Open Payment channel - current block + 200 blocks (assuming 15 sec/block) - min 100"
docker exec -it snet-cli snet channel open-init trustlevel-aws-test-id default_groups 0.000001 +2days

echo "🚀 Execute service call"
docker exec -it snet-cli snet client call trustlevel-aws-test-id trustlevel-aws-service-2 default_groups determineBias '{"input_string":"Hello World"}'

echo "🔚 Closing payment channel"
docker exec -it snet-cli snet channel claim-timeout-all

# 1. Check if channel still exists
# snet channel print-all-filter-group trustlevel-aws-test-id default_groups
# Extend channel
# snet channel extend-add-for-org trustlevel-aws-test-id default_groups --amount 1.0 --expiration +200
# snet channel extend-add-for-org trustlevel-aws-test-id default_groups --amount 0.000001 --expiration +2days 
