# Use an official Python image
FROM python:3.11.6-slim

# Install Node.js and Git
RUN apt-get update && \
    apt-get install -y nodejs npm git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Clone the SNET-cli repository
RUN git clone https://github.com/singnet/snet-cli.git

# Set the working directory
WORKDIR /snet-cli/packages/snet_cli

# Install SNET-cli
RUN ./scripts/blockchain install && \
    pip install -e .

# Set the entrypoint to the SNET command
ENTRYPOINT ["snet"]
