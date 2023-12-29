FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Set a non-interactive frontend for apt-get
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary packages including AWS CLI and Python
RUN apt-get update && \
    apt-get install -y wget awscli python3 && \
    apt-get clean

# Reset the frontend (optional)
ENV DEBIAN_FRONTEND=dialog

# Copy health check script
COPY health_check_server.py /app/
# Copy startup script
COPY start.sh /app/
RUN chmod +x /app/start.sh

# Download the SNET Daemon binary and change permissions
RUN wget "https://drive.google.com/u/0/uc?id=1jbme-TD_HVOlyvkdcT_B0iOOzUpM9c3r&export=download" -O snetd
RUN chmod +x snetd
RUN head -n 10 snetd

# Set the command to run the startup script
CMD ["./start.sh"]

# Expose the main service port and the health check port
EXPOSE 7001 8080
