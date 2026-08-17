import json

from create import handle_create
from delete import handle_delete
from get import handle_get
from list_receipts import handle_list
from responses import json_response


def handler(event, _context):
    person_id = event["requestContext"]["authorizer"]["jwt"]["claims"].get("custom:personId")
    if not person_id:
        return json_response(400, {"message": "Authenticated user is missing personId."})

    method = event["requestContext"]["http"]["method"]
    receipt_id = (event.get("pathParameters") or {}).get("id")

    if method == "POST" and receipt_id is None:
        try:
            body = json.loads(event.get("body") or "{}")
        except json.JSONDecodeError:
            return json_response(400, {"message": "Request body must be valid JSON."})
        return handle_create(person_id, body)

    if method == "GET" and receipt_id is None:
        return handle_list(person_id)

    if method == "GET" and receipt_id is not None:
        return handle_get(person_id, receipt_id)

    if method == "DELETE" and receipt_id is not None:
        return handle_delete(person_id, receipt_id)

    return json_response(404, {"message": "Not found"})
