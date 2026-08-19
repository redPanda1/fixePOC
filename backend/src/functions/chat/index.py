import json
import os

from strands import Agent
from strands.models import BedrockModel
from strands.session.s3_session_manager import S3SessionManager

from prompts import FIXE_AGENT_PROMPT
from tools import get_fixe_data

SESSION_BUCKET = os.environ["SESSION_BUCKET"]
CLAUDE_MODEL_ID = os.environ["CLAUDE_MODEL_ID"]

model = BedrockModel(model_id=CLAUDE_MODEL_ID)


def json_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def handler(event, _context):
    person_id = event["requestContext"]["authorizer"]["jwt"]["claims"].get("custom:personId")
    if not person_id:
        return json_response(400, {"message": "Authenticated user is missing personId."})

    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return json_response(400, {"message": "Request body must be valid JSON."})

    message = body.get("message")
    if not isinstance(message, str) or not message.strip():
        return json_response(400, {"message": "Request body must include a non-empty 'message'."})

    session_manager = S3SessionManager(session_id=person_id, bucket=SESSION_BUCKET)
    agent = Agent(model=model,
    session_manager=session_manager,
    system_prompt=FIXE_AGENT_PROMPT,
    tools=[get_fixe_data])
    result = agent(message)

    return json_response(200, {"reply": str(result)})
