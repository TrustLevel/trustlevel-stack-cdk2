#!/bin/bash

# Use the STAGE environment variable to determine the correct S3 bucket
BUCKET_NAME="${STAGE}-snetd-config"

# Copy the config file from S3
aws s3 cp s3://${BUCKET_NAME}/snetd.config.json /app/snetd.config.json

# Start the SNET Daemon
./snetd -c snetd.config.json