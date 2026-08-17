import json


def json_response(status_code: int, body) -> dict:
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def empty_response(status_code: int) -> dict:
    return {"statusCode": status_code, "headers": {}, "body": ""}
