#!/bin/bash

set -euo pipefail

# This script tests the testnet by running a series of commands 
# to ensure that the testnet deployment is running correctly.

test_consumer_identity="consumer-identity-2"
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

function establish_payment_channel() {
    output=$(docker exec snet-cli snet channel print-all-filter-group trustlevel-aws-test-id default_groups)
    echo "$output"
    channel_count=$(echo "$output" | wc -l)
    if [ "$channel_count" -le 1 ]; then
        echo "📻 No open channel found, open a new payment channel - current block + 200 blocks (assuming 15 sec/block) - min 100"
        docker exec -it snet-cli snet channel open-init trustlevel-aws-test-id default_groups 0.5 +2days
        return 0
    fi
    
    expiration=$(echo "$output" | awk 'NR==2 {print $NF}')

    if (( expiration > 0 )); then
        echo "📻 Channel is still open, add more tokens"
        docker exec -it snet-cli snet channel extend-add-for-org trustlevel-aws-test-id default_groups --amount 0.5
        return 0
    fi

    echo "📻 Extend channel"
    docker exec -it snet-cli snet channel extend-add-for-org trustlevel-aws-test-id default_groups --amount 0.5 --expiration +200
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

echo "🔍 Checking if consumer identity exists"
output=$(docker exec snet-cli snet identity list)
if [[ $output == *"$test_consumer_identity"* ]]; then
    echo "✅ $test_consumer_identity exists"
else
    echo "❌ $test_consumer_identity does not exist. Please create the identity"
    exit 1
fi

echo "🔀 Switching to $test_consumer_identity"
docker exec snet-cli snet identity "$test_consumer_identity"
    
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

echo "📻 Establish payment channel ..."
establish_payment_channel

echo "🚀 Execute service call"
output=$(docker exec snet-cli snet client call -y trustlevel-aws-test-id trustlevel-aws-service-2 default_groups determineBias '{"input_string":"Hello World"}')
echo "🔍 Checking if the service call was successful"
echo "$output"

score=$(echo "$output" | awk -F ': ' '/score:/ {print $2}')
if [ "$(echo "$score > 0.9" | bc)" -eq 1 ]; then
    echo "✅ Service call was successful with score: $score"
else
    echo "❌ Service call was not successful"
    exit 1
fi

echo "🔚 Closing payment channel"
docker exec -it snet-cli snet channel claim-timeout-all

#
# Further snippets
#

# docker exec -it snet-cli snet channel extend-add-for-org trustlevel-aws-test-id default_groups --amount 0.000001 --expiration +2days 

# 1. Check if channel still exists
# docker exec -it snet-cli snet channel print-all-filter-group trustlevel-aws-test-id default_groups
# Extend channel
# docker exec -it snet-cli snet channel extend-add-for-org trustlevel-aws-test-id default_groups --amount 1.0 --expiration +200
# docker exec -it snet-cli snet channel extend-add-for-org trustlevel-aws-test-id default_groups --amount 0.000001 --expiration +2days 
