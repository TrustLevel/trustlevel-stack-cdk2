import requests
import json
import os

stage_url = os.environ['STAGE_URL']
stage_api_key = os.environ['STAGE_API_KEY']

def calculate_trust_level(input_string):
    """Fetches the trust level from a predefined URL."""
    
    url = f"{stage_url}/trustlevels/"
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': stage_api_key
    }
    data = {
        'text': input_string
    }

    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        response.raise_for_status()  # Raises an error for bad HTTP status codes

        # Extract the desired field from the JSON response
        return response.json().get('trustlevel', 0)
    except requests.RequestException as e:
        print(f"An error occurred: {e}")
        return 0
