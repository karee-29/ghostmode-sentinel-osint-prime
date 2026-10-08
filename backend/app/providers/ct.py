import httpx
from ..core.evidence import make_finding
async def collect(domain:str,timeout:float=12):
    url='https://crt.sh/'
    try:
        async with httpx.AsyncClient(timeout=timeout,headers={'user-agent':'GhostMode-Sentinel/1.0'}) as c:
            r=await c.get(url,params={'q':f'%.{domain}','output':'json'}); r.raise_for_status(); rows=r.json()
        seen=set(); out=[]
        for row in rows:
            for name in str(row.get('name_value','')).splitlines():
                name=name.strip().lower().lstrip('*.')
                if not name.endswith(domain) or name in seen: continue
                seen.add(name)
                out.append(make_finding(entity_type='subdomain',value=name,source='crt.sh',source_url='https://crt.sh/?q='+domain,confidence=.95,severity='medium' if name.startswith(('api.','admin.','staging.','dev.')) else 'low',summary='Hostname observed in Certificate Transparency logs.',evidence={'issuer':row.get('issuer_name'),'serial':row.get('serial_number'),'not_before':row.get('not_before'),'not_after':row.get('not_after'),'name_value':name}))
        return out,[]
    except Exception as e: return [],[f'Certificate Transparency: {type(e).__name__}']
