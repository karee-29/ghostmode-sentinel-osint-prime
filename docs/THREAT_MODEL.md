# Threat Model

### Assets
- investigation cases
- public-source evidence
- analyst notes
- API credentials for optional future providers

### Threats
- accidental collection of private targets
- leaking provider credentials to frontend code
- evidence tampering
- false correlation
- over-trusting stale public information

### Mitigations
- server-side provider execution
- target safety checks
- provenance + timestamps
- SHA-256 evidence seals
- confidence-aware graph edges
- explicit heuristic risk model
- no authentication/session handling
