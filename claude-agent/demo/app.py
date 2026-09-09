"""The 'app' under test. Tiny stand-in for a real login page."""

import auth


def render_login_page():
    return f"""
    <form id="login">
      <input name="username" />
      <input name="password" type="password" />
      <button id="submit">{auth.BUTTON_LABEL}</button>
    </form>
    """
