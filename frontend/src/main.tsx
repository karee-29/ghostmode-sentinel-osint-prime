import {
  Activity,
  AlertTriangle,
  Archive,
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Database,
  Download,
  FileCheck2,
  FileSearch,
  GitBranch,
  Globe2,
  LockKeyhole,
  Network,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

type Page =
  | "command"
  | "investigations"
  | "collect"
  | "evidence"
  | "graph"
  | "timeline"
  | "risk"
  | "reports";

type Profile = "passive-domain" | "github-public";

type Severity = "info" | "low" | "medium" | "high" | "critical";

type Finding = {
  id: string;
  entity_type: string;
  value: string;
  source: string;
  source_url: string;
  observed_at: string;
  confidence: number;
  severity: Severity;
  summary: string;
};

type Snapshot = {
  id: string;
  target: string;
  created_at: string;
  findings: Finding[];
};

type TimelineEvent = {
  id: string;
  created_at: string;
  title: string;
  description: string;
  type: "collection" | "finding" | "change";
};

const demo: Finding[] = [
  {
    id: "demo-1",
    entity_type: "domain",
    value: "github.com",
    source: "Demo workspace",
    source_url: "https://github.com/",
    observed_at: "2026-10-08T14:30:00Z",
    confidence: 0.99,
    severity: "low",
    summary:
      "Public domain loaded as the live-demo investigation target.",
  },
  {
    id: "demo-2",
    entity_type: "dns_ns",
    value: "dns1.p08.nsone.net",
    source: "Demo evidence",
    source_url: "https://github.com/",
    observed_at: "2026-10-08T14:31:00Z",
    confidence: 0.98,
    severity: "low",
    summary:
      "Example public DNS observation used to demonstrate provenance.",
  },
  {
    id: "demo-3",
    entity_type: "technology",
    value: "HSTS",
    source: "Demo evidence",
    source_url: "https://github.com/",
    observed_at: "2026-10-08T14:32:00Z",
    confidence: 0.99,
    severity: "low",
    summary:
      "Example HTTP security-control observation.",
  },
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

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function App() {
  const [page, setPage] = useState<Page>("command");

  const [findings, setFindings] = useState<Finding[]>(demo);

  const [target, setTarget] = useState("github.com");

  const [profile, setProfile] =
    useState<Profile>("passive-domain");

  const [running, setRunning] = useState(false);

  const [apiOnline, setApiOnline] =
    useState<boolean | null>(null);

  const [query, setQuery] = useState("");

  const [snapshots, setSnapshots] =
    useState<Snapshot[]>([]);

  const [timeline, setTimeline] =
    useState<TimelineEvent[]>([]);

  const [notice, setNotice] = useState("");

  const [lastCollection, setLastCollection] =
    useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return findings;

    return findings.filter((finding) =>
      [
        finding.value,
        finding.source,
        finding.entity_type,
        finding.summary,
        finding.severity,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [findings, query]);

  useEffect(() => {
    checkApi();

    const interval = window.setInterval(
      checkApi,
      30000,
    );

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(
      () => setNotice(""),
      3500,
    );

    return () => window.clearTimeout(timer);
  }, [notice]);

  async function checkApi() {
    try {
      const response = await fetch(
        `${API}/api/health`,
        {
          signal: AbortSignal.timeout(3500),
        },
      );

      setApiOnline(response.ok);
    } catch {
      setApiOnline(false);
    }
  }

  async function collect() {
    if (!target.trim()) {
      setNotice("Enter a public target first.");
      return;
    }

    setRunning(true);

    const previous = findings;

    try {
      const response = await fetch(
        `${API}/api/collect`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            target: target.trim(),
            profile,
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `HTTP ${response.status}`,
        );
      }

      const data = await response.json();

      const live = normalizeFindings(
        data?.findings ?? [],
      );

      const now = new Date().toISOString();

      setSnapshots((items) => [
        {
          id: crypto.randomUUID(),
          target: target.trim(),
          created_at: now,
          findings: live,
        },
        ...items,
      ]);

      setFindings(live);

      setTimeline((items) => [
        {
          id: crypto.randomUUID(),
          created_at: now,
          title: "Collection completed",
          description: `${live.length} public observations collected for ${target.trim()}.`,
          type: "collection",
        },
        ...buildChangeEvents(previous, live),
        ...items,
      ]);

      setLastCollection(now);
      setApiOnline(true);
      setPage("evidence");

      setNotice(
        `${live.length} public observations collected.`,
      );
    } catch (error) {
      console.error(error);

      /*
       * Important:
       * Do NOT immediately assume that every failed collection
       * means the API is offline. The health state remains separate.
       */
      setNotice(
        `Collection failed: ${
          error instanceof Error
            ? error.message
            : "unknown error"
        }`,
      );

      checkApi();
    } finally {
      setRunning(false);
    }
  }

  function resetDemo() {
    setFindings(demo);
    setSnapshots([]);
    setTimeline([]);
    setTarget("github.com");
    setProfile("passive-domain");
    setLastCollection(null);
    setNotice("Demo workspace restored.");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark">
            <GhostMark />
          </div>

          <div>
            <strong>GHOSTMODE</strong>
            <span>SENTINEL / OSINT</span>
          </div>
        </div>

        <div className="case">
          <span>ACTIVE CASE</span>
          <strong>Public Surface Review</strong>
          <small>
            CASE-2026-001 · authorized
          </small>
        </div>

        <nav className="nav">
          {nav.map(([key, label, icon]) => (
            <button
              key={key}
              className={
                page === key ? "active" : ""
              }
              onClick={() => setPage(key)}
            >
              {icon}

              <span>{label}</span>

              {page === key && (
                <ChevronRight size={14} />
              )}
            </button>
          ))}
        </nav>

        <div className="sidebarFooter">
          <div className="safe">
            <LockKeyhole size={14} />
            <span>PASSIVE SAFE MODE</span>
            <i />
          </div>

          <small>
            Public sources only · v1.2
          </small>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="eyebrow">
              GHOSTMODE SENTINEL
            </span>

            <h1>
              {
                nav.find(
                  (item) => item[0] === page,
                )?.[1]
              }
            </h1>
          </div>

          <div className="topActions">
            <div className="apiStatus">
              <i
                className={
                  apiOnline === true
                    ? "online"
                    : apiOnline === false
                      ? "offline"
                      : "unknown"
                }
              />

              {apiOnline === true
                ? "API online"
                : apiOnline === false
                  ? "API offline"
                  : "Checking API"}
            </div>

            <div className="searchBox">
              <Search size={16} />

              <input
                aria-label="Search evidence"
                placeholder="Search evidence…"
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
              />

              {query && (
                <button
                  className="clearSearch"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="avatar">K</div>
          </div>
        </header>

        {notice && (
          <div className="toast">
            <CheckCircle2 size={15} />
            <span>{notice}</span>
            <button
              onClick={() => setNotice("")}
              aria-label="Close notification"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {page === "command" && (
          <Command
            findings={findings}
            target={target}
            setPage={setPage}
            onReset={resetDemo}
          />
        )}

        {page === "investigations" && (
          <Investigations
            findings={findings}
            snapshots={snapshots}
            setPage={setPage}
          />
        )}

        {page === "collect" && (
          <Collect
            target={target}
            setTarget={setTarget}
            profile={profile}
            setProfile={setProfile}
            running={running}
            collect={collect}
            apiOnline={apiOnline}
          />
        )}

        {page === "evidence" && (
          <Evidence
            findings={filtered}
            total={findings.length}
          />
        )}

        {page === "graph" && (
          <Graph
            findings={findings}
            target={target}
          />
        )}

        {page === "timeline" && (
          <Timeline
            findings={findings}
            timeline={timeline}
            snapshots={snapshots}
          />
        )}

        {page === "risk" && (
          <Risk findings={findings} />
        )}

        {page === "reports" && (
          <Reports
            findings={findings}
            target={target}
            snapshots={snapshots}
            timeline={timeline}
          />
        )}
      </main>
    </div>
  );
}

/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeFindings(
  raw: unknown[],
): Finding[] {
  return raw.map((item, index) => {
    const record =
      item as Record<string, unknown>;

    return {
      id:
        String(
          record.id ??
            record.key ??
            `${record.entity_type ?? "finding"}-${index}-${Date.now()}`,
        ),

      entity_type: String(
        record.entity_type ??
          record.type ??
          "observation",
      ),

      value: String(
        record.value ??
          record.entity ??
          record.name ??
          "Unknown",
      ),

      source: String(
        record.source ??
          record.provider ??
          "GhostMode Sentinel",
      ),

      source_url: String(
        record.source_url ??
          record.url ??
          "",
      ),

      observed_at: String(
        record.observed_at ??
          record.timestamp ??
          new Date().toISOString(),
      ),

      confidence: clamp(
        Number(
          record.confidence ?? 0.5,
        ),
        0,
        1,
      ),

      severity: normalizeSeverity(
        record.severity,
      ),

      summary: String(
        record.summary ??
          record.description ??
          "Public observation collected by Sentinel.",
      ),
    };
  });
}

function normalizeSeverity(
  value: unknown,
): Severity {
  if (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "info"
  ) {
    return value;
  }

  return "info";
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(min, value),
  );
}

/* =========================================================
   CHANGE DETECTION
========================================================= */

function findingKey(finding: Finding) {
  return `${finding.entity_type}::${finding.value}`;
}

function buildChangeEvents(
  previous: Finding[],
  current: Finding[],
): TimelineEvent[] {
  const oldMap = new Map(
    previous.map((finding) => [
      findingKey(finding),
      finding,
    ]),
  );

  const newMap = new Map(
    current.map((finding) => [
      findingKey(finding),
      finding,
    ]),
  );

  const events: TimelineEvent[] = [];

  for (const finding of current) {
    const old = oldMap.get(
      findingKey(finding),
    );

    if (!old) {
      events.push({
        id: crypto.randomUUID(),
        created_at: finding.observed_at,
        title: "New observation",
        description: `${finding.value} was newly observed from ${finding.source}.`,
        type: "finding",
      });

      continue;
    }

    if (
      old.confidence !== finding.confidence ||
      old.severity !== finding.severity ||
      old.summary !== finding.summary
    ) {
      events.push({
        id: crypto.randomUUID(),
        created_at: finding.observed_at,
        title: "Observation changed",
        description: `${finding.value} changed between collection snapshots.`,
        type: "change",
      });
    }
  }

  for (const finding of previous) {
    if (!newMap.has(findingKey(finding))) {
      events.push({
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        title: "Observation removed",
        description: `${finding.value} was not present in the latest snapshot.`,
        type: "change",
      });
    }
  }

  return events.slice(0, 20);
}

/* =========================================================
   COMMAND CENTER
========================================================= */

function Command({
  findings,
  target,
  setPage,
  onReset,
}: {
  findings: Finding[];
  target: string;
  setPage: (page: Page) => void;
  onReset: () => void;
}) {
  const high = findings.filter(
    (finding) =>
      finding.severity === "high" ||
      finding.severity === "critical",
  ).length;

  const medium = findings.filter(
    (finding) =>
      finding.severity === "medium",
  ).length;

  const score = calculateRiskScore(
    findings,
  );

  return (
    <>
      <div className="hero">
        <div className="heroCopy">
          <Pill tone="green">
            <ShieldCheck size={13} />
            evidence-first
          </Pill>

          <h2>
            Investigate public exposure.
            <br />
            <em>
              Keep every claim traceable.
            </em>
          </h2>

          <p>
            GhostMode Sentinel is an open-source,
            passive OSINT workspace for collecting
            public observations, preserving
            provenance, correlating entities and
            producing defensible reports.
          </p>

          <div className="buttonRow">
            <button
              className="primary"
              onClick={() =>
                setPage("collect")
              }
            >
              <Sparkles size={16} />
              Start live collection
            </button>

            <button
              onClick={() =>
                setPage("evidence")
              }
            >
              Review evidence
            </button>

            <button
              className="ghostButton"
              onClick={onReset}
            >
              Reset demo
            </button>
          </div>
        </div>

        <div className="heroScore">
          <div className="scoreRing">
            <strong>{score}</strong>
            <span>EXPOSURE</span>
          </div>

          <small>
            heuristic · explainable
          </small>
        </div>
      </div>

      <div className="metrics">
        <Metric
          icon={<FileCheck2 />}
          label="Evidence"
          value={String(findings.length)}
          sub="observations"
        />

        <Metric
          icon={<Network />}
          label="Correlations"
          value={String(
            Math.max(
              0,
              findings.length - 1,
            ),
          )}
          sub="derived edges"
        />

        <Metric
          icon={<AlertTriangle />}
          label="High risk"
          value={String(high).padStart(
            2,
            "0",
          )}
          sub={`${medium} medium`}
        />

        <Metric
          icon={<TimerReset />}
          label="Freshness"
          value="LIVE"
          sub="source timestamps"
        />
      </div>

      <div className="twoCol">
        <Card>
          <CardHead
            label="INVESTIGATION FLOW"
            title="From signal to decision"
            right={<Pill>4 stages</Pill>}
          />

          <div className="flow">
            <Flow
              n="01"
              icon={<Search />}
              title="Collect"
              text="Gather public-source observations."
            />

            <Flow
              n="02"
              icon={<GitBranch />}
              title="Correlate"
              text="Connect entities with provenance."
            />

            <Flow
              n="03"
              icon={<ShieldCheck />}
              title="Assess"
              text="Score confidence, risk and freshness."
            />

            <Flow
              n="04"
              icon={<BookOpen />}
              title="Report"
              text="Export evidence and reasoning."
            />
          </div>
        </Card>

        <Card>
          <CardHead
            label="ACTIVE TARGET"
            title="Current investigation"
            right={
              <Pill tone="green">
                public
              </Pill>
            }
          />

          <div className="demoTarget">
            <Globe2 />

            <div>
              <strong>{target}</strong>
              <span>
                public target · passive profile
              </span>
            </div>
          </div>

          <div className="statList">
            <div>
              <span>Observations</span>
              <strong>
                {findings.length}
              </strong>
            </div>

            <div>
              <span>Exposure</span>
              <strong>{score}/100</strong>
            </div>
          </div>

          <p className="muted">
            No login, credential, exploitation
            or private-network access is used.
          </p>

          <button
            className="primary wide"
            onClick={() =>
              setPage("collect")
            }
          >
            Open Collection Studio
            <ArrowUpRight size={15} />
          </button>
        </Card>
      </div>
    </>
  );
}

/* =========================================================
   INVESTIGATIONS
========================================================= */

function Investigations({
  findings,
  snapshots,
  setPage,
}: {
  findings: Finding[];
  snapshots: Snapshot[];
  setPage: (page: Page) => void;
}) {
  return (
    <>
      <Intro
        label="CASE MANAGEMENT"
        title="Investigations built around evidence."
        text="Keep scope, hypotheses, snapshots and findings together so an investigation can be reproduced by another analyst."
        right={
          <button
            className="primary"
            onClick={() =>
              setPage("collect")
            }
          >
            <Target size={14} />
            New collection
          </button>
        }
      />

      <div className="caseGrid">
        <Card className="investigationPrimary">
          <div className="caseTop">
            <Pill tone="green">
              ACTIVE
            </Pill>

            <span>
              CASE-2026-001
            </span>
          </div>

          <h3>Public Surface Review</h3>

          <p>
            Authorized passive-source
            investigation with provenance-first
            collection and analyst review.
          </p>

          <div className="investigationStats">
            <div>
              <strong>
                {findings.length}
              </strong>
              <span>findings</span>
            </div>

            <div>
              <strong>
                {snapshots.length}
              </strong>
              <span>snapshots</span>
            </div>

            <div>
              <strong>
                {calculateRiskScore(
                  findings,
                )}
              </strong>
              <span>risk</span>
            </div>
          </div>

          <button
            onClick={() =>
              setPage("evidence")
            }
          >
            Open evidence
            <ArrowUpRight size={14} />
          </button>
        </Card>

        <CaseCard
          title="Brand Surface Review"
          id="CASE-2026-002"
          status="READY"
          progress="24%"
          tags={[
            "brand",
            "domains",
          ]}
        />

        <CaseCard
          title="Incident Triage — Demo"
          id="CASE-2026-003"
          status="ARCHIVED"
          progress="100%"
          tags={[
            "incident",
            "evidence",
          ]}
        />
      </div>
    </>
  );
}

function CaseCard({
  title,
  id,
  status,
  progress,
  tags,
}: {
  title: string;
  id: string;
  status: string;
  progress: string;
  tags: string[];
}) {
  return (
    <Card>
      <div className="caseTop">
        <Pill
          tone={
            status === "ACTIVE"
              ? "green"
              : "neutral"
          }
        >
          {status}
        </Pill>

        <span>{id}</span>
      </div>

      <h3>{title}</h3>

      <p>
        Authorized passive-source
        investigation with provenance-first
        collection and analyst review.
      </p>

      <div className="bar">
        <i
          style={{
            width: progress,
          }}
        />
      </div>

      <div className="tags">
        {tags.map((tag) => (
          <Pill key={tag}>
            {tag}
          </Pill>
        ))}
      </div>
    </Card>
  );
}

/* =========================================================
   COLLECTION
========================================================= */

function Collect({
  target,
  setTarget,
  profile,
  setProfile,
  running,
  collect,
  apiOnline,
}: {
  target: string;
  setTarget: (value: string) => void;
  profile: Profile;
  setProfile: (value: Profile) => void;
  running: boolean;
  collect: () => void;
  apiOnline: boolean | null;
}) {
  return (
    <>
      <Intro
        label="COLLECTION STUDIO"
        title="Collect public evidence, not secrets."
        text="Start with a public domain or a public GitHub identity. Sentinel never asks for passwords or attempts authentication."
        right={
          <Pill tone="green">
            <LockKeyhole size={13} />
            safe-by-default
          </Pill>
        }
      />

      <Card className="collector">
        <div className="collectorStatus">
          <span>BACKEND</span>

          <Pill
            tone={
              apiOnline === true
                ? "green"
                : apiOnline === false
                  ? "red"
                  : "amber"
            }
          >
            <i className="miniDot" />
            {apiOnline === true
              ? "reachable"
              : apiOnline === false
                ? "unreachable"
                : "checking"}
          </Pill>
        </div>

        <div className="targetBox">
          <div className="targetIcon">
            <Target />
          </div>

          <div className="targetInput">
            <label>TARGET</label>

            <input
              value={target}
              onChange={(event) =>
                setTarget(
                  event.target.value,
                )
              }
              placeholder="github.com"
              spellCheck={false}
            />

            <small>
              Examples: github.com ·
              wikipedia.org · a public GitHub
              username
            </small>
          </div>
        </div>

        <div className="profiles">
          <Profile
            selected={
              profile === "passive-domain"
            }
            onClick={() =>
              setProfile(
                "passive-domain",
              )
            }
            icon={<Globe2 />}
            title="Passive Domain"
            text="DNS · CT · RDAP · HTTP metadata"
          />

          <Profile
            selected={
              profile === "github-public"
            }
            onClick={() =>
              setProfile(
                "github-public",
              )
            }
            icon={<GitBranch />}
            title="GitHub Public"
            text="Profile · repositories · public metadata"
          />
        </div>

        <div className="guard">
          <ShieldCheck />

          <div>
            <b>
              Collection guardrails
            </b>

            <span>
              Private, loopback, link-local
              and reserved network targets are
              rejected. No credentials, auth
              bypass, exploitation or port
              scanning.
            </span>
          </div>
        </div>

        <button
          className="primary run"
          onClick={collect}
          disabled={running}
        >
          {running ? (
            <>
              <RefreshCw
                className="spin"
                size={16}
              />
              Collecting public evidence…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Run passive collection
            </>
          )}
        </button>
      </Card>
    </>
  );
}

function Profile({
  selected,
  onClick,
  icon,
  title,
  text,
}: {
  selected: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <button
      className={`profile ${
        selected ? "selected" : ""
      }`}
      onClick={onClick}
    >
      <div>{icon}</div>
      <b>{title}</b>
      <span>{text}</span>
    </button>
  );
}

/* =========================================================
   EVIDENCE
========================================================= */

function Evidence({
  findings,
  total,
}: {
  findings: Finding[];
  total: number;
}) {
  return (
    <>
      <Intro
        label="EVIDENCE LEDGER"
        title="Every claim has a trail."
        text="Normalized observations retain source, timestamp, confidence, severity and evidence context."
        right={
          <Pill>
            {findings.length} / {total} findings
          </Pill>
        }
      />

      <Card className="tableCard">
        <div className="tableHead">
          <span>ENTITY</span>
          <span>SOURCE</span>
          <span>CONFIDENCE</span>
          <span>SEVERITY</span>
          <span>OBSERVED</span>
        </div>

        {findings.length === 0 ? (
          <Empty />
        ) : (
          findings.map((finding) => (
            <div
              className="row"
              key={finding.id}
            >
              <div>
                <b>{finding.value}</b>

                <small>
                  {finding.entity_type} ·{" "}
                  {finding.summary}
                </small>
              </div>

              <span>
                <Pill>
                  {finding.source}
                </Pill>
              </span>

              <span className="confidence">
                {Math.round(
                  finding.confidence * 100,
                )}
                %
              </span>

              <span>
                <Pill
                  tone={severityTone(
                    finding.severity,
                  )}
                >
                  {finding.severity}
                </Pill>
              </span>

              <time>
                {formatDate(
                  finding.observed_at,
                )}
              </time>
            </div>
          ))
        )}
      </Card>
    </>
  );
}

function Empty() {
  return (
    <div className="empty">
      <X size={20} />

      <strong>
        No evidence matches this search.
      </strong>

      <span>
        Clear the search box and try again.
      </span>
    </div>
  );
}

/* =========================================================
   GRAPH
========================================================= */

function Graph({
  findings,
  target,
}: {
  findings: Finding[];
  target: string;
}) {
  const graphFindings = findings.slice(
    0,
    16,
  );

  const root = getRootEntity(
    findings,
    target,
  );

  const nodeCount =
    graphFindings.length + 1;

  const width = 1000;
  const height = 560;

  const positions = graphFindings.map(
    (_, index) => {
      const angle =
        (index / Math.max(
          graphFindings.length,
          1,
        )) *
          Math.PI *
          2 -
        Math.PI / 2;

      const radiusX =
        graphFindings.length <= 4
          ? 300
          : 370;

      const radiusY =
        graphFindings.length <= 4
          ? 190
          : 220;

      return {
        x:
          width / 2 +
          Math.cos(angle) * radiusX,

        y:
          height / 2 +
          Math.sin(angle) * radiusY,
      };
    },
  );

  return (
    <>
      <Intro
        label="PROVENANCE GRAPH"
        title="Relationships you can audit."
        text="Entities and evidence are derived directly from the current collection instead of a hardcoded demonstration graph."
        right={
          <Pill>
            <Network size={13} />
            {nodeCount} entities
          </Pill>
        }
      />

      <Card className="graphCard">
        <div className="graphToolbar">
          <div>
            <b>{root}</b>
            <span>
              investigation root
            </span>
          </div>

          <div className="graphToolbarStats">
            <span>
              {findings.length} observations
            </span>

            <span>
              {Math.max(
                0,
                findings.length,
              )}{" "}
              edges
            </span>
          </div>
        </div>

        <div className="graph">
          <svg
            className="graphSvg"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
          >
            {positions.map(
              (position, index) => (
                <line
                  key={`edge-${index}`}
                  x1={width / 2}
                  y1={height / 2}
                  x2={position.x}
                  y2={position.y}
                  stroke="#c4c4ca"
                  strokeWidth="1"
                />
              ),
            )}
          </svg>

          <div
            className="node rootNode"
            style={
              {
                left: "50%",
                top: "50%",
              } as CSSProperties
            }
          >
            <Globe2 />
            <b>{root}</b>
            <small>investigation root</small>
          </div>

          {graphFindings.map(
            (finding, index) => {
              const position =
                positions[index];

              return (
                <div
                  className={`node graphFinding ${
                    finding.severity
                  }`}
                  key={finding.id}
                  style={
                    {
                      left: `${(position.x / width) * 100}%`,
                      top: `${(position.y / height) * 100}%`,
                    } as CSSProperties
                  }
                >
                  <NodeIcon
                    type={
                      finding.entity_type
                    }
                  />

                  <b>
                    {truncate(
                      finding.value,
                      30,
                    )}
                  </b>

                  <small>
                    {finding.entity_type}
                  </small>
                </div>
              );
            },
          )}

          {findings.length === 0 && (
            <div className="graphEmpty">
              <Network size={24} />
              <strong>
                No live evidence yet
              </strong>
              <span>
                Run a collection to build the
                graph.
              </span>
            </div>
          )}

          <div className="graphLegend">
            <span>
              <i />
              entity
            </span>

            <span>
              <i className="sourceDot" />
              observation
            </span>

            <span>
              <i className="edgeDot" />
              derived edge
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}

function NodeIcon({
  type,
}: {
  type: string;
}) {
  if (
    type.includes("dns") ||
    type.includes("ip")
  ) {
    return <Server />;
  }

  if (
    type.includes("github") ||
    type.includes("repository")
  ) {
    return <Code2 />;
  }

  if (
    type.includes("certificate") ||
    type.includes("ct")
  ) {
    return <FileSearch />;
  }

  if (
    type.includes("technology") ||
    type.includes("http")
  ) {
    return <Globe2 />;
  }

  return <Database />;
}

/* =========================================================
   TIMELINE
========================================================= */

function Timeline({
  findings,
  timeline,
  snapshots,
}: {
  findings: Finding[];
  timeline: TimelineEvent[];
  snapshots: Snapshot[];
}) {
  const latest =
    snapshots[0]?.findings ?? findings;

  const previous =
    snapshots[1]?.findings ?? [];

  const diff = calculateDiff(
    previous,
    latest,
  );

  const events =
    timeline.length > 0
      ? timeline
      : latest.map((finding) => ({
          id: finding.id,
          created_at:
            finding.observed_at,
          title: "Observation",
          description:
            finding.summary,
          type: "finding" as const,
        }));

  return (
    <>
      <Intro
        label="TEMPORAL INTELLIGENCE"
        title="What changed between snapshots?"
        text="Repeated collections create a lightweight temporal record of new, changed, removed and persistent observations."
        right={
          <Pill>
            {snapshots.length} snapshots
          </Pill>
        }
      />

      <div className="diffGrid">
        <Diff
          label="NEW"
          value={String(diff.added).padStart(
            2,
            "0",
          )}
          tone="green"
          text="newly observed"
        />

        <Diff
          label="CHANGED"
          value={String(
            diff.changed,
          ).padStart(2, "0")}
          tone="amber"
          text="metadata changed"
        />

        <Diff
          label="REMOVED"
          value={String(
            diff.removed,
          ).padStart(2, "0")}
          tone="red"
          text="not in latest"
        />

        <Diff
          label="TOTAL"
          value={String(
            latest.length,
          ).padStart(2, "0")}
          tone="neutral"
          text="latest observations"
        />
      </div>

      <Card>
        <CardHead
          label="ACTIVITY"
          title="Investigation timeline"
          right={
            <Pill>
              {events.length} events
            </Pill>
          }
        />

        <div className="timeline">
          {events.length === 0 ? (
            <div className="empty">
              <Clock3 size={20} />
              <strong>
                No timeline events yet.
              </strong>
              <span>
                Run a collection to create a
                snapshot.
              </span>
            </div>
          ) : (
            events
              .slice(0, 30)
              .map((event) => (
                <div
                  className="tl"
                  key={event.id}
                >
                  <div className="tlDot" />

                  <div>
                    <time>
                      {formatDate(
                        event.created_at,
                      )}
                    </time>

                    <h3>
                      {event.title}
                    </h3>

                    <p>
                      {event.description}
                    </p>
                  </div>

                  <Pill
                    tone={
                      event.type ===
                      "change"
                        ? "amber"
                        : "green"
                    }
                  >
                    {event.type.toUpperCase()}
                  </Pill>
                </div>
              ))
          )}
        </div>
      </Card>
    </>
  );
}

function Diff({
  label,
  value,
  tone,
  text,
}: {
  label: string;
  value: string;
  tone: string;
  text: string;
}) {
  return (
    <Card className={`diff ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{text}</small>
    </Card>
  );
}

/* =========================================================
   RISK
========================================================= */

function Risk({
  findings,
}: {
  findings: Finding[];
}) {
  const score =
    calculateRiskScore(findings);

  const severityCounts = {
    critical: findings.filter(
      (f) => f.severity === "critical",
    ).length,

    high: findings.filter(
      (f) => f.severity === "high",
    ).length,

    medium: findings.filter(
      (f) => f.severity === "medium",
    ).length,

    low: findings.filter(
      (f) => f.severity === "low",
    ).length,
  };

  const confidence = findings.length
    ? Math.round(
        (findings.reduce(
          (sum, finding) =>
            sum + finding.confidence,
          0,
        ) /
          findings.length) *
          100,
      )
    : 0;

  return (
    <>
      <Intro
        label="EXPOSURE ENGINE"
        title="Prioritize what deserves attention."
        text="Risk is a transparent heuristic. It is not a claim of compromise, maliciousness or attribution."
        right={
          <Pill>
            <ShieldCheck size={13} />
            explainable
          </Pill>
        }
      />

      <div className="riskGrid">
        <Card className="riskHero">
          <span className="label">
            CASE EXPOSURE
          </span>

          <div className="bigScore">
            {score}
            <small>/100</small>
          </div>

          <div className="riskBar">
            <i
              style={{
                width: `${score}%`,
              }}
            />
          </div>

          <p>
            Derived from observation
            severity, confidence and public
            visibility.
          </p>
        </Card>

        <Card>
          <span className="label">
            RISK FACTORS
          </span>

          <Factor
            name="Critical findings"
            value={severityCounts.critical}
            max={Math.max(
              1,
              findings.length,
            )}
          />

          <Factor
            name="High findings"
            value={severityCounts.high}
            max={Math.max(
              1,
              findings.length,
            )}
          />

          <Factor
            name="Medium findings"
            value={severityCounts.medium}
            max={Math.max(
              1,
              findings.length,
            )}
          />

          <Factor
            name="Evidence confidence"
            value={confidence}
            max={100}
            percent
          />
        </Card>
      </div>

      <Card>
        <CardHead
          label="PRIORITY QUEUE"
          title="Review these first"
        />

        {findings.length === 0 ? (
          <Empty />
        ) : (
          [...findings]
            .sort(
              (a, b) =>
                findingRisk(b) -
                findingRisk(a),
            )
            .map((finding, index) => (
              <div
                className="priority"
                key={finding.id}
              >
                <span className="rank">
                  {String(
                    index + 1,
                  ).padStart(2, "0")}
                </span>

                <div>
                  <b>{finding.value}</b>

                  <small>
                    {finding.summary}
                  </small>
                </div>

                <Pill
                  tone={severityTone(
                    finding.severity,
                  )}
                >
                  {finding.severity}
                </Pill>

                <strong>
                  {Math.round(
                    finding.confidence *
                      100,
                  )}
                  % confidence
                </strong>
              </div>
            ))
        )}
      </Card>
    </>
  );
}

function Factor({
  name,
  value,
  max,
  percent = false,
}: {
  name: string;
  value: number;
  max: number;
  percent?: boolean;
}) {
  const width = percent
    ? value
    : Math.round(
        (value / Math.max(max, 1)) *
          100,
      );

  return (
    <div className="factor">
      <div>
        <span>{name}</span>
        <b>
          {percent ? `${value}%` : value}
        </b>
      </div>

      <div className="bar">
        <i
          style={{
            width: `${clamp(
              width,
              0,
              100,
            )}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   REPORTS
========================================================= */

function Reports({
  findings,
  target,
  snapshots,
  timeline,
}: {
  findings: Finding[];
  target: string;
  snapshots: Snapshot[];
  timeline: TimelineEvent[];
}) {
  const preview = useMemo(
    () =>
      createCasePackage(
        findings,
        target,
        snapshots,
        timeline,
      ),
    [
      findings,
      target,
      snapshots,
      timeline,
    ],
  );

  return (
    <>
      <Intro
        label="REPORTING"
        title="Turn evidence into a handoff."
        text="Export normalized observations for analysts, engineering teams or downstream intelligence tooling."
        right={
          <Pill tone="green">
            export-ready
          </Pill>
        }
      />

      <div className="reportGrid">
        <Report
          icon={<BookOpen />}
          title="Analyst brief"
          text="Human-readable investigation summary."
          onClick={() =>
            downloadText(
              "ghostmode-analyst-brief.md",
              buildAnalystBrief(
                findings,
                target,
              ),
              "text/markdown",
            )
          }
        />

        <Report
          icon={<Database />}
          title="JSON bundle"
          text="Portable normalized evidence dataset."
          onClick={() =>
            downloadText(
              "ghostmode-case.json",
              JSON.stringify(
                preview,
                null,
                2,
              ),
              "application/json",
            )
          }
        />

        <Report
          icon={<Network />}
          title="STIX 2.1"
          text="Interoperable intelligence objects."
          onClick={() =>
            downloadText(
              "ghostmode-sentinel.stix.json",
              JSON.stringify(
                createStixBundle(
                  findings,
                  target,
                ),
                null,
                2,
              ),
              "application/json",
            )
          }
        />

        <Report
          icon={<Archive />}
          title="Case archive"
          text="Scope, evidence, snapshots and provenance package."
          onClick={() =>
            downloadText(
              "ghostmode-case-archive.json",
              JSON.stringify(
                preview,
                null,
                2,
              ),
              "application/json",
            )
          }
        />
      </div>

      <Card>
        <div className="exportPreviewHead">
          <div>
            <span className="label">
              EXPORT PREVIEW
            </span>

            <h3>
              Normalized case package
            </h3>
          </div>

          <Pill>
            {findings.length} findings
          </Pill>
        </div>

        <pre>
          {JSON.stringify(
            {
              case_id:
                preview.case_id,
              target,
              generated_at:
                preview.generated_at,
              findings:
                preview.findings.length,
              snapshots:
                preview.snapshots.length,
              timeline_events:
                preview.timeline.length,
            },
            null,
            2,
          )}
        </pre>
      </Card>
    </>
  );
}

function Report({
  icon,
  title,
  text,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <Card className="report">
      <div className="reportIcon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>

      <button onClick={onClick}>
        Generate
        <ArrowDownToLine size={14} />
      </button>
    </Card>
  );
}

/* =========================================================
   SHARED COMPONENTS
========================================================= */

function CardHead({
  label,
  title,
  right,
}: {
  label: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="cardHead">
      <div>
        <span className="label">
          {label}
        </span>

        <h3>{title}</h3>
      </div>

      {right}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card className="metric">
      <div className="metricIcon">
        {icon}
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{sub}</small>
      </div>
    </Card>
  );
}

function Flow({
  n,
  icon,
  title,
  text,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flowItem">
      <span>{n}</span>

      <div className="flowIcon">
        {icon}
      </div>

      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Intro({
  label,
  title,
  text,
  button,
  right,
}: {
  label: string;
  title: string;
  text: string;
  button?: string;
  right?: ReactNode;
}) {
  return (
    <div className="sectionIntro">
      <div>
        <span className="label">
          {label}
        </span>

        <h2>{title}</h2>

        <p>{text}</p>
      </div>

      {right ||
        (button ? (
          <button>
            {button}
            <ArrowUpRight size={14} />
          </button>
        ) : null)}
    </div>
  );
}

function GhostMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="25"
      height="25"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 25V13c0-5 4-9 9-9s9 4 9 9v12l-3-2-3 2-3-2-3 2-3-2-3 2Z"
        stroke="currentColor"
        strokeWidth="2"
      />

      <circle
        cx="12"
        cy="14"
        r="1.5"
        fill="currentColor"
      />

      <circle
        cx="20"
        cy="14"
        r="1.5"
        fill="currentColor"
      />
    </svg>
  );
}

/* =========================================================
   UTILITIES
========================================================= */

function severityTone(
  severity: Severity,
) {
  if (
    severity === "critical" ||
    severity === "high"
  ) {
    return "red";
  }

  if (severity === "medium") {
    return "amber";
  }

  return "green";
}

function calculateRiskScore(
  findings: Finding[],
) {
  if (findings.length === 0) {
    return 0;
  }

  const severityWeight: Record<
    Severity,
    number
  > = {
    info: 1,
    low: 5,
    medium: 12,
    high: 22,
    critical: 35,
  };

  const weighted =
    findings.reduce(
      (sum, finding) =>
        sum +
        severityWeight[
          finding.severity
        ] *
          (0.5 +
            finding.confidence * 0.5),
      0,
    );

  return Math.round(
    clamp(
      20 +
        (weighted /
          Math.max(
            findings.length,
            1,
          )) *
          2.2,
      0,
      100,
    ),
  );
}

function findingRisk(
  finding: Finding,
) {
  const weights: Record<
    Severity,
    number
  > = {
    info: 1,
    low: 5,
    medium: 12,
    high: 22,
    critical: 35,
  };

  return (
    weights[finding.severity] *
    (0.5 + finding.confidence * 0.5)
  );
}

function getRootEntity(
  findings: Finding[],
  target: string,
) {
  return (
    findings.find(
      (finding) =>
        finding.entity_type ===
        "domain",
    )?.value ||
    target ||
    "unknown"
  );
}

function calculateDiff(
  previous: Finding[],
  current: Finding[],
) {
  const previousMap = new Map(
    previous.map((finding) => [
      findingKey(finding),
      finding,
    ]),
  );

  const currentMap = new Map(
    current.map((finding) => [
      findingKey(finding),
      finding,
    ]),
  );

  let added = 0;
  let changed = 0;
  let removed = 0;

  for (const finding of current) {
    const old =
      previousMap.get(
        findingKey(finding),
      );

    if (!old) {
      added++;
      continue;
    }

    if (
      old.confidence !==
        finding.confidence ||
      old.severity !==
        finding.severity ||
      old.summary !== finding.summary
    ) {
      changed++;
    }
  }

  for (const finding of previous) {
    if (
      !currentMap.has(
        findingKey(finding),
      )
    ) {
      removed++;
    }
  }

  return {
    added,
    changed,
    removed,
  };
}

function formatDate(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString();
}

function truncate(
  value: string,
  max: number,
) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(
    0,
    max - 1,
  )}…`;
}

function downloadText(
  filename: string,
  content: string,
  type: string,
) {
  const blob = new Blob(
    [content],
    { type },
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  anchor.remove();

  URL.revokeObjectURL(url);
}

function buildAnalystBrief(
  findings: Finding[],
  target: string,
) {
  const score =
    calculateRiskScore(findings);

  const lines = [
    "# GhostMode Sentinel — Analyst Brief",
    "",
    `Target: ${target}`,
    `Generated: ${new Date().toISOString()}`,
    `Exposure score: ${score}/100`,
    `Observations: ${findings.length}`,
    "",
    "## Executive Summary",
    "",
    `Sentinel collected ${findings.length} public observations for ${target}.`,
    "All observations should be reviewed with their source and confidence before being treated as confirmed intelligence.",
    "",
    "## Evidence",
    "",
  ];

  for (const finding of findings) {
    lines.push(
      `### ${finding.value}`,
      "",
      `- Type: ${finding.entity_type}`,
      `- Source: ${finding.source}`,
      `- Confidence: ${Math.round(finding.confidence * 100)}%`,
      `- Severity: ${finding.severity}`,
      `- Observed: ${finding.observed_at}`,
      `- Summary: ${finding.summary}`,
      "",
    );
  }

  return lines.join("\n");
}

function createCasePackage(
  findings: Finding[],
  target: string,
  snapshots: Snapshot[],
  timeline: TimelineEvent[],
) {
  return {
    schema_version: "1.2",
    case_id: "CASE-2026-001",
    target,
    generated_at:
      new Date().toISOString(),
    methodology: {
      mode: "passive",
      public_sources_only: true,
      authentication: false,
      exploitation: false,
      private_network_access: false,
    },
    risk: {
      score:
        calculateRiskScore(findings),
      model:
        "transparent-frontend-heuristic",
    },
    findings,
    snapshots,
    timeline,
  };
}

function createStixBundle(
  findings: Finding[],
  target: string,
) {
  const now =
    new Date().toISOString();

  const objects = [
    {
      type: "identity",
      spec_version: "2.1",
      id: `identity--${crypto.randomUUID()}`,
      created: now,
      modified: now,
      name: "GhostMode Sentinel",
      identity_class: "system",
    },
  ];

  for (const finding of findings) {
    objects.push({
      type: "observed-data",
      spec_version: "2.1",
      id: `observed-data--${crypto.randomUUID()}`,
      created: now,
      modified: now,
      first_observed:
        finding.observed_at,
      last_observed:
        finding.observed_at,
      number_observed: 1,
      object_marking_refs: [],
      x_ghostmode_target: target,
      x_ghostmode_entity_type:
        finding.entity_type,
      x_ghostmode_value:
        finding.value,
      x_ghostmode_source:
        finding.source,
      x_ghostmode_confidence:
        finding.confidence,
      x_ghostmode_severity:
        finding.severity,
    });
  }

  return {
    type: "bundle",
    id: `bundle--${crypto.randomUUID()}`,
    objects,
  };
}

createRoot(
  document.getElementById("root")!,
).render(<App />);
