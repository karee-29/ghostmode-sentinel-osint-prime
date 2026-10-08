import ipaddress
import socket
from urllib.parse import urlparse

_BLOCKED_MESSAGE = "Private, loopback, link-local, reserved and multicast targets are blocked"

def normalize_target(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Target is required")
    if len(value) > 255:
        raise ValueError("Target is too long")
    return value

def _is_blocked_ip(value: str) -> bool:
    ip = ipaddress.ip_address(value)
    return any((ip.is_private, ip.is_loopback, ip.is_link_local, ip.is_reserved, ip.is_multicast, ip.is_unspecified))

def _assert_hostname_safe(host: str) -> None:
    try:
        if _is_blocked_ip(host):
            raise ValueError(_BLOCKED_MESSAGE)
        return
    except ValueError as exc:
        if str(exc) == _BLOCKED_MESSAGE:
            raise

    try:
        infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror:
        # DNS failure is not an SSRF bypass; the downstream HTTP request will fail too.
        return

    for info in infos:
        address = info[4][0]
        if _is_blocked_ip(address):
            raise ValueError(_BLOCKED_MESSAGE)

def assert_safe_url(url: str) -> str:
    parsed = urlparse(url if "://" in url else "https://" + url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only HTTP(S) URLs are allowed")
    if parsed.username or parsed.password:
        raise ValueError("Userinfo in URLs is not allowed")
    host = parsed.hostname
    if not host:
        raise ValueError("Invalid hostname")
    _assert_hostname_safe(host)
    return parsed.geturl()
