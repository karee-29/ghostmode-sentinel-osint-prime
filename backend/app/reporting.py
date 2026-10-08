import json,uuid
from datetime import datetime,timezone

def stix_bundle(findings):
    objects=[]
    for f in findings:
        objects.append({'type':'note','spec_version':'2.1','id':'note--'+uuid.uuid4().hex,'created':datetime.now(timezone.utc).isoformat(),'modified':datetime.now(timezone.utc).isoformat(),'content':json.dumps({'entity_type':f.entity_type,'value':f.value,'source':f.source,'source_url':f.source_url,'confidence':f.confidence,'severity':f.severity,'summary':f.summary,'sha256':f.sha256},sort_keys=True)})
    return {'type':'bundle','id':'bundle--'+uuid.uuid4().hex,'objects':objects}
