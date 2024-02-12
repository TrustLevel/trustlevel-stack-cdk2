# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Install dependencies
# Copy the requirements file first to leverage Docker cache
COPY ./src/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code
COPY ./src .

# Specify huggingface model cache location
ENV HF_HOME=/usr/src/app/huggingface_cache

# locally cache hugging face model
RUN python cache-model.py

# Add non-root user for security
RUN useradd -m myuser

# Create logs directory and set permissions (local run only)
RUN mkdir /usr/src/app/logs \
    && chown -R myuser:myuser /usr/src/app/logs \
    && chown -R myuser:myuser /usr/src/app/huggingface_cache

# Switch to non-root user
USER myuser

# Inform Docker that the container is listening on the specified port at runtime.
EXPOSE 5000

# Make sure transformer is searching locally for model
ENV HF_DATASETS_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1

# Run the application
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]