"""The failing test. Looks for a 'Login' button; the app renders 'Sign In'."""

import app


def test_login_button_exists():
    html = app.render_login_page()
    assert "Login" in html, "expected a Login button on the login page"


if __name__ == "__main__":
    test_login_button_exists()
    print("PASS: login test")
