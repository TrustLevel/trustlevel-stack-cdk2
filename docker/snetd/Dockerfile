FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set a non-interactive frontend for apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary packages including AWS CLI
RUN apt-get update && \
    apt-get install -y wget awscli && \
    apt-get clean

# Reset the frontend (optional)
ENV DEBIAN_FRONTEND=dialog

# Copy startup script
COPY start.sh /app/
RUN chmod +x /app/start.sh

# Download the SNET Daemon binary and change permissions
RUN wget --progress=dot:giga "https://drive.google.com/u/0/uc?id=1jbme-TD_HVOlyvkdcT_B0iOOzUpM9c3r&export=download" -O snetd && \
    chmod +x snetd

# Set the command to run the startup script
CMD ["./start.sh"]

EXPOSE 7001