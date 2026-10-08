import httpx
from ..core.evidence import make_finding
async def collect(username:str,timeout:float=12):
    username=username.strip().lstrip('@')
    base='https://api.github.com'
    try:
        async with httpx.AsyncClient(timeout=timeout,headers={'accept':'application/vnd.github+json','user-agent':'GhostMode-Sentinel/1.0'}) as c:
            r=await c.get(f'{base}/users/{username}');
            if r.status_code==404:return [],['GitHub user not found']
            r.raise_for_status(); u=r.json()
            repos=await c.get(f'{base}/users/{username}/repos',params={'per_page':20,'sort':'updated'}); repos.raise_for_status(); rs=repos.json()
        out=[make_finding(entity_type='github_user',value=u.get('login',username),source='GitHub public API',source_url=u.get('html_url',''),confidence=.99,severity='low',summary='Public GitHub profile metadata.',evidence={'id':u.get('id'),'name':u.get('name'),'company':u.get('company'),'blog':u.get('blog'),'location':u.get('location'),'public_repos':u.get('public_repos'),'followers':u.get('followers'),'created_at':u.get('created_at')})]
        for x in rs[:20]:out.append(make_finding(entity_type='repository',value=x.get('full_name',''),source='GitHub public API',source_url=x.get('html_url',''),confidence=.99,severity='low',summary='Public repository metadata.',evidence={'language':x.get('language'),'stars':x.get('stargazers_count'),'forks':x.get('forks_count'),'updated_at':x.get('updated_at'),'topics':x.get('topics',[]) }))
        return out,[]
    except Exception as e:return [],[f'GitHub: {type(e).__name__}']
