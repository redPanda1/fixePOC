import os
from typing import Any

import boto3
from boto3.dynamodb.conditions import Attr

PERSON_TABLE_NAME = os.environ["PERSON_TABLE_NAME"]

_dynamodb = boto3.resource("dynamodb")
_person_table = _dynamodb.Table(PERSON_TABLE_NAME)


def resolve_recipients(org_id: str) -> list[dict[str, Any]]:
    # Table is tiny at POC scale and there's exactly one user per org today (per product
    # decision), so a Scan is fine - no OrgIndex GSI on fixePerson exists yet. Revisit with
    # a GSI + a persisted role if orgs ever get multiple users and this needs to be scoped
    # to customer-role people specifically.
    result = _person_table.scan(FilterExpression=Attr("orgId").eq(org_id))
    return result.get("Items", [])
