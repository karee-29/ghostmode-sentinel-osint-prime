from __future__ import annotations

from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.evidence import risk_score
from .engine import collect
from .models import (
    CollectRequest,
    CollectResponse,
    RiskRequest,
    StixRequest,
)
from .reporting import stix_bundle


# ============================================================
# Application
# ============================================================

APP_NAME = "GhostMode Sentinel API"
APP_VERSION = "1.1.0"

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
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
# Production:
#   https://ghostmode-sentinel-osint-prime.vercel.app
#
# Local:
#   http://localhost:5173
#   http://127.0.0.1:5173
#
# Vercel preview deployments:
#   https://<deployment>.vercel.app
#
# IMPORTANT:
# There is intentionally ONLY ONE CORS middleware.
# Do NOT add allow_origins=["*"] anywhere else.
# ============================================================

ALLOWED_ORIGINS = [
    "https://ghostmode-sentinel-osint-prime.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,

    # Allows Vercel preview deployments as well.
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.vercel\.app",

    # Safe because origins are explicitly restricted above.
    allow_credentials=True,

    # Do not unnecessarily restrict the frontend.
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],

    # Cache browser preflight decisions for 24 hours.
    max_age=86400,
)


# ============================================================
# Request logging
# ============================================================

@app.middleware("http")
async def request_logging_middleware(
    request: Request,
    call_next,
):
    """
    Lightweight request diagnostics.

    This is especially useful on Render because it lets us
    distinguish:

        browser -> Render failure

    from:

        Render -> collection-engine failure
    """

    origin = request.headers.get("origin", "-")

    print(
        f"[REQUEST] "
        f"{request.method} "
        f"{request.url.path} "
        f"origin={origin}"
    )

    try:
        response = await call_next(request)

    except Exception as exc:
        print(
            f"[REQUEST ERROR] "
            f"{request.method} "
            f"{request.url.path} "
            f"error={exc!r}"
        )
        raise

    print(
        f"[RESPONSE] "
        f"{request.method} "
        f"{request.url.path} "
        f"status={response.status_code}"
    )

    return response


# ============================================================
# Global validation error handler
# ============================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    """
    Return a clean 422 response while keeping enough
    information in Render logs for debugging.
    """

    print(
        f"[VALIDATION ERROR] "
        f"path={request.url.path} "
        f"errors={exc.errors()}"
    )

    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "error": "validation_error",
            "message": "The request payload is invalid.",
            "details": exc.errors(),
        },
    )


# ============================================================
# Root
# ============================================================

@app.get("/")
async def root():
    return {
        "service": "ghostmode-sentinel",
        "status": "ok",
        "mode": "passive-public-source",
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }


# ============================================================
# API information
# ============================================================

@app.get("/api")
async def api_info():
    return {
        "service": "ghostmode-sentinel",
        "api": "v1",
        "status": "online",
        "mode": "passive-public-source",
        "version": APP_VERSION,
        "endpoints": {
            "health": "/api/health",
            "collect": "/api/collect",
            "risk": "/api/risk",
            "stix": "/api/stix",
            "docs": "/docs",
            "openapi": "/openapi.json",
            "cors_test": "/api/cors-test",
        },
    }


# ============================================================
# Health
# ============================================================

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "ghostmode-sentinel",
        "mode": "passive-public-source",
        "version": APP_VERSION,
    }


# ============================================================
# CORS diagnostic
# ============================================================

@app.get("/api/cors-test")
async def cors_test(request: Request):
    """
    Browser-facing diagnostic endpoint.

    This allows us to confirm what Origin the backend actually
    receives from the deployed Vercel application.
    """

    origin = request.headers.get("origin")

    return {
        "status": "ok",
        "cors": "enabled",
        "origin_received": origin,
        "origin_allowed": (
            origin in ALLOWED_ORIGINS
            if origin
            else False
        ),
        "service": "ghostmode-sentinel",
    }


# ============================================================
# Collection
# ============================================================

@app.post(
    "/api/collect",
    response_model=CollectResponse,
)
async def run_collection(
    req: CollectRequest,
):
    """
    Run passive public-source OSINT collection.

    The collection engine is intentionally limited to
    authorized public-source intelligence.

    It does NOT:
        - collect passwords
        - bypass authentication
        - exploit systems
        - scan private networks
        - perform port scanning
        - perform account takeover
        - perform destructive actions
    """

    target = req.target
    profile = req.profile

    print(
        f"[COLLECT START] "
        f"target={target!r} "
        f"profile={profile!r}"
    )

    try:
        findings, warnings = await collect(
            target,
            profile,
        )

    except ValueError as exc:
        print(
            f"[COLLECT VALIDATION ERROR] "
            f"target={target!r} "
            f"profile={profile!r} "
            f"error={exc!r}"
        )

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except HTTPException:
        raise

    except Exception as exc:
        print(
            f"[COLLECT ERROR] "
            f"target={target!r} "
            f"profile={profile!r} "
            f"error={exc!r}"
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Collection failed. "
                "Check the GhostMode Sentinel API logs."
            ),
        ) from exc

    job_id = f"job-{uuid4().hex[:12]}"

    findings = findings[:500]

    print(
        f"[COLLECT SUCCESS] "
        f"job_id={job_id} "
        f"target={target!r} "
        f"findings={len(findings)} "
        f"warnings={len(warnings)}"
    )

    return CollectResponse(
        job_id=job_id,
        target=target,
        findings=findings,
        warnings=warnings,
    )


# ============================================================
# Risk Analysis
# ============================================================

@app.post("/api/risk")
async def calculate_risk(
    req: RiskRequest,
):
    """
    Calculate explainable risk scores for findings.
    """

    print(
        f"[RISK] "
        f"findings={len(req.findings)}"
    )

    scores = [
        {
            "id": finding.id,
            "score": risk_score(finding),
        }
        for finding in req.findings
    ]

    return {
        "status": "ok",
        "count": len(scores),
        "scores": scores,
    }


# ============================================================
# STIX Export
# ============================================================

@app.post("/api/stix")
async def export_stix(
    req: StixRequest,
):
    """
    Export findings as a STIX bundle.
    """

    print(
        f"[STIX] "
        f"findings={len(req.findings)}"
    )

    try:
        bundle = stix_bundle(req.findings)

    except Exception as exc:
        print(
            f"[STIX ERROR] "
            f"error={exc!r}"
        )

        raise HTTPException(
            status_code=500,
            detail="STIX export failed.",
        ) from exc

    return bundle
