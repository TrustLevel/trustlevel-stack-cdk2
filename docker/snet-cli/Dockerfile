# Use an official Python image
FROM python:3.11.6-slim

# Install Node.js and Git
RUN apt-get update && \
    apt-get install -y libudev-dev libusb-1.0-0-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Clone the SNET-cli repository
RUN pip3 install --no-cache-dir snet.cli==2.1.2

# Set the entrypoint to the SNET command
ENTRYPOINT ["snet"]
