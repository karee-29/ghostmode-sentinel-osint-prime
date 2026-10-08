# Security & Responsible Use

GhostMode Sentinel is a defensive/public-source research tool. The default collection layer is passive and intentionally constrained.

## Controls

1. URL collection only permits HTTP(S).
2. Loopback/private/link-local/reserved/multicast IP targets are rejected.
3. Collectors do not accept usernames/passwords or session cookies.
4. No exploit payloads, port scans, authentication bypasses or evasion features are included.
5. Every finding is tagged with source and retrieval time.
6. Evidence is SHA-256 sealed for accidental-tamper detection.
7. Confidence is explicit and should never be interpreted as proof.

## Reporting a security issue

Do not disclose sensitive information in a public issue. Use a private security channel if you deploy this project publicly.
