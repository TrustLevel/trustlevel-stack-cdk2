# Use an official Ubuntu as a parent image
FROM ubuntu:20.04

# Set the working directory
WORKDIR /app

# Install necessary packages
RUN apt-get update && \
    apt-get install -y wget && \
    apt-get install -y sudo && \
    apt-get clean

# Download the SNET Daemon binary
RUN wget "https://drive.google.com/u/0/uc?id=1jbme-TD_HVOlyvkdcT_B0iOOzUpM9c3r&export=download" -O snetd

# Change the permissions of the file
RUN chmod +x snetd

# Set the command to run SNET Daemon
CMD ["./snetd", "-c", "snetd.config.json"]

# Expose the port that SNETD will run on
EXPOSE 7001
