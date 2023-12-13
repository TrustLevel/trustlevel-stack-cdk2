# Use an official Python runtime as a parent image
FROM python:3.8-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Install dependencies
# Copy the requirements file first to leverage Docker cache
COPY ./src/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code
COPY ./src .

# Download the SpaCy model
RUN python -m spacy download en_core_web_sm

# Add non-root user for security
RUN useradd -m myuser

# Create logs directory and set permissions (local run only)
RUN mkdir /usr/src/app/logs && chown -R myuser:myuser /usr/src/app/logs

# Switch to non-root user
USER myuser

# Inform Docker that the container is listening on the specified port at runtime.
EXPOSE 5000

# Run the application
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]
