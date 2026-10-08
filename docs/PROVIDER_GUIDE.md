# Provider Guide

A provider is an async adapter that returns `(findings, warnings)`.

Each finding should:

- use a stable entity type
- include a source name and URL
- include retrieval time
- include a confidence value between 0 and 1
- include structured evidence
- call `make_finding(...)` so the evidence is sealed with SHA-256

Example:

```python
return [make_finding(
    entity_type="subdomain",
    value="api.example.org",
    source="My Public Source",
    source_url="https://source.example/",
    confidence=0.90,
    severity="medium",
    summary="Public observation.",
    evidence={"raw": "..."},
)], []
```

Keep providers passive, rate-limited and within the terms of the source.
