#!/bin/bash

echo "Starting the HTTP server for health checks on port 8080"
# Start the Python HTTP server for health checks
python3 /app/health_check_server.py &

echo "HTTP server for health checks started"

# Use the STAGE environment variable to determine the correct S3 bucket
BUCKET_NAME="${STAGE}-snetd-config"

# Copy the config file from S3
aws s3 cp s3://${BUCKET_NAME}/snetd.config.json /app/snetd.config.json

# Start the SNET Daemon
./snetd -c snetd.config.json

echo "Keep the start script running"
tail -f /dev/null