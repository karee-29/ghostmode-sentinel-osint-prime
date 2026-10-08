import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileJson,
  FileText,
  Filter,
  Fingerprint,
  FolderKanban,
  GitBranch,
  Globe2,
  Info,
  LayoutDashboard,
  Layers3,
  Link2,
  LockKeyhole,
  Menu,
  Network,
  Play,
  Radar,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  TriangleAlert,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import "./styles.css";

type Page =
  | "command"
  | "investigations"
  | "collection"
  | "evidence"
  | "graph"
  | "timeline"
  | "risk"
  | "reports";

type Severity = "critical" | "high" | "medium" | "low" | "info";
type RiskLevel = "critical" | "high" | "medium" | "low";

type Profile = "passive_domain" | "web_intelligence" | "github_public";

type Finding = {
  id: string;
  type: string;
  title: string;
  description: string;
  source: string;
  target: string;
  severity: Severity;
  confidence: number;
  observedAt: string;
  category: string;
  value?: string;
  evidence?: string;
  url?: string;
};

type Snapshot = {
  id: string;
  createdAt: string;
  target: string;
  findingCount: number;
  riskScore: number;
};

type TimelineEvent = {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  kind: "discovered" | "changed" | "removed" | "stable";
  severity: Severity;
};

type NavItem = {
  id: Page;
  label: string;
  icon: ReactNode;
};

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

const DEMO_FINDINGS: Finding[] = [
  {
    id: "demo-dns-001",
    type: "dns",
    title: "DNS infrastructure observed",
    description:
      "Public DNS records reveal authoritative infrastructure associated with the target.",
    source: "DNS-over-HTTPS",
    target: "github.com",
    severity: "low",
    confidence: 0.98,
    observedAt: "2026-10-08T16:15:00Z",
    category: "Infrastructure",
    value: "A / AAAA / NS",
    evidence: "Public DNS resolution",
  },
  {
    id: "demo-tls-001",
    type: "certificate",
    title: "Certificate transparency coverage",
    description:
      "Certificate transparency records provide historical visibility into discovered hostnames.",
    source: "Certificate Transparency",
    target: "github.com",
    severity: "medium",
    confidence: 0.94,
    observedAt: "2026-10-08T16:14:00Z",
    category: "Infrastructure",
    value: "*.github.com",
    evidence: "Certificate transparency log",
  },
  {
    id: "demo-http-001",
    type: "http",
    title: "HTTP security headers observed",
    description:
      "Public HTTP response metadata can be evaluated for defensive configuration signals.",
    source: "HTTP Metadata",
    target: "github.com",
    severity: "info",
    confidence: 0.99,
    observedAt: "2026-10-08T16:13:00Z",
    category: "Web",
    value: "HTTP response headers",
    evidence: "Public HTTP metadata",
  },
  {
    id: "demo-rdap-001",
    type: "rdap",
    title: "Domain registration intelligence",
    description:
      "Public RDAP information provides registrar and lifecycle metadata where available.",
    source: "RDAP",
    target: "github.com",
    severity: "info",
    confidence: 0.96,
    observedAt: "2026-10-08T16:12:00Z",
    category: "Identity",
    value: "RDAP domain record",
    evidence: "Public registration data",
  },
  {
    id: "demo-gh-001",
    type: "github",
    title: "Public developer footprint",
    description:
      "Public GitHub profile and repository metadata can reveal project, organization and activity signals.",
    source: "GitHub Public API",
    target: "github.com",
    severity: "medium",
    confidence: 0.91,
    observedAt: "2026-10-08T16:10:00Z",
    category: "Developer",
    value: "Public profile metadata",
    evidence: "GitHub public API",
  },
];

const NAV_ITEMS: NavItem[] = [
  {
    id: "command",
    label: "Command Center",
    icon: <LayoutDashboard size={17} />,
  },
  {
    id: "investigations",
    label: "Investigations",
    icon: <FolderKanban size={17} />,
  },
  {
    id: "collection",
    label: "Collection Studio",
    icon: <Radar size={17} />,
  },
  {
    id: "evidence",
    label: "Evidence Ledger",
    icon: <Database size={17} />,
  },
  {
    id: "graph",
    label: "Intelligence Graph",
    icon: <Network size={17} />,
  },
  {
    id: "timeline",
    label: "Timeline & Diff",
    icon: <Clock3 size={17} />,
  },
  {
    id: "risk",
    label: "Risk & Exposure",
    icon: <TriangleAlert size={17} />,
  },
  {
    id: "reports",
    label: "Reports & Export",
    icon: <FileText size={17} />,
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix = "evt"): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(value: string): string {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}

function severityWeight(severity: Severity): number {
  switch (severity) {
    case "critical":
      return 100;
    case "high":
      return 75;
    case "medium":
      return 50;
    case "low":
      return 25;
    default:
      return 5;
  }
}

function calculateRiskScore(findings: Finding[]): number {
  if (!findings.length) {
    return 0;
  }

  const weighted = findings.reduce(
    (sum, finding) =>
      sum + severityWeight(finding.severity) * finding.confidence,
    0,
  );

  const normalized = weighted / findings.length;

  return Math.min(100, Math.round(normalized));
}

function riskLevel(score: number): RiskLevel {
  if (score >= 80) {
    return "critical";
  }

  if (score >= 60) {
    return "high";
  }

  if (score >= 35) {
    return "medium";
  }

  return "low";
}

function normalizeSeverity(value: unknown): Severity {
  const text = String(value ?? "").toLowerCase();

  if (
    text === "critical" ||
    text === "high" ||
    text === "medium" ||
    text === "low"
  ) {
    return text;
  }

  return "info";
}

function normalizeConfidence(value: unknown): number {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0.8;
  }

  if (numeric > 1) {
    return Math.min(1, numeric / 100);
  }

  return Math.max(0, Math.min(1, numeric));
}

function normalizeFindings(payload: unknown, target: string): Finding[] {
  if (!payload) {
    return [];
  }

  const source =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};

  const rawCandidates: unknown[] = [];

  const possibleArrays = [
    source.findings,
    source.evidence,
    source.results,
    source.observations,
    source.data,
  ];

  for (const candidate of possibleArrays) {
    if (Array.isArray(candidate)) {
      rawCandidates.push(...candidate);
    }
  }

  if (
    rawCandidates.length === 0 &&
    Array.isArray(payload)
  ) {
    rawCandidates.push(...payload);
  }

  if (rawCandidates.length === 0) {
    return [];
  }

  return rawCandidates.map((item, index) => {
    const record =
      typeof item === "object" && item !== null
        ? (item as Record<string, unknown>)
        : {};

    const title =
      String(
        record.title ??
          record.name ??
          record.type ??
          `Observation ${index + 1}`,
      );

    const description = String(
      record.description ??
        record.summary ??
        record.detail ??
        record.value ??
        "Publicly observable intelligence finding.",
    );

    return {
      id: String(record.id ?? uid("finding")),
      type: String(record.type ?? "observation"),
      title,
      description,
      source: String(
        record.source ??
          record.provider ??
          record.collector ??
          "GhostMode Sentinel",
      ),
      target: String(record.target ?? target),
      severity: normalizeSeverity(record.severity ?? record.risk),
      confidence: normalizeConfidence(
        record.confidence ?? record.confidence_score,
      ),
      observedAt: String(
        record.observedAt ??
          record.observed_at ??
          record.timestamp ??
          nowIso(),
      ),
      category: String(
        record.category ?? record.domain ?? "General",
      ),
      value:
        record.value === undefined
          ? undefined
          : String(record.value),
      evidence:
        record.evidence === undefined
          ? undefined
          : String(record.evidence),
      url:
        record.url === undefined
          ? undefined
          : String(record.url),
    };
  });
}

