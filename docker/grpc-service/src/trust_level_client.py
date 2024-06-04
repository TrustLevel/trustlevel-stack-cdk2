import requests
import json
import os
import logging

stage_url = os.environ["STAGE_URL"]
stage_api_key = os.environ["STAGE_API_KEY"]

LOGLEVEL = os.environ.get("LOGLEVEL", "INFO").upper()
logger = logging.getLogger(__name__)
logger.setLevel(level=LOGLEVEL)


def calculate_trust_level(input_string):
    """Fetches the trust level from a predefined URL."""

    url = f"{stage_url}/trustlevels"
    headers = {"Content-Type": "application/json", "x-api-key": stage_api_key}
    data = {"text": input_string}
    logger.debug(f"Sending request to {url} with data: {data}")

    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()  # Raises an error for bad HTTP status codes
        logger.debug(f"Received response: {response}")

        # Extract the desired field from the JSON response
        return response.json().get("trustlevel", 0)
    except requests.RequestException as e:
        print(f"An error occurred: {e}")
        return 0
