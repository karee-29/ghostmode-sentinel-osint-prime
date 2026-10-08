from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .core.evidence import risk_score
from .engine import collect
from .models import CollectRequest, CollectResponse, Finding, RiskRequest, StixRequest
from .reporting import stix_bundle

app = FastAPI(
    title="GhostMode Sentinel API",
    version="1.1.0",
    description="Evidence-first passive OSINT API for authorized public-source investigations.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"service": "ghostmode-sentinel", "status": "ok", "docs": "/docs"}

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "ghostmode-sentinel", "mode": "passive-public-source"}

@app.post("/api/collect", response_model=CollectResponse)
async def run_collection(req: CollectRequest):
    try:
        findings, warnings = await collect(req.target, req.profile)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CollectResponse(
        job_id="job-" + uuid4().hex[:12],
        target=req.target,
        findings=findings[:500],
        warnings=warnings,
    )

@app.post("/api/risk")
async def calculate_risk(req: RiskRequest):
    return {"scores": [{"id": finding.id, "score": risk_score(finding)} for finding in req.findings]}

@app.post("/api/stix")
async def export_stix(req: StixRequest):
    return stix_bundle(req.findings)
