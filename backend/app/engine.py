from urllib.parse import urlparse

from .providers import ct, dns, github, httpmeta, rdap
from .core.security import assert_safe_url, normalize_target

async def collect(target: str, profile: str):
    target = normalize_target(target)
    findings = []
    warnings = []

    if profile == "github-public":
        return await github.collect(target)

    if "://" in target:
        safe = assert_safe_url(target)
        parsed = urlparse(safe)
        domain = parsed.hostname
        if not domain:
            raise ValueError("Invalid URL hostname")
    else:
        domain = target.lower().strip(".")
        safe = assert_safe_url(domain)

    for provider in (dns.collect, ct.collect, rdap.collect):
        provider_findings, provider_warnings = await provider(domain)
        findings.extend(provider_findings)
        warnings.extend(provider_warnings)

    http_findings, http_warnings = await httpmeta.collect(safe)
    findings.extend(http_findings)
    warnings.extend(http_warnings)
    return findings, warnings
