import httpx
from ..core.evidence import make_finding
async def collect(domain:str,timeout:float=12):
    findings=[]; warnings=[]
    domain=domain.lower().strip().strip('.')
    for typ in ['A','AAAA','CNAME','MX','NS','TXT']:
        try:
            async with httpx.AsyncClient(timeout=timeout,headers={'accept':'application/dns-json'}) as c:
                r=await c.get('https://cloudflare-dns.com/dns-query',params={'name':domain,'type':typ})
                r.raise_for_status(); data=r.json()
            for ans in data.get('Answer',[]):
                val=str(ans.get('data','')).rstrip('.')
                findings.append(make_finding(entity_type=f'dns_{typ.lower()}',value=val,source='Cloudflare DoH',source_url='https://cloudflare-dns.com/dns-query',confidence=.98,severity='low',summary=f'Public DNS {typ} answer for {domain}.',evidence={'name':domain,'type':typ,'ttl':ans.get('TTL'),'data':val}))
        except Exception as e: warnings.append(f'DNS {typ}: {type(e).__name__}')
    return findings,warnings
