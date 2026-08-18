import os
from typing import Any

import boto3

USER_POOL_ID = os.environ["USER_POOL_ID"]
USER_POOL_CLIENT_ID = os.environ["USER_POOL_CLIENT_ID"]
ADMIN_GROUP_NAME = "admin"

_cognito = boto3.client("cognito-idp")


class CognitoUsersError(Exception):
    def __init__(self, message: str, *, status_code: int = 400) -> None:
        super().__init__(message)
        self.status_code = status_code


def list_all_users() -> list[dict[str, Any]]:
    users: list[dict[str, Any]] = []
    token = None
    while True:
        kwargs: dict[str, Any] = {"UserPoolId": USER_POOL_ID, "Limit": 60}
        if token:
            kwargs["PaginationToken"] = token
        response = _cognito.list_users(**kwargs)
        users.extend(response.get("Users", []))
        token = response.get("PaginationToken")
        if not token:
            break
    return users


def list_admin_usernames() -> set[str]:
    usernames: set[str] = set()
    token = None
    while True:
        kwargs: dict[str, Any] = {"UserPoolId": USER_POOL_ID, "GroupName": ADMIN_GROUP_NAME, "Limit": 60}
        if token:
            kwargs["NextToken"] = token
        response = _cognito.list_users_in_group(**kwargs)
        usernames.update(user["Username"] for user in response.get("Users", []))
        token = response.get("NextToken")
        if not token:
            break
    return usernames


def create_cognito_user(email: str, person_id: str, org_id: str, *, make_admin: bool) -> None:
    try:
        _cognito.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            UserAttributes=[
                {"Name": "email", "Value": email},
                {"Name": "email_verified", "Value": "true"},
                {"Name": "custom:personId", "Value": person_id},
                {"Name": "custom:orgId", "Value": org_id},
            ],
            DesiredDeliveryMediums=["EMAIL"],
        )
    except _cognito.exceptions.UsernameExistsException as exc:
        raise CognitoUsersError("A user with that email already exists.", status_code=409) from exc
    except _cognito.exceptions.InvalidParameterException as exc:
        raise CognitoUsersError(str(exc), status_code=400) from exc

    if make_admin:
        _cognito.admin_add_user_to_group(UserPoolId=USER_POOL_ID, Username=email, GroupName=ADMIN_GROUP_NAME)


def set_user_enabled(username: str, enabled: bool) -> None:
    try:
        if enabled:
            _cognito.admin_enable_user(UserPoolId=USER_POOL_ID, Username=username)
        else:
            _cognito.admin_disable_user(UserPoolId=USER_POOL_ID, Username=username)
    except _cognito.exceptions.UserNotFoundException as exc:
        raise CognitoUsersError("User not found.", status_code=404) from exc


def trigger_password_reset(username: str) -> None:
    try:
        _cognito.forgot_password(ClientId=USER_POOL_CLIENT_ID, Username=username)
    except _cognito.exceptions.UserNotFoundException as exc:
        raise CognitoUsersError("User not found.", status_code=404) from exc
