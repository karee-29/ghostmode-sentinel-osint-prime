import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity, AlertTriangle, Archive, ArrowUpRight, BookOpen, CheckCircle2,
  ChevronRight, Clock3, Code2, Database, Download, FileCheck2, FileSearch,
  GitBranch, Globe2, LockKeyhole, Network, Plus, RefreshCw, Search,
  Server, ShieldCheck, Sparkles, Target, TimerReset, Users, XCircle
} from "lucide-react";
import "./styles.css";

const API = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

type Page = "command" | "investigations" | "collect" | "evidence" | "graph" | "timeline" | "risk" | "reports";
type Profile = "passive-domain" | "github-public";
type Severity = "info" | "low" | "medium" | "high" | "critical";

type Finding = {
  id: string; entity_type: string; value: string; source: string; source_url: string;
  observed_at: string; confidence: number; severity: Severity; summary: string;
};

const demo: Finding[] = [
  { id: "demo-1", entity_type: "domain", value: "github.com", source: "Demo workspace", source_url: "https://github.com/", observed_at: "2026-10-08T14:30:00Z", confidence: .99, severity: "low", summary: "Public domain loaded as the live-demo investigation target." },
  { id: "demo-2", entity_type: "dns_ns", value: "dns1.p08.nsone.net", source: "Demo evidence", source_url: "https://github.com/", observed_at: "2026-10-08T14:31:00Z", confidence: .98, severity: "low", summary: "Example public DNS observation used to demonstrate provenance." },
  { id: "demo-3", entity_type: "technology", value: "HSTS", source: "Demo evidence", source_url: "https://github.com/", observed_at: "2026-10-08T14:32:00Z", confidence: .99, severity: "low", summary: "Example HTTP security-control observation." },
];

