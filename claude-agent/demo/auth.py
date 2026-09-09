"""Auth UI strings and password checking. The real bug lives here."""

BUTTON_LABEL = "Sign In"

VALID_USERS = {"qa_user": "s3cret"}


def check_password(username, password):
    return VALID_USERS.get(username) == password
