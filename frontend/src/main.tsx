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