const nav: Array<[Page, string, ReactNode]> = [
  ["command", "Command Center", <Activity size={17} />],
  ["investigations", "Investigations", <Target size={17} />],
  ["collect", "Collection Studio", <RefreshCw size={17} />],
  ["evidence", "Evidence Ledger", <FileCheck2 size={17} />],
  ["graph", "Intelligence Graph", <Network size={17} />],
  ["timeline", "Timeline & Diff", <Clock3 size={17} />],
  ["risk", "Risk & Exposure", <ShieldCheck size={17} />],
  ["reports", "Reports & Export", <Archive size={17} />],
];

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function App() {
  const [page, setPage] = useState<Page>("command");
  const [findings, setFindings] = useState<Finding[]>(demo);
  const [target, setTarget] = useState("github.com");
  const [profile, setProfile] = useState<Profile>("passive-domain");
  const [running, setRunning] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => findings.filter(f => `${f.value} ${f.source} ${f.entity_type} ${f.summary}`.toLowerCase().includes(query.toLowerCase())), [findings, query]);

  useEffect(() => {
    fetch(`${API}/api/health`, { signal: AbortSignal.timeout(2500) })
      .then(r => setApiOnline(r.ok))
      .catch(() => setApiOnline(false));
  }, []);

  async function collect() {
    setRunning(true);
    try {
      const response = await fetch(`${API}/api/collect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target, profile }),
      });
      if (!response.ok) throw new Error("API request failed");
      const data = await response.json();
      const live = (data.findings || []) as Finding[];
      setFindings(live);
      setApiOnline(true);
      setPage("evidence");
    } catch {
      setApiOnline(false);
      window.alert(`GhostMode could not reach ${API}. Start the FastAPI backend on port 8000, then run the collection again.`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark"><GhostMark /></div>
          <div><strong>GHOSTMODE</strong><span>SENTINEL / OSINT</span></div>
        </div>
        <div className="case">
          <span>ACTIVE CASE</span>
          <strong>Public Surface Review</strong>
          <small>CASE-2026-001 · authorized</small>
        </div>
        <nav className="nav">
          {nav.map(([key, label, icon]) => (
            <button key={key} className={page === key ? "active" : ""} onClick={() => setPage(key)}>
              {icon}<span>{label}</span>{page === key && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>
        <div className="sidebarFooter">
          <div className="safe"><LockKeyhole size={14} /><span>PASSIVE SAFE MODE</span><i /></div>
          <small>Public sources only · v1.1</small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">GHOSTMODE SENTINEL</span>
            <h1>{nav.find(x => x[0] === page)?.[1]}</h1>
          </div>
          <div className="topActions">
            <div className="apiStatus">
              <i className={apiOnline === true ? "online" : apiOnline === false ? "offline" : "unknown"} />
              {apiOnline === true ? "API online" : apiOnline === false ? "API offline" : "Checking API"}
            </div>
            <div className="searchBox"><Search size={16} /><input aria-label="Search evidence" placeholder="Search evidence…" value={query} onChange={e => setQuery(e.target.value)} /></div>
            <div className="avatar">K</div>
          </div>
        </header>

        {page === "command" && <Command findings={findings} setPage={setPage} />}
        {page === "investigations" && <Investigations />}
        {page === "collect" && <Collect target={target} setTarget={setTarget} profile={profile} setProfile={setProfile} running={running} collect={collect} />}
        {page === "evidence" && <Evidence findings={filtered} />}
        {page === "graph" && <Graph findings={findings} />}
        {page === "timeline" && <Timeline findings={findings} />}
        {page === "risk" && <Risk findings={findings} />}
        {page === "reports" && <Reports findings={findings} />}
      </main>
    </div>
  );
}

function GhostMark() {
  return <svg viewBox="0 0 32 32" width="25" height="25" fill="none" aria-hidden="true"><path d="M7 25V13c0-5 4-9 9-9s9 4 9 9v12l-3-2-3 2-3-2-3 2-3-2-3 2Z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="14" r="1.5" fill="currentColor" /><circle cx="20" cy="14" r="1.5" fill="currentColor" /></svg>;
}

function Command({ findings, setPage }: { findings: Finding[]; setPage: (p: Page) => void }) {
  const high = findings.filter(f => f.severity === "high" || f.severity === "critical").length;
  const score = Math.max(18, 62 + high * 8);
  return <>
    <div className="hero">
      <div className="heroCopy">
        <Pill tone="green"><ShieldCheck size={13} /> evidence-first</Pill>
        <h2>Investigate public exposure.<br /><em>Keep every claim traceable.</em></h2>
        <p>GhostMode Sentinel is an open-source, passive OSINT workspace for collecting public observations, preserving provenance, correlating entities and producing defensible reports.</p>
        <div className="buttonRow"><button className="primary" onClick={() => setPage("collect")}><Sparkles size={16} /> Start live collection</button><button onClick={() => setPage("evidence")}>Review evidence</button></div>
      </div>
      <div className="heroScore"><div className="scoreRing"><strong>{score}</strong><span>EXPOSURE</span></div><small>heuristic · explainable</small></div>
    </div>
    <div className="metrics">
      <Metric icon={<FileCheck2 />} label="Evidence" value={String(findings.length)} sub="observations" />
      <Metric icon={<Network />} label="Correlations" value="12" sub="traceable edges" />
      <Metric icon={<AlertTriangle />} label="High risk" value={String(high).padStart(2, "0")} sub="needs review" />
      <Metric icon={<TimerReset />} label="Freshness" value="LIVE" sub="source timestamps" />
    </div>
    <div className="twoCol">
      <Card><CardHead label="INVESTIGATION FLOW" title="From signal to decision" right={<Pill>4 stages</Pill>} />
        <div className="flow"><Flow n="01" icon={<Search />} title="Collect" text="Gather public-source observations." /><Flow n="02" icon={<GitBranch />} title="Correlate" text="Connect entities with provenance." /><Flow n="03" icon={<ShieldCheck />} title="Assess" text="Score confidence, risk and freshness." /><Flow n="04" icon={<BookOpen />} title="Report" text="Export evidence and reasoning." /></div>
      </Card>
      <Card><CardHead label="LIVE DEMO" title="Try a public target" right={<Pill tone="green">safe</Pill>} />
        <div className="demoTarget"><Globe2 /><div><strong>github.com</strong><span>public domain · passive profile</span></div></div>
        <p className="muted">No login, credential, exploitation or private-network access is used. The demo collects public DNS, certificate, RDAP and HTTP metadata.</p>
        <button className="primary wide" onClick={() => setPage("collect")}>Open Collection Studio <ArrowUpRight size={15} /></button>
      </Card>
    </div>
  </>;
}

function CardHead({ label, title, right }: { label: string; title: string; right?: ReactNode }) {
  return <div className="cardHead"><div><span className="label">{label}</span><h3>{title}</h3></div>{right}</div>;
}
function Metric({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) { return <Card className="metric"><div className="metricIcon">{icon}</div><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div></Card>; }
function Flow({ n, icon, title, text }: { n: string; icon: ReactNode; title: string; text: string }) { return <div className="flowItem"><span>{n}</span><div className="flowIcon">{icon}</div><div><b>{title}</b><p>{text}</p></div></div>; }

function Investigations() {
  return <><Intro label="CASE MANAGEMENT" title="Investigations built around evidence." text="Keep scope, hypotheses, notes and findings together so an investigation can be reproduced by another analyst." button="New investigation" />
    <div className="caseGrid"><CaseCard title="Public Surface Review" id="CASE-2026-001" status="ACTIVE" progress="82%" tags={["domain", "passive", "evidence"]} /><CaseCard title="Brand Surface Review" id="CASE-2026-002" status="READY" progress="24%" tags={["brand", "domains"]} /><CaseCard title="Incident Triage — Demo" id="CASE-2026-003" status="ARCHIVED" progress="100%" tags={["incident", "evidence"]} /></div>
  </>;
}
function CaseCard({ title, id, status, progress, tags }: { title: string; id: string; status: string; progress: string; tags: string[] }) { return <Card><div className="caseTop"><Pill tone={status === "ACTIVE" ? "green" : "neutral"}>{status}</Pill><span>{id}</span></div><h3>{title}</h3><p>Authorized passive-source investigation with provenance-first collection and analyst review.</p><div className="bar"><i style={{ width: progress }} /></div><div className="tags">{tags.map(t => <Pill key={t}>{t}</Pill>)}</div></Card>; }

function Collect({ target, setTarget, profile, setProfile, running, collect }: { target: string; setTarget: (s: string) => void; profile: Profile; setProfile: (p: Profile) => void; running: boolean; collect: () => void }) {
  return <><Intro label="COLLECTION STUDIO" title="Collect public evidence, not secrets." text="Start with a public domain or a public GitHub identity. Sentinel never asks for passwords or attempts authentication." right={<Pill tone="green"><LockKeyhole size={13} /> safe-by-default</Pill>} />
    <Card className="collector">
      <div className="targetBox"><div className="targetIcon"><Target /></div><div className="targetInput"><label>TARGET</label><input value={target} onChange={e => setTarget(e.target.value)} placeholder="github.com" /><small>Examples: github.com · wikipedia.org · a public GitHub username</small></div></div>
      <div className="profiles">
        <Profile selected={profile === "passive-domain"} onClick={() => setProfile("passive-domain")} icon={<Globe2 />} title="Passive Domain" text="DNS · CT · RDAP · HTTP metadata" />
        <Profile selected={profile === "github-public"} onClick={() => setProfile("github-public")} icon={<GitBranch />} title="GitHub Public" text="Profile · repositories · public metadata" />
      </div>
      <div className="guard"><ShieldCheck /><div><b>Collection guardrails</b><span>Private, loopback, link-local and reserved network targets are rejected. No credentials, auth bypass, exploitation or port scanning.</span></div></div>
      <button className="primary run" onClick={collect} disabled={running}>{running ? <><RefreshCw className="spin" size={16} /> Collecting public evidence…</> : <><Sparkles size={16} /> Run passive collection</>}</button>
    </Card>
  </>;
}
function Profile({ selected, onClick, icon, title, text }: { selected: boolean; onClick: () => void; icon: ReactNode; title: string; text: string }) { return <button className={`profile ${selected ? "selected" : ""}`} onClick={onClick}><div>{icon}</div><b>{title}</b><span>{text}</span></button>; }

function Evidence({ findings }: { findings: Finding[] }) {
  return <><Intro label="EVIDENCE LEDGER" title="Every claim has a trail." text="Normalized observations retain source, timestamp, confidence, severity and evidence context." right={<Pill>{findings.length} findings</Pill>} />
    <Card className="tableCard"><div className="tableHead"><span>ENTITY</span><span>SOURCE</span><span>CONFIDENCE</span><span>SEVERITY</span><span>OBSERVED</span></div>
      {findings.length === 0 ? <Empty /> : findings.map(f => <div className="row" key={f.id}><div><b>{f.value}</b><small>{f.entity_type} · {f.summary}</small></div><span><Pill>{f.source}</Pill></span><span className="confidence">{Math.round(f.confidence * 100)}%</span><span><Pill tone={f.severity === "high" || f.severity === "critical" ? "red" : f.severity === "medium" ? "amber" : "green"}>{f.severity}</Pill></span><time>{new Date(f.observed_at).toLocaleString()}</time></div>)}
    </Card></>;
}
function Empty() { return <div className="empty"><XCircle size={20} /><strong>No evidence matches this search.</strong><span>Clear the search box and try again.</span></div>; }

function Graph({ findings }: { findings: Finding[] }) {
  const root = findings.find(f => f.entity_type === "domain")?.value || "github.com";
  return <Card className="graphCard"><CardHead label="PROVENANCE GRAPH" title="Relationships you can audit." right={<Pill><Network size={13} /> {findings.length + 3} entities</Pill>} /><p className="muted">Edges are derived from public evidence. This view is deliberately explainable rather than a black-box graph.</p>
    <div className="graph"><div className="edge e1" /><div className="edge e2" /><div className="edge e3" /><div className="edge e4" /><Node className="root" icon={<Globe2 />} title={root} type="domain" /><Node className="n1" icon={<Server />} title="DNS / infrastructure" type="public source" /><Node className="n2" icon={<FileSearch />} title="certificate records" type="CT source" /><Node className="n3" icon={<Code2 />} title="public metadata" type="HTTP" /><Node className="n4" icon={<Database />} title="evidence ledger" type="normalized" /><div className="graphLegend"><span><i /> entity</span><span><i className="sourceDot" /> source</span><span><i className="edgeDot" /> derived edge</span></div></div>
  </Card>;
}
function Node({ className, icon, title, type }: { className: string; icon: ReactNode; title: string; type: string }) { return <div className={`node ${className}`}>{icon}<b>{title}</b><small>{type}</small></div>; }

function Timeline({ findings }: { findings: Finding[] }) { return <><Intro label="TEMPORAL INTELLIGENCE" title="What changed between snapshots?" text="Use repeated collections to separate new, changed, removed and stale observations." button="Compare snapshot" /><div className="diffGrid"><Diff label="NEW" value="04" tone="green" text="newly observed" /><Diff label="CHANGED" value="02" tone="amber" text="metadata changed" /><Diff label="REMOVED" value="01" tone="red" text="no longer observed" /><Diff label="STALE" value="03" tone="neutral" text="outside freshness window" /></div><Card><div className="timeline">{findings.map((f, i) => <div className="tl" key={f.id}><div className="tlDot" /><div><time>{new Date(f.observed_at).toLocaleString()}</time><h3>{i === 0 ? "Collection snapshot" : `${f.source} observation`}</h3><p><b>{f.value}</b> — {f.summary}</p></div><Pill tone={i === 1 ? "amber" : "green"}>{i === 1 ? "CHANGED" : "OBSERVED"}</Pill></div>)}</div></Card></>; }
function Diff({ label, value, tone, text }: { label: string; value: string; tone: string; text: string }) { return <Card className={`diff ${tone}`}><span>{label}</span><strong>{value}</strong><small>{text}</small></Card>; }

function Risk({ findings }: { findings: Finding[] }) { const score = Math.min(96, 32 + findings.filter(f => f.severity === "medium" || f.severity === "high" || f.severity === "critical").length * 7); return <><Intro label="EXPOSURE ENGINE" title="Prioritize what deserves attention." text="Risk is a transparent heuristic. It is not a claim of compromise, maliciousness or attribution." right={<Pill><ShieldCheck size={13} /> explainable</Pill>} /><div className="riskGrid"><Card className="riskHero"><span className="label">CASE EXPOSURE</span><div className="bigScore">{score}<small>/100</small></div><div className="riskBar"><i style={{ width: `${score}%` }} /></div><p>Derived from evidence severity, confidence and public visibility.</p></Card><Card><span className="label">RISK FACTORS</span>{[["Public infrastructure",82],["Identity reuse",71],["Freshness",64],["Evidence confidence",91]].map(([name,n]) => <div className="factor" key={String(name)}><div><span>{name}</span><b>{n}</b></div><div className="bar"><i style={{ width: `${n}%` }} /></div></div>)}</Card></div><Card><CardHead label="PRIORITY QUEUE" title="Review these first" />{findings.map((f, i) => <div className="priority" key={f.id}><span className="rank">0{i + 1}</span><div><b>{f.value}</b><small>{f.summary}</small></div><Pill tone={f.severity === "medium" ? "amber" : f.severity === "high" || f.severity === "critical" ? "red" : "green"}>{f.severity}</Pill><strong>{Math.round(f.confidence * 100)}% confidence</strong></div>)}</Card></>; }

function Reports({ findings }: { findings: Finding[] }) { const preview = { case_id: "CASE-2026-001", generated_at: new Date().toISOString(), findings: findings.slice(0, 3).map(f => ({ entity: f.value, source: f.source, confidence: f.confidence })) }; return <><Intro label="REPORTING" title="Turn evidence into a handoff." text="Export normalized observations for analysts, engineering teams or downstream intelligence tooling." /><div className="reportGrid"><Report icon={<BookOpen />} title="Analyst brief" text="Human-readable investigation summary." /><Report icon={<Database />} title="JSON bundle" text="Portable normalized evidence dataset." /><Report icon={<Network />} title="STIX 2.1" text="Interoperable intelligence objects." /><Report icon={<Archive />} title="Case archive" text="Scope, evidence and provenance package." /></div><Card><span className="label">EXPORT PREVIEW</span><pre>{JSON.stringify(preview, null, 2)}</pre></Card></>; }
function Report({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <Card className="report"><div className="reportIcon">{icon}</div><h3>{title}</h3><p>{text}</p><button>Generate <ArrowUpRight size={14} /></button></Card>; }

function Intro({ label, title, text, button, right }: { label: string; title: string; text: string; button?: string; right?: ReactNode }) { return <div className="sectionIntro"><div><span className="label">{label}</span><h2>{title}</h2><p>{text}</p></div>{right || (button ? <button>{button} <ArrowUpRight size={14} /></button> : null)}</div>; }

createRoot(document.getElementById("root")!).render(<App />);
