import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

def handler(event, context):
    logging.info(f"Received event: {json.dumps(event)}")
    return "Event processed successfully"
