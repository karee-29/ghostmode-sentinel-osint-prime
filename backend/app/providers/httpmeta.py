import re,httpx
from ..core.evidence import make_finding
async def collect(target:str,timeout:float=12):
    url=target if '://' in target else 'https://'+target
    try:
        async with httpx.AsyncClient(timeout=timeout,follow_redirects=True,headers={'user-agent':'GhostMode-Sentinel/1.0'}) as c:
            r=await c.get(url)
        out=[]
        headers={k.lower():v for k,v in r.headers.items()}
        title=''
        m=re.search(r'<title[^>]*>(.*?)</title>',r.text[:250000],re.I|re.S)
        if m:title=re.sub(r'\\s+',' ',m.group(1)).strip()[:180]
        out.append(make_finding(entity_type='web_endpoint',value=str(r.url),source='HTTP metadata',source_url=str(r.url),confidence=.99,severity='low',summary=f'HTTP {r.status_code}; title={title or "(none)"}.',evidence={'status_code':r.status_code,'server':headers.get('server'),'content_type':headers.get('content-type'),'content_length':headers.get('content-length'),'title':title,'redirects':[str(x.url) for x in r.history]}))
        checks={'strict-transport-security':('HSTS','security_control'),'content-security-policy':('CSP','security_control'),'x-content-type-options':('X-Content-Type-Options','security_control'),'x-frame-options':('X-Frame-Options','security_control'),'referrer-policy':('Referrer-Policy','security_control')}
        for key,(label,etype) in checks.items():
            present=key in headers
            out.append(make_finding(entity_type=etype,value=label,source='HTTP metadata',source_url=str(r.url),confidence=.99,severity='low' if present else 'medium',summary=f'{label} header '+('observed.' if present else 'not observed.'),evidence={'header':key,'present':present,'value':headers.get(key)}))
        for path in ['/robots.txt','/.well-known/security.txt']:
            try:
                q=await c.get(str(r.url).rstrip('/')+path); out.append(make_finding(entity_type='web_resource',value=path,source='HTTP metadata',source_url=str(q.url),confidence=.98,severity='low' if q.status_code<400 else 'info',summary=f'{path} returned HTTP {q.status_code}.',evidence={'status_code':q.status_code,'content_type':q.headers.get('content-type')}))
            except Exception: pass
        return out,[]
    except Exception as e:return [],[f'HTTP metadata: {type(e).__name__}']
