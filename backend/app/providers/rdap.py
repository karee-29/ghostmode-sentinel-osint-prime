import httpx
from ..core.evidence import make_finding
async def collect(domain:str,timeout:float=12):
    try:
        async with httpx.AsyncClient(timeout=timeout,headers={'accept':'application/rdap+json'}) as c:
            r=await c.get('https://rdap.org/domain/'+domain); r.raise_for_status(); d=r.json()
        names=[x.get('ldhName') for x in d.get('nameservers',[]) if x.get('ldhName')]
        out=[make_finding(entity_type='domain',value=domain,source='RDAP',source_url='https://rdap.org/domain/'+domain,confidence=.98,severity='low',summary='Public RDAP registration object retrieved.',evidence={'status':d.get('status'), 'events':d.get('events'), 'nameservers':names})]
        for n in names: out.append(make_finding(entity_type='nameserver',value=n,source='RDAP',source_url='https://rdap.org/domain/'+domain,confidence=.96,severity='low',summary='Nameserver returned by public RDAP.',evidence={'domain':domain,'nameserver':n}))
        return out,[]
    except Exception as e:return [],[f'RDAP: {type(e).__name__}']
