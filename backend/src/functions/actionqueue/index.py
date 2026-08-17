from responses import json_response


def handler(event, _context):
    # Route handlers are wired up in a later change (see docs/action-queue-mapping.md).
    return json_response(404, {"message": "Not found"})
