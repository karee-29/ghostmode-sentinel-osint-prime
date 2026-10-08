from backend.app.models import Finding
from backend.app.core.evidence import risk_score

def test_evidence_seal_and_risk():
    f=Finding(entity_type='domain',value='example.org',source='test',confidence=.9,severity='medium',evidence={'x':1}).seal()
    assert len(f.sha256)==64
    assert risk_score(f)>0