function createTimeline(
  findings: Finding[],
  previousFindings: Finding[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  const previousMap = new Map(
    previousFindings.map((finding) => [finding.id, finding]),
  );

  for (const finding of findings) {
    const previous = previousMap.get(finding.id);

    if (!previous) {
      events.push({
        id: uid("timeline"),
        timestamp: finding.observedAt,
        title: finding.title,
        description: `New observation collected from ${finding.source}.`,
        kind: "discovered",
        severity: finding.severity,
      });
      continue;
    }

    const changed =
      previous.value !== finding.value ||
      previous.description !== finding.description ||
      previous.severity !== finding.severity;

    events.push({
      id: uid("timeline"),
      timestamp: finding.observedAt,
      title: changed
        ? `Changed: ${finding.title}`
        : `Stable: ${finding.title}`,
      description: changed
        ? "The latest collection differs from the previous observation."
        : "The latest observation remains consistent with the previous snapshot.",
      kind: changed ? "changed" : "stable",
      severity: finding.severity,
    });
  }

  const currentIds = new Set(findings.map((finding) => finding.id));

  for (const previous of previousFindings) {
    if (!currentIds.has(previous.id)) {
      events.push({
        id: uid("timeline"),
        timestamp: nowIso(),
        title: `Removed: ${previous.title}`,
        description:
          "The observation was present in the previous snapshot but was not returned by the latest collection.",
        kind: "removed",
        severity: previous.severity,
      });
    }
  }

  return events.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime(),
  );
}

function downloadText(
  filename: string,
  content: string,
  type = "text/plain",
): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? "");

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.split('"').join('""')}"`;
  }

  return text;
}

