from backend.app.core.security import assert_safe_url
import pytest

def test_blocks_loopback():
    with pytest.raises(ValueError): assert_safe_url('http://127.0.0.1:8000')

def test_allows_public_hostname():
    assert assert_safe_url('https://example.org').startswith('https://example.org')
