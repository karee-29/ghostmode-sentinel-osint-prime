from datetime import datetime, timezone
import hashlib
import json
import uuid
from typing import Any, Literal

from pydantic import BaseModel, Field, ConfigDict

Severity = Literal["info", "low", "medium", "high", "critical"]

class Finding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: "finding-" + uuid.uuid4().hex[:12])
    entity_type: str
    value: str
    source: str
    source_url: str = ""
    observed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    confidence: float = Field(ge=0, le=1)
    severity: Severity = "info"
    summary: str = ""
    evidence: dict[str, Any] = Field(default_factory=dict)
    sha256: str = ""

    def seal(self) -> "Finding":
        raw = json.dumps(self.evidence, sort_keys=True, default=str, separators=(",", ":"))
        self.sha256 = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        return self

class CollectRequest(BaseModel):
    target: str = Field(min_length=1, max_length=255)
    profile: str = "passive-domain"

class CollectResponse(BaseModel):
    job_id: str
    target: str
    findings: list[Finding]
    warnings: list[str] = Field(default_factory=list)

class RiskRequest(BaseModel):
    findings: list[Finding] = Field(default_factory=list)

class StixRequest(BaseModel):
    findings: list[Finding] = Field(default_factory=list)