function createEvidenceCsv(findings: Finding[]): string {
  const headers = [
    "id",
    "type",
    "title",
    "description",
    "source",
    "target",
    "severity",
    "confidence",
    "observed_at",
    "category",
    "value",
    "evidence",
    "url",
  ];

  const rows = findings.map((finding) =>
    [
      finding.id,
      finding.type,
      finding.title,
      finding.description,
      finding.source,
      finding.target,
      finding.severity,
      finding.confidence,
      finding.observedAt,
      finding.category,
      finding.value ?? "",
      finding.evidence ?? "",
      finding.url ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

function createStixBundle(
  findings: Finding[],
  target: string,
): Record<string, unknown> {
  /*
   * IMPORTANT:
   *
   * Do NOT allow TypeScript to infer the object array from the
   * first object literal. The previous version failed here because
   * TypeScript inferred a very narrow object type and rejected
   * first_observed / x_ghostmode_* fields.
   *
   * Explicit Record<string, unknown>[] fixes that completely.
   */
  const objects: Record<string, unknown>[] = [
    {
      type: "identity",
      spec_version: "2.1",
      id: `identity--${uid("ghostmode")}`,
      created: nowIso(),
      modified: nowIso(),
      name: "GhostMode Sentinel Investigation",
      identity_class: "organization",
    },
  ];

  for (const finding of findings) {
    objects.push({
      type: "note",
      spec_version: "2.1",
      id: `note--${uid("finding")}`,
      created: finding.observedAt,
      modified: nowIso(),
      content: finding.description,
      object_marking_refs: [],
      x_ghostmode_target: target,
      x_ghostmode_source: finding.source,
      x_ghostmode_category: finding.category,
      x_ghostmode_severity: finding.severity,
      x_ghostmode_confidence: finding.confidence,
      x_ghostmode_value: finding.value ?? null,
      first_observed: finding.observedAt,
      last_observed: finding.observedAt,
      labels: [
        "ghostmode-sentinel",
        finding.type,
        finding.severity,
      ],
    });
  }

  return {
    type: "bundle",
    id: `bundle--${uid("ghostmode")}`,
    spec_version: "2.1",
    created: nowIso(),
    x_ghostmode_target: target,
    x_ghostmode_generated_by: "GhostMode Sentinel",
    objects,
  };
}

function createCasePackage(
  target: string,
  findings: Finding[],
  snapshots: Snapshot[],
  timeline: TimelineEvent[],
): Record<string, unknown> {
  return {
    schema_version: "1.0",
    product: "GhostMode Sentinel",
    generated_at: nowIso(),
    target,
    methodology: {
      collection_model: "passive-public-osint",
      authentication_bypass: false,
      exploitation: false,
      private_network_scanning: false,
      credential_collection: false,
    },
    summary: {
      finding_count: findings.length,
      risk_score: calculateRiskScore(findings),
      risk_level: riskLevel(calculateRiskScore(findings)),
    },
    findings,
    snapshots,
    timeline,
  };
}

function iconForFinding(type: string): ReactNode {
  const normalized = type.toLowerCase();

  if (normalized.includes("dns")) {
    return <Globe2 size={16} />;
  }

  if (normalized.includes("certificate")) {
    return <LockKeyhole size={16} />;
  }

  if (normalized.includes("github")) {
    return <GitBranch size={16} />;
  }

  if (normalized.includes("rdap")) {
    return <Fingerprint size={16} />;
  }

  if (normalized.includes("http")) {
    return <Eye size={16} />;
  }

  return <Database size={16} />;
}

function App() {
  const [page, setPage] = useState<Page>("command");
  const [target, setTarget] = useState("github.com");
  const [profile, setProfile] =
    useState<Profile>("passive_domain");

  const [findings, setFindings] =
    useState<Finding[]>(DEMO_FINDINGS);

  const [previousFindings, setPreviousFindings] =
    useState<Finding[]>([]);

  const [snapshots, setSnapshots] = useState<Snapshot[]>([
    {
      id: "snapshot-demo-1",
      createdAt: "2026-10-08T15:30:00Z",
      target: "github.com",
      findingCount: 5,
      riskScore: 31,
    },
    {
      id: "snapshot-demo-2",
      createdAt: "2026-10-08T16:00:00Z",
      target: "github.com",
      findingCount: 5,
      riskScore: 34,
    },
  ]);

  const [apiOnline, setApiOnline] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [toast, setToast] = useState("");
  const [mobileNav, setMobileNav] = useState(false);

  const score = useMemo(
    () => calculateRiskScore(findings),
    [findings],
  );

  const level = riskLevel(score);

  const timeline = useMemo(
    () => createTimeline(findings, previousFindings),
    [findings, previousFindings],
  );

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const response = await fetch(`${API_BASE}/api/health`, {
          method: "GET",
        });

        if (!cancelled) {
          setApiOnline(response.ok);
        }
      } catch {
        if (!cancelled) {
          setApiOnline(false);
        }
      }
    }

    void checkHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast("");
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [toast]);

  function notify(message: string) {
    setToast(message);
  }

  async function collect() {
    const cleanTarget = target.trim();

    if (!cleanTarget) {
      notify("Enter a target before starting collection.");
      return;
    }

    if (!apiOnline) {
      notify(
        `API offline. Check ${API_BASE}/api/health before collecting.`,
      );
      return;
    }

    setCollecting(true);
    setPreviousFindings(findings);

    try {
      const response = await fetch(`${API_BASE}/api/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: cleanTarget,
          profile,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          body || `Collection failed with HTTP ${response.status}`,
        );
      }

      const payload: unknown = await response.json();

      const normalized = normalizeFindings(
        payload,
        cleanTarget,
      );

      if (!normalized.length) {
        notify(
          "Collection completed, but no normalized findings were returned.",
        );
      } else {
        setFindings(normalized);

        const snapshot: Snapshot = {
          id: uid("snapshot"),
          createdAt: nowIso(),
          target: cleanTarget,
          findingCount: normalized.length,
          riskScore: calculateRiskScore(normalized),
        };

        setSnapshots((current) => [
          snapshot,
          ...current,
        ]);

        notify(
          `Collection completed: ${normalized.length} findings.`,
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown collection error.";

      notify(`Collection failed: ${message}`);
    } finally {
      setCollecting(false);
    }
  }

  function openPage(next: Page) {
    setPage(next);
    setMobileNav(false);
  }

  function exportJson() {
    const bundle = createCasePackage(
      target,
      findings,
      snapshots,
      timeline,
    );

    downloadText(
      `ghostmode-${target.replace(/[^a-z0-9.-]/gi, "-")}.json`,
      JSON.stringify(bundle, null, 2),
      "application/json",
    );

    notify("Investigation JSON exported.");
  }

  function exportCsv() {
    downloadText(
      `ghostmode-${target.replace(/[^a-z0-9.-]/gi, "-")}.csv`,
      createEvidenceCsv(findings),
      "text/csv;charset=utf-8",
    );

    notify("Evidence CSV exported.");
  }

  function exportStix() {
    const bundle = createStixBundle(findings, target);

    downloadText(
      `ghostmode-${target.replace(/[^a-z0-9.-]/gi, "-")}-stix.json`,
      JSON.stringify(bundle, null, 2),
      "application/json",
    );

    notify("STIX 2.1 bundle exported.");
  }

  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        findingsCount={findings.length}
        openPage={openPage}
        mobileOpen={mobileNav}
        closeMobile={() => setMobileNav(false)}
      />

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>

            <div className="breadcrumb">
              <span>GhostMode</span>
              <ChevronRight size={14} />
              <strong>Sentinel</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div
              className={`api-status ${
                apiOnline ? "online" : "offline"
              }`}
            >
              <span className="status-dot" />
              {apiOnline ? "API online" : "API offline"}
            </div>

            <button
              className="icon-button"
              title="Refresh API status"
              onClick={() => {
                window.location.reload();
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="content-shell">
          {page === "command" && (
            <CommandCenter
              target={target}
              findings={findings}
              score={score}
              level={level}
              apiOnline={apiOnline}
              onNavigate={openPage}
              onTargetChange={setTarget}
              onCollect={() => {
                void collect();
              }}
              collecting={collecting}
              onNotify={notify}
            />
          )}

          {page === "investigations" && (
            <Investigations
              target={target}
              findings={findings}
              snapshots={snapshots}
              score={score}
              onNavigate={openPage}
              onTargetChange={setTarget}
              onNotify={notify}
            />
          )}

          {page === "collection" && (
            <CollectionStudio
              target={target}
              profile={profile}
              apiOnline={apiOnline}
              collecting={collecting}
              onTargetChange={setTarget}
              onProfileChange={setProfile}
              onCollect={() => {
                void collect();
              }}
              onNotify={notify}
            />
          )}

          {page === "evidence" && (
            <EvidenceLedger
              findings={findings}
              onExportJson={exportJson}
              onExportCsv={exportCsv}
              onNotify={notify}
            />
          )}

          {page === "graph" && (
            <IntelligenceGraph
              target={target}
              findings={findings}
            />
          )}

          {page === "timeline" && (
            <TimelinePage
              snapshots={snapshots}
              timeline={timeline}
              findings={findings}
            />
          )}

          {page === "risk" && (
            <RiskExposure
              findings={findings}
              score={score}
              level={level}
            />
          )}

          {page === "reports" && (
            <Reports
              target={target}
              findings={findings}
              snapshots={snapshots}
              timeline={timeline}
              onExportJson={exportJson}
              onExportCsv={exportCsv}
              onExportStix={exportStix}
              onNotify={notify}
            />
          )}
        </div>
      </main>

      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          <span>{toast}</span>
          <button
            className="toast-close"
            onClick={() => setToast("")}
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar({
  page,
  findingsCount,
  openPage,
  mobileOpen,
  closeMobile,
}: {
  page: Page;
  findingsCount: number;
  openPage: (page: Page) => void;
  mobileOpen: boolean;
  closeMobile: () => void;
}) {
  return (
    <>
      {mobileOpen && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`sidebar ${
          mobileOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={20} strokeWidth={2.2} />
          </div>

          <div>
            <div className="brand-name">GHOSTMODE</div>
            <div className="brand-subtitle">SENTINEL / OSINT</div>
          </div>

          <button
            className="mobile-close"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <div className="workspace">
          <div className="workspace-label">
            ACTIVE WORKSPACE
          </div>

          <div className="workspace-card">
            <div className="workspace-icon">
              <Target size={16} />
            </div>

            <div className="workspace-copy">
              <strong>Personal Intelligence</strong>
              <span>Passive investigation</span>
            </div>

            <ChevronRight size={15} />
          </div>
        </div>

        <nav className="navigation">
          <div className="nav-label">OPERATIONS</div>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${
                page === item.id ? "active" : ""
              }`}
              onClick={() => openPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "evidence" && (
                <span className="nav-count">{findingsCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="safe-mode">
            <div className="safe-mode-icon">
              <LockKeyhole size={15} />
            </div>

            <div>
              <strong>Passive mode</strong>
              <span>No authentication bypass</span>
            </div>
          </div>

          <button
            className="nav-item secondary"
            onClick={() => {
              window.open(
                "https://github.com/karee-29",
                "_blank",
                "noopener,noreferrer",
              );
            }}
          >
            <BookOpen size={16} />
            <span>Documentation</span>
            <ExternalLink size={13} />
          </button>
        </div>
      </aside>
    </>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {actions && (
        <div className="page-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
}

function Button({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      className={`button button-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  trend,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>

      <div className="metric-value">{value}</div>

      <div className="metric-detail">
        {trend === "up" && (
          <ArrowUpRight size={14} />
        )}
        {trend === "down" && (
          <ArrowDownRight size={14} />
        )}
        {detail}
      </div>
    </div>
  );
}

function RiskBadge({
  severity,
}: {
  severity: Severity | RiskLevel;
}) {
  return (
    <span
      className={`risk-badge risk-${severity}`}
    >
      <span className="risk-dot" />
      {severity}
    </span>
  );
}

function ScoreRing({
  score,
  level,
}: {
  score: number;
  level: RiskLevel;
}) {
  const circumference = 2 * Math.PI * 48;
  const offset =
    circumference -
    (score / 100) * circumference;

  return (
    <div className="score-ring-wrap">
      <svg
        className="score-ring"
        width="122"
        height="122"
        viewBox="0 0 122 122"
      >
        <circle
          cx="61"
          cy="61"
          r="48"
          className="score-ring-bg"
        />
        <circle
          cx="61"
          cy="61"
          r="48"
          className={`score-ring-progress score-${level}`}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="score-ring-center">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function CommandCenter({
  target,
  findings,
  score,
  level,
  apiOnline,
  onNavigate,
  onTargetChange,
  onCollect,
  collecting,
  onNotify,
}: {
  target: string;
  findings: Finding[];
  score: number;
  level: RiskLevel;
  apiOnline: boolean;
  onNavigate: (page: Page) => void;
  onTargetChange: (target: string) => void;
  onCollect: () => void;
  collecting: boolean;
  onNotify: (message: string) => void;
}) {
  const highRisk = findings.filter(
    (finding) =>
      finding.severity === "critical" ||
      finding.severity === "high",
  ).length;

  const sourceCount = new Set(
    findings.map((finding) => finding.source),
  ).size;

  return (
    <>
      <PageHeader
        eyebrow="COMMAND CENTER"
        title="Investigation overview"
        description="A passive, evidence-first OSINT workspace for discovering, correlating and tracking public intelligence."
        actions={
          <Button
            variant="primary"
            icon={<Play size={15} />}
            onClick={() => onNavigate("collection")}
          >
            New collection
          </Button>
        }
      />

      <div className="command-banner">
        <div className="banner-content">
          <div className="banner-icon">
            <Radar size={19} />
          </div>

          <div>
            <strong>
              Passive intelligence mode
            </strong>
            <p>
              Collection is limited to publicly observable
              information and configured providers.
            </p>
          </div>
        </div>

        <div className="banner-status">
          <span
            className={`status-dot ${
              apiOnline ? "status-online" : ""
            }`}
          />
          {apiOnline
            ? "Collector ready"
            : "Collector unavailable"}
        </div>
      </div>

      <div className="hero-card">
        <div className="hero-main">
          <div className="hero-kicker">
            ACTIVE TARGET
          </div>

          <div className="hero-target">
            <Globe2 size={20} />
            <span>{target}</span>
          </div>

          <p>
            Last observation{" "}
            <strong>today at 21:12 IST</strong>. Sentinel
            currently holds {findings.length} normalized
            evidence records across {sourceCount} source
            types.
          </p>

          <div className="hero-actions">
            <Button
              variant="primary"
              icon={
                collecting ? (
                  <RefreshCw
                    size={15}
                    className="spin"
                  />
                ) : (
                  <Play size={15} />
                )
              }
              disabled={collecting}
              onClick={onCollect}
            >
              {collecting
                ? "Collecting..."
                : "Run collection"}
            </Button>

            <Button
              variant="secondary"
              icon={<Database size={15} />}
              onClick={() => onNavigate("evidence")}
            >
              View evidence
            </Button>
          </div>
        </div>

        <div className="hero-score">
          <ScoreRing
            score={score}
            level={level}
          />

          <div>
            <div className="score-label">
              EXPOSURE SCORE
            </div>
            <div className="score-level">
              <RiskBadge severity={level} />
            </div>
          </div>
        </div>
      </div>

      <div className="metrics-grid">
        <MetricCard
          label="Evidence records"
          value={findings.length}
          detail="Normalized observations"
          icon={<Database size={17} />}
        />

        <MetricCard
          label="High-risk signals"
          value={highRisk}
          detail="Requires analyst review"
          icon={<TriangleAlert size={17} />}
          trend={highRisk > 0 ? "up" : "neutral"}
        />

        <MetricCard
          label="Source types"
          value={sourceCount}
          detail="Independent intelligence sources"
          icon={<Layers3 size={17} />}
        />

        <MetricCard
          label="Confidence"
          value={`${Math.round(
            (findings.reduce(
              (sum, finding) =>
                sum + finding.confidence,
              0,
            ) /
              Math.max(findings.length, 1)) *
              100,
          )}%`}
          detail="Average evidence confidence"
          icon={<CheckCircle2 size={17} />}
        />
      </div>

      <div className="two-column">
        <section className="panel">
          <SectionTitle
            title="Recent intelligence"
            subtitle="Latest normalized observations"
            action={
              <button
                className="text-button"
                onClick={() => onNavigate("evidence")}
              >
                View ledger <ArrowUpRight size={14} />
              </button>
            }
          />

          <div className="finding-list">
            {findings.slice(0, 5).map((finding) => (
              <FindingRow
                key={finding.id}
                finding={finding}
              />
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionTitle
            title="Investigation posture"
            subtitle="Analyst-oriented controls"
          />

          <div className="posture-list">
            <PostureItem
              icon={<LockKeyhole size={16} />}
              title="Collection safety"
              detail="Passive-only"
              state="good"
            />

            <PostureItem
              icon={<Fingerprint size={16} />}
              title="Evidence integrity"
              detail="Hash-ready"
              state="good"
            />

            <PostureItem
              icon={<Network size={16} />}
              title="Correlation"
              detail="Entity graph enabled"
              state="good"
            />

            <PostureItem
              icon={<Clock3 size={16} />}
              title="Temporal analysis"
              detail="Snapshot comparison"
              state="good"
            />

            <PostureItem
              icon={<AlertTriangle size={16} />}
              title="Analyst review"
              detail={
                highRisk
                  ? `${highRisk} high-risk signals`
                  : "No urgent signals"
              }
              state={highRisk ? "warning" : "good"}
            />
          </div>
        </section>
      </div>

      <section className="panel">
        <SectionTitle
          title="Start a different investigation"
          subtitle="Switch targets without changing your collection profile"
        />

        <div className="target-row">
          <div className="target-input-wrap">
            <Search size={17} />
            <input
              value={target}
              onChange={(event) =>
                onTargetChange(event.target.value)
              }
              placeholder="example.com"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onCollect();
                }
              }}
            />
          </div>

          <Button
            variant="secondary"
            onClick={() => {
              if (!target.trim()) {
                onNotify("Enter a target first.");
                return;
              }

              onNotify(
                `Target set to ${target.trim()}.`,
              );
            }}
          >
            Set target
          </Button>
        </div>
      </section>
    </>
  );
}

function PostureItem({
  icon,
  title,
  detail,
  state,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  state: "good" | "warning";
}) {
  return (
    <div className="posture-item">
      <div className="posture-icon">{icon}</div>

      <div className="posture-copy">
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>

      {state === "good" ? (
        <CheckCircle2
          size={16}
          className="state-good"
        />
      ) : (
        <AlertTriangle
          size={16}
          className="state-warning"
        />
      )}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      {action}
    </div>
  );
}

function FindingRow({
  finding,
}: {
  finding: Finding;
}) {
  return (
    <div className="finding-row">
      <div className="finding-type-icon">
        {iconForFinding(finding.type)}
      </div>

      <div className="finding-main">
        <strong>{finding.title}</strong>
        <span>
          {finding.source} · {relativeTime(finding.observedAt)}
        </span>
      </div>

      <RiskBadge severity={finding.severity} />

      <div className="confidence">
        {Math.round(finding.confidence * 100)}%
      </div>
    </div>
  );
}

function Investigations({
  target,
  findings,
  snapshots,
  score,
  onNavigate,
  onTargetChange,
  onNotify,
}: {
  target: string;
  findings: Finding[];
  snapshots: Snapshot[];
  score: number;
  onNavigate: (page: Page) => void;
  onTargetChange: (target: string) => void;
  onNotify: (message: string) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="INVESTIGATIONS"
        title="Case workspace"
        description="Keep targets, snapshots, evidence and analyst decisions together."
        actions={
          <Button
            variant="primary"
            icon={<FolderKanban size={15} />}
            onClick={() =>
              onNotify(
                "Current workspace is already active.",
              )
            }
          >
            Active case
          </Button>
        }
      />

      <div className="case-grid">
        <div className="case-card case-active">
          <div className="case-card-top">
            <span className="case-status">
              ACTIVE
            </span>

            <span className="case-id">
              GM-{target
                .replace(/[^a-z0-9]/gi, "")
                .slice(0, 8)
                .toUpperCase()}
            </span>
          </div>

          <div className="case-target">
            <Globe2 size={19} />
            <strong>{target}</strong>
          </div>

          <p>
            Passive public-source investigation with
            evidence normalization and temporal tracking.
          </p>

          <div className="case-stats">
            <span>
              <strong>{findings.length}</strong> evidence
            </span>
            <span>
              <strong>{snapshots.length}</strong> snapshots
            </span>
            <span>
              <strong>{score}</strong> risk
            </span>
          </div>

          <Button
            variant="secondary"
            onClick={() => onNavigate("evidence")}
          >
            Open case
          </Button>
        </div>

        <div className="new-case-card">
          <div className="new-case-icon">
            <PlusIcon />
          </div>

          <h3>New investigation target</h3>

          <p>
            Create a fresh workspace by changing the
            target below.
          </p>

          <div className="target-input-wrap compact">
            <Search size={16} />
            <input
              value={target}
              onChange={(event) =>
                onTargetChange(event.target.value)
              }
              placeholder="example.com"
            />
          </div>

          <Button
            variant="primary"
            onClick={() => {
              if (!target.trim()) {
                onNotify("Enter a target first.");
                return;
              }

              onNotify(
                `Investigation target changed to ${target}.`,
              );
            }}
          >
            Use target
          </Button>
        </div>
      </div>

      <section className="panel">
        <SectionTitle
          title="Snapshot history"
          subtitle="Previous investigation states"
          action={
            <button
              className="text-button"
              onClick={() => onNavigate("timeline")}
            >
              Compare snapshots <ArrowUpRight size={14} />
            </button>
          }
        />

        <div className="snapshot-table">
          <div className="snapshot-head">
            <span>Timestamp</span>
            <span>Target</span>
            <span>Evidence</span>
            <span>Risk</span>
            <span>Status</span>
          </div>

          {snapshots.map((snapshot) => (
            <div
              className="snapshot-row"
              key={snapshot.id}
            >
              <span>{formatDate(snapshot.createdAt)}</span>
              <span>{snapshot.target}</span>
              <span>{snapshot.findingCount}</span>
              <span>{snapshot.riskScore}/100</span>
              <span>
                <span className="stable-pill">
                  <Check size={12} />
                  Stored
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CollectionStudio({
  target,
  profile,
  apiOnline,
  collecting,
  onTargetChange,
  onProfileChange,
  onCollect,
  onNotify,
}: {
  target: string;
  profile: Profile;
  apiOnline: boolean;
  collecting: boolean;
  onTargetChange: (target: string) => void;
  onProfileChange: (profile: Profile) => void;
  onCollect: () => void;
  onNotify: (message: string) => void;
}) {
  const profiles: {
    id: Profile;
    title: string;
    description: string;
    icon: ReactNode;
  }[] = [
    {
      id: "passive_domain",
      title: "Passive domain",
      description:
        "DNS, CT, RDAP and public web metadata.",
      icon: <Globe2 size={18} />,
    },
    {
      id: "web_intelligence",
      title: "Web intelligence",
      description:
        "Public HTTP metadata and defensive signals.",
      icon: <Eye size={18} />,
    },
    {
      id: "github_public",
      title: "GitHub public",
      description:
        "Public profiles, repositories and metadata.",
      icon: <GitBranch size={18} />,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="COLLECTION STUDIO"
        title="Build a collection run"
        description="Configure a passive collection profile, inspect its scope and execute it against the active target."
      />

      <div className="collection-layout">
        <section className="panel collection-main">
          <div className="collection-step">
            <div className="step-number">01</div>

            <div className="step-content">
              <h2>Investigation target</h2>
              <p>
                Enter a public domain or supported target.
              </p>

              <div className="target-input-wrap large">
                <Globe2 size={18} />
                <input
                  value={target}
                  onChange={(event) =>
                    onTargetChange(event.target.value)
                  }
                  placeholder="example.com"
                />
              </div>
            </div>
          </div>

          <div className="collection-divider" />

          <div className="collection-step">
            <div className="step-number">02</div>

            <div className="step-content">
              <h2>Collection profile</h2>
              <p>
                Choose which public-source collectors should
                run.
              </p>

              <div className="profile-grid">
                {profiles.map((item) => (
                  <button
                    key={item.id}
                    className={`profile-card ${
                      profile === item.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      onProfileChange(item.id)
                    }
                  >
                    <div className="profile-icon">
                      {item.icon}
                    </div>

                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </div>

                    {profile === item.id && (
                      <CheckCircle2
                        size={17}
                        className="profile-check"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="collection-divider" />

          <div className="collection-step">
            <div className="step-number">03</div>

            <div className="step-content">
              <h2>Execute</h2>
              <p>
                Start collection when the backend API is
                available.
              </p>

              <div className="execute-box">
                <div className="execute-status">
                  <span
                    className={`status-dot ${
                      apiOnline
                        ? "status-online"
                        : ""
                    }`}
                  />

                  <div>
                    <strong>
                      {apiOnline
                        ? "Backend collector ready"
                        : "Backend collector unavailable"}
                    </strong>

                    <span>
                      {apiOnline
                        ? "The API health endpoint responded successfully."
                        : "Deploy or start the FastAPI service before collecting."}
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  icon={
                    collecting ? (
                      <RefreshCw
                        size={16}
                        className="spin"
                      />
                    ) : (
                      <Play size={16} />
                    )
                  }
                  disabled={collecting}
                  onClick={onCollect}
                >
                  {collecting
                    ? "Running collection"
                    : "Run collection"}
                </Button>
              </div>
            </div>
          </div>
        </section>

        <aside className="collection-sidebar">
          <div className="panel">
            <SectionTitle
              title="Collection policy"
              subtitle="Safety boundary"
            />

            <div className="policy-list">
              <PolicyItem
                title="Public sources only"
                good
              />
              <PolicyItem
                title="No authentication bypass"
                good
              />
              <PolicyItem
                title="No credential collection"
                good
              />
              <PolicyItem
                title="No private network scanning"
                good
              />
              <PolicyItem
                title="Evidence provenance retained"
                good
              />
            </div>
          </div>

          <div className="panel">
            <SectionTitle
              title="Collector architecture"
              subtitle="Provider pipeline"
            />

            <div className="mini-flow">
              <MiniFlowItem
                number="01"
                label="Target"
              />
              <MiniFlowItem
                number="02"
                label="Providers"
              />
              <MiniFlowItem
                number="03"
                label="Evidence"
              />
              <MiniFlowItem
                number="04"
                label="Correlation"
              />
              <MiniFlowItem
                number="05"
                label="Risk"
              />
            </div>

            <button
              className="learn-button"
              onClick={() =>
                onNotify(
                  "Provider architecture is documented in docs/architecture.md.",
                )
              }
            >
              <CircleHelp size={15} />
              Learn how collection works
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}

function PolicyItem({
  title,
  good,
}: {
  title: string;
  good: boolean;
}) {
  return (
    <div className="policy-item">
      {good ? (
        <CheckCircle2
          size={15}
          className="state-good"
        />
      ) : (
        <XCircle
          size={15}
          className="state-warning"
        />
      )}

      <span>{title}</span>
    </div>
  );
}

function MiniFlowItem({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="mini-flow-item">
      <span>{number}</span>
      <strong>{label}</strong>
    </div>
  );
}

function EvidenceLedger({
  findings,
  onExportJson,
  onExportCsv,
  onNotify,
}: {
  findings: Finding[];
  onExportJson: () => void;
  onExportCsv: () => void;
  onNotify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<
    "all" | Severity
  >("all");

  const filtered = useMemo(() => {
    const normalizedQuery = query
      .trim()
      .toLowerCase();

    return findings.filter((finding) => {
      const matchesSeverity =
        severity === "all" ||
        finding.severity === severity;

      const matchesQuery =
        !normalizedQuery ||
        [
          finding.title,
          finding.description,
          finding.source,
          finding.category,
          finding.value ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesSeverity && matchesQuery;
    });
  }, [findings, query, severity]);

  return (
    <>
      <PageHeader
        eyebrow="EVIDENCE LEDGER"
        title="Evidence records"
        description="Every observation is normalized into a traceable evidence record with source, confidence and timestamp."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Download size={15} />}
              onClick={onExportCsv}
            >
              CSV
            </Button>

            <Button
              variant="primary"
              icon={<FileJson size={15} />}
              onClick={onExportJson}
            >
              JSON bundle
            </Button>
          </>
        }
      />

      <section className="panel">
        <div className="ledger-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search evidence..."
            />
          </div>

          <div className="filter-group">
            <Filter size={15} />

            <select
              value={severity}
              onChange={(event) =>
                setSeverity(
                  event.target.value as
                    | "all"
                    | Severity,
                )
              }
            >
              <option value="all">
                All severities
              </option>
              <option value="critical">
                Critical
              </option>
              <option value="high">High</option>
              <option value="medium">
                Medium
              </option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div className="ledger-count">
            {filtered.length} / {findings.length}
          </div>
        </div>

        <div className="evidence-table-wrap">
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Observation</th>
                <th>Source</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Observed</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map((finding) => (
                <tr key={finding.id}>
                  <td>
                    <div className="table-title">
                      <div className="table-icon">
                        {iconForFinding(
                          finding.type,
                        )}
                      </div>

                      <div>
                        <strong>
                          {finding.title}
                        </strong>
                        <span>
                          {finding.category} ·{" "}
                          {finding.value ??
                            "No value"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>{finding.source}</td>

                  <td>
                    <RiskBadge
                      severity={finding.severity}
                    />
                  </td>

                  <td>
                    <div className="confidence-bar">
                      <div>
                        <span
                          style={{
                            width: `${
                              finding.confidence *
                              100
                            }%`,
                          }}
                        />
                      </div>

                      <strong>
                        {Math.round(
                          finding.confidence * 100,
                        )}
                        %
                      </strong>
                    </div>
                  </td>

                  <td>
                    <span className="muted">
                      {relativeTime(
                        finding.observedAt,
                      )}
                    </span>
                  </td>

                  <td>
                    <button
                      className="row-action"
                      title="Copy evidence ID"
                      onClick={() => {
                        void navigator.clipboard?.writeText(
                          finding.id,
                        );

                        onNotify(
                          "Evidence ID copied.",
                        );
                      }}
                    >
                      <Copy size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && (
          <div className="empty-state">
            <Search size={24} />
            <strong>No evidence matches</strong>
            <span>
              Try changing the search query or severity
              filter.
            </span>
          </div>
        )}
      </section>
    </>
  );
}

function IntelligenceGraph({
  target,
  findings,
}: {
  target: string;
  findings: Finding[];
}) {
  const graphNodes = useMemo(() => {
    const nodes = [
      {
        id: "target",
        label: target,
        type: "TARGET",
        x: 50,
        y: 50,
        primary: true,
      },
    ];

    findings.slice(0, 7).forEach((finding, index) => {
      const angle =
        (index / Math.max(findings.length, 1)) *
        Math.PI *
        2;

      const radius = 30;

      nodes.push({
        id: finding.id,
        label:
          finding.value ||
          finding.title.slice(0, 24),
        type: finding.type.toUpperCase(),
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        primary: false,
      });
    });

    return nodes;
  }, [findings, target]);

  return (
    <>
      <PageHeader
        eyebrow="INTELLIGENCE GRAPH"
        title="Entity relationship map"
        description="A visual representation of the target and its observed public intelligence relationships."
      />

      <section className="graph-layout">
        <div className="graph-panel">
          <div className="graph-toolbar">
            <div>
              <span className="graph-status-dot" />
              Live evidence graph
            </div>

            <span>
              {graphNodes.length} nodes
            </span>
          </div>

          <div className="graph-canvas">
            <div className="graph-grid" />

            <div className="graph-lines">
              {graphNodes
                .slice(1)
                .map((node) => (
                  <div
                    key={node.id}
                    className="graph-line"
                    style={{
                      left: "50%",
                      top: "50%",
                      width: `${Math.sqrt(
                        Math.pow(node.x - 50, 2) +
                          Math.pow(
                            node.y - 50,
                            2,
                          ),
                      )}%`,
                      transform: `rotate(${
                        (Math.atan2(
                          node.y - 50,
                          node.x - 50,
                        ) *
                          180) /
                        Math.PI
                      }deg)`,
                    }}
                  />
                ))}
            </div>

            {graphNodes.map((node) => (
              <div
                className={`graph-node ${
                  node.primary ? "primary" : ""
                }`}
                key={node.id}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                }}
              >
                <div className="graph-node-dot">
                  {node.primary ? (
                    <Target size={17} />
                  ) : (
                    <Link2 size={14} />
                  )}
                </div>

                <div className="graph-node-label">
                  <strong>{node.label}</strong>
                  <span>{node.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="panel graph-inspector">
          <SectionTitle
            title="Graph interpretation"
            subtitle="How to read relationships"
          />

          <div className="graph-legend">
            <LegendItem
              title="Target"
              description="Primary investigation entity"
              icon={<Target size={15} />}
            />

            <LegendItem
              title="Observation"
              description="Evidence linked to target"
              icon={<Database size={15} />}
            />

            <LegendItem
              title="Provider"
              description="Source that produced evidence"
              icon={<Radar size={15} />}
            />
          </div>

          <div className="insight-box">
            <Zap size={16} />

            <div>
              <strong>
                Correlation insight
              </strong>
              <p>
                The graph is derived from normalized
                evidence records rather than arbitrary
                visual relationships.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </>
  );
}

function LegendItem({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="legend-item">
      <div>{icon}</div>

      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </div>
  );
}

function TimelinePage({
  snapshots,
  timeline,
  findings,
}: {
  snapshots: Snapshot[];
  timeline: TimelineEvent[];
  findings: Finding[];
}) {
  const changes = timeline.filter(
    (event) =>
      event.kind === "changed" ||
      event.kind === "discovered" ||
      event.kind === "removed",
  );

  return (
    <>
      <PageHeader
        eyebrow="TIMELINE & DIFF"
        title="Temporal intelligence"
        description="Track how public observations change between collection snapshots."
      />

      <div className="timeline-summary">
        <MetricCard
          label="Snapshots"
          value={snapshots.length}
          detail="Stored investigation states"
          icon={<Clock3 size={17} />}
        />

        <MetricCard
          label="Changes"
          value={changes.length}
          detail="Detected temporal events"
          icon={<Activity size={17} />}
        />

        <MetricCard
          label="Current evidence"
          value={findings.length}
          detail="Latest normalized records"
          icon={<Database size={17} />}
        />
      </div>

      <div className="timeline-layout">
        <section className="panel">
          <SectionTitle
            title="Event stream"
            subtitle="Chronological evidence changes"
          />

          <div className="timeline-list">
            {timeline.map((event) => (
              <TimelineItem
                key={event.id}
                event={event}
              />
            ))}
          </div>

          {!timeline.length && (
            <div className="empty-state">
              <Clock3 size={24} />
              <strong>
                No temporal events yet
              </strong>
              <span>
                Run another collection to establish a
                comparison point.
              </span>
            </div>
          )}
        </section>

        <section className="panel">
          <SectionTitle
            title="Snapshot comparison"
            subtitle="Latest stored states"
          />

          <div className="snapshot-compare">
            {snapshots
              .slice(0, 5)
              .map((snapshot, index) => (
                <div
                  className="compare-row"
                  key={snapshot.id}
                >
                  <div className="compare-index">
                    {String(index + 1).padStart(
                      2,
                      "0",
                    )}
                  </div>

                  <div className="compare-main">
                    <strong>
                      {snapshot.target}
                    </strong>
                    <span>
                      {formatDate(
                        snapshot.createdAt,
                      )}
                    </span>
                  </div>

                  <div className="compare-value">
                    <strong>
                      {snapshot.findingCount}
                    </strong>
                    <span>evidence</span>
                  </div>

                  <div className="compare-risk">
                    {snapshot.riskScore}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </>
  );
}

function TimelineItem({
  event,
}: {
  event: TimelineEvent;
}) {
  const icon =
    event.kind === "discovered" ? (
      <ArrowUpRight size={14} />
    ) : event.kind === "removed" ? (
      <ArrowDownRight size={14} />
    ) : event.kind === "changed" ? (
      <Activity size={14} />
    ) : (
      <Check size={14} />
    );

  return (
    <div className="timeline-item">
      <div
        className={`timeline-icon timeline-${event.kind}`}
      >
        {icon}
      </div>

      <div className="timeline-copy">
        <div className="timeline-title-row">
          <strong>{event.title}</strong>
          <RiskBadge severity={event.severity} />
        </div>

        <p>{event.description}</p>

        <span>
          {formatDate(event.timestamp)}
        </span>
      </div>
    </div>
  );
}

function RiskExposure({
  findings,
  score,
  level,
}: {
  findings: Finding[];
  score: number;
  level: RiskLevel;
}) {
  const counts = {
    critical: findings.filter(
      (finding) => finding.severity === "critical",
    ).length,
    high: findings.filter(
      (finding) => finding.severity === "high",
    ).length,
    medium: findings.filter(
      (finding) => finding.severity === "medium",
    ).length,
    low: findings.filter(
      (finding) => finding.severity === "low",
    ).length,
    info: findings.filter(
      (finding) => finding.severity === "info",
    ).length,
  };

  const drivers = [...findings]
    .sort(
      (a, b) =>
        severityWeight(b.severity) *
          b.confidence -
        severityWeight(a.severity) *
          a.confidence,
    )
    .slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="RISK & EXPOSURE"
        title="Exposure intelligence"
        description="Translate evidence into an explainable prioritization model rather than an opaque security score."
      />

      <div className="risk-overview">
        <section className="risk-score-panel panel">
          <div>
            <div className="eyebrow">
              CURRENT EXPOSURE
            </div>
            <h2>{score}/100</h2>

            <p>
              Current analytical classification:
            </p>

            <RiskBadge severity={level} />
          </div>

          <ScoreRing
            score={score}
            level={level}
          />
        </section>

        <section className="panel">
          <SectionTitle
            title="Severity distribution"
            subtitle="Evidence by priority"
          />

          <div className="severity-bars">
            <SeverityBar
              label="Critical"
              count={counts.critical}
              total={findings.length}
              severity="critical"
            />
            <SeverityBar
              label="High"
              count={counts.high}
              total={findings.length}
              severity="high"
            />
            <SeverityBar
              label="Medium"
              count={counts.medium}
              total={findings.length}
              severity="medium"
            />
            <SeverityBar
              label="Low"
              count={counts.low}
              total={findings.length}
              severity="low"
            />
            <SeverityBar
              label="Informational"
              count={counts.info}
              total={findings.length}
              severity="info"
            />
          </div>
        </section>
      </div>

      <section className="panel">
        <SectionTitle
          title="Risk drivers"
          subtitle="Evidence contributing most strongly to prioritization"
        />

        <div className="risk-driver-list">
          {drivers.map((finding, index) => (
            <div
              className="risk-driver"
              key={finding.id}
            >
              <div className="driver-rank">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className="driver-icon">
                {iconForFinding(finding.type)}
              </div>

              <div className="driver-main">
                <strong>{finding.title}</strong>
                <span>
                  {finding.source} ·{" "}
                  {Math.round(
                    finding.confidence * 100,
                  )}
                  % confidence
                </span>
              </div>

              <RiskBadge severity={finding.severity} />

              <div className="driver-impact">
                {Math.round(
                  severityWeight(
                    finding.severity,
                  ) * finding.confidence,
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <SectionTitle
            title="Analyst interpretation"
            subtitle="Explainable decision support"
          />

          <div className="analyst-note">
            <Info size={18} />

            <div>
              <strong>
                Score is not a vulnerability verdict
              </strong>

              <p>
                GhostMode Sentinel uses severity,
                confidence and evidence context to
                prioritize analyst attention. A high
                score does not automatically mean a system
                is compromised or vulnerable.
              </p>
            </div>
          </div>
        </section>

        <section className="panel">
          <SectionTitle
            title="Recommended workflow"
            subtitle="What to do next"
          />

          <div className="workflow-list">
            <WorkflowStep
              number="01"
              title="Validate"
              description="Review the underlying evidence."
            />
            <WorkflowStep
              number="02"
              title="Correlate"
              description="Check related entities and sources."
            />
            <WorkflowStep
              number="03"
              title="Compare"
              description="Run another snapshot when appropriate."
            />
            <WorkflowStep
              number="04"
              title="Report"
              description="Export only verified observations."
            />
          </div>
        </section>
      </div>
    </>
  );
}

function SeverityBar({
  label,
  count,
  total,
  severity,
}: {
  label: string;
  count: number;
  total: number;
  severity: Severity;
}) {
  const percentage =
    total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="severity-bar-row">
      <div className="severity-bar-label">
        <RiskBadge severity={severity} />
        <strong>{count}</strong>
      </div>

      <div className="severity-bar-track">
        <div
          className={`severity-bar-fill fill-${severity}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <span>{Math.round(percentage)}%</span>
    </div>
  );
}

function WorkflowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="workflow-step">
      <span>{number}</span>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <ChevronRight size={15} />
    </div>
  );
}

function Reports({
  target,
  findings,
  snapshots,
  timeline,
  onExportJson,
  onExportCsv,
  onExportStix,
  onNotify,
}: {
  target: string;
  findings: Finding[];
  snapshots: Snapshot[];
  timeline: TimelineEvent[];
  onExportJson: () => void;
  onExportCsv: () => void;
  onExportStix: () => void;
  onNotify: (message: string) => void;
}) {
  const score = calculateRiskScore(findings);

  function downloadBrief() {
    const highPriority = findings.filter(
      (finding) =>
        finding.severity === "critical" ||
        finding.severity === "high",
    );

    const lines = [
      "GHOSTMODE SENTINEL — ANALYST BRIEF",
      "",
      `Target: ${target}`,
      `Generated: ${formatDate(nowIso())}`,
      `Risk score: ${score}/100`,
      `Evidence records: ${findings.length}`,
      `Snapshots: ${snapshots.length}`,
      "",
      "EXECUTIVE SUMMARY",
      "GhostMode Sentinel identified publicly observable intelligence records associated with the target. This report is intended for analyst review and does not constitute a vulnerability assessment.",
      "",
      "HIGH PRIORITY OBSERVATIONS",
      ...(
        highPriority.length
          ? highPriority
          : findings.slice(0, 3)
      ).map(
        (finding, index) =>
          `${index + 1}. ${finding.title} — ${finding.severity.toUpperCase()} — ${Math.round(
            finding.confidence * 100,
          )}% confidence`,
      ),
      "",
      "TEMPORAL ACTIVITY",
      `Detected timeline events: ${timeline.length}`,
      "",
      "METHODOLOGY",
      "Passive public-source collection. No authentication bypass, credential collection, exploitation or private network scanning.",
    ];

    downloadText(
      `ghostmode-${target.replace(
        /[^a-z0-9.-]/gi,
        "-",
      )}-analyst-brief.txt`,
      lines.join("\n"),
    );

    onNotify("Analyst brief downloaded.");
  }

  return (
    <>
      <PageHeader
        eyebrow="REPORTS & EXPORT"
        title="Investigation outputs"
        description="Package evidence, analysis and temporal context for downstream review."
      />

      <div className="report-grid">
        <ReportCard
          icon={<FileText size={19} />}
          title="Analyst brief"
          description="Human-readable executive summary with key observations and methodology."
          action="Download brief"
          onClick={downloadBrief}
        />

        <ReportCard
          icon={<FileJson size={19} />}
          title="Investigation JSON"
          description="Complete case package containing evidence, snapshots and timeline events."
          action="Export JSON"
          onClick={onExportJson}
        />

        <ReportCard
          icon={<Download size={19} />}
          title="Evidence CSV"
          description="Flat evidence dataset suitable for spreadsheets, SQL or analytical workflows."
          action="Export CSV"
          onClick={onExportCsv}
        />

        <ReportCard
          icon={<Network size={19} />}
          title="STIX 2.1 bundle"
          description="Structured intelligence package for downstream threat-intelligence workflows."
          action="Export STIX"
          onClick={onExportStix}
        />
      </div>

      <section className="panel">
        <SectionTitle
          title="Report quality checklist"
          subtitle="Before sharing an investigation"
        />

        <div className="report-checklist">
          <ChecklistItem
            title="Evidence has a source"
            description="Every normalized observation retains provider information."
          />

          <ChecklistItem
            title="Confidence is explicit"
            description="Confidence is recorded independently from severity."
          />

          <ChecklistItem
            title="Temporal context is available"
            description="Snapshots can be compared rather than treated as permanent truth."
          />

          <ChecklistItem
            title="Methodology is disclosed"
            description="The report clearly identifies the passive-public collection boundary."
          />

          <ChecklistItem
            title="Analyst verification remains required"
            description="Automated findings are decision support, not final conclusions."
          />
        </div>
      </section>

      <section className="report-footer-note">
        <ShieldCheck size={18} />

        <div>
          <strong>
            Evidence-first reporting
          </strong>

          <p>
            Exported data is generated locally in your
            browser from the current investigation state.
            Validate findings before using them in
            operational or professional decisions.
          </p>
        </div>
      </section>
    </>
  );
}

function ReportCard({
  icon,
  title,
  description,
  action,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="report-card">
      <div className="report-icon">
        {icon}
      </div>

      <h3>{title}</h3>
      <p>{description}</p>

      <button
        className="report-action"
        onClick={onClick}
      >
        {action}
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}

function ChecklistItem({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="checklist-item">
      <div className="checklist-icon">
        <Check size={14} />
      </div>

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

const rootElement =
  document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "GhostMode Sentinel: #root element was not found.",
  );
}

createRoot(rootElement).render(<App />);
