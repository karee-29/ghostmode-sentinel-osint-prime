from . import __name__
from ..models import Finding

def make_finding(**kwargs)->Finding:
    return Finding(**kwargs).seal()

def risk_score(f:Finding)->float:
    sev={'info':5,'low':20,'medium':45,'high':70,'critical':90}[f.severity]
    freshness=1.0
    return round(min(100,sev*(0.55+0.45*f.confidence)*freshness),1)
