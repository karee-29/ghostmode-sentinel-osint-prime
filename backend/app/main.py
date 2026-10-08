from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .core.evidence import risk_score
from .engine import collect
from .models import (
    CollectRequest,
    CollectResponse,
    Finding,
    RiskRequest,
    StixRequest,
)
from .reporting import stix_bundle


# ============================================================
# Application
# ============================================================

app = FastAPI(
    title="GhostMode Sentinel API",
    version="1.1.0",
    description=(
        "Evidence-first passive OSINT API for authorized "
        "public-source investigations."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# ============================================================
# CORS
# ============================================================
#
# Production frontend:
#   https://ghostmode-sentinel-osint-prime.vercel.app
#
# Local development:
#   http://localhost:5173
#
# IMPORTANT:
# Keep ONE CORS middleware only.
# Do NOT add allow_origins=["*"] separately.
# ============================================================

ALLOWED_ORIGINS = [
    "https://ghostmode-sentinel-osint-prime.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)


# ============================================================
# Root / Health
# ============================================================


@app.get("/")
async def root():
    return {
        "service": "ghostmode-sentinel",
        "status": "ok",
        "mode": "passive-public-source",
        "version": app.version,
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "ghostmode-sentinel",
        "mode": "passive-public-source",
        "version": app.version,
    }


# ============================================================
# Collection
# ============================================================


@app.post(
    "/api/collect",
    response_model=CollectResponse,
)
async def run_collection(req: CollectRequest):
    """
    Run a passive public-source OSINT collection.

    No authentication bypass, credential collection,
    private-network scanning, exploitation, or
    destructive actions are performed.
    """

    try:
        findings, warnings = await collect(
            req.target,
            req.profile,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        # Keep internal implementation details out of the
        # public response while allowing Render logs to show
        # the actual exception.
        print(
            f"[COLLECTION ERROR] "
            f"target={req.target!r} "
            f"profile={req.profile!r} "
            f"error={exc!r}"
        )

        raise HTTPException(
            status_code=500,
            detail="Collection failed. Check API logs for details.",
        ) from exc

    return CollectResponse(
        job_id=f"job-{uuid4().hex[:12]}",
        target=req.target,
        findings=findings[:500],
        warnings=warnings,
    )


# ============================================================
# Risk Analysis
# ============================================================


@app.post("/api/risk")
async def calculate_risk(req: RiskRequest):
    """
    Calculate explainable risk scores for collected findings.
    """

    scores = [
        {
            "id": finding.id,
            "score": risk_score(finding),
        }
        for finding in req.findings
    ]

    return {
        "count": len(scores),
        "scores": scores,
    }


# ============================================================
# STIX Export
# ============================================================


@app.post("/api/stix")
async def export_stix(req: StixRequest):
    """
    Export findings as a STIX bundle.
    """

    return stix_bundle(req.findings)


# ============================================================
# Development / diagnostics
# ============================================================


@app.get("/api")
async def api_info():
    return {
        "service": "ghostmode-sentinel",
        "api": "v1",
        "status": "online",
        "endpoints": {
            "health": "/api/health",
            "collect": "/api/collect",
            "risk": "/api/risk",
            "stix": "/api/stix",
            "docs": "/docs",
            "openapi": "/openapi.json",
        },
    }
