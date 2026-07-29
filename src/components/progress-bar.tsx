"use client";

const ALL_FIELDS = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "priority", label: "Priority" },
  { key: "customer_email", label: "Email" },
];

export default function ProgressBar({ collected }: { collected: string[] }) {
  const collectedCount = ALL_FIELDS.filter((f) => collected.includes(f.key)).length;

  return (
    <div className="progress-section">
      <div className="progress-header">
        <span className="progress-label">
          Ticket fields: {collectedCount} / {ALL_FIELDS.length} collected
        </span>
        <span className="progress-pct">{Math.round((collectedCount / ALL_FIELDS.length) * 100)}%</span>
      </div>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${(collectedCount / ALL_FIELDS.length) * 100}%` }}
        />
      </div>
      <div className="progress-fields">
        {ALL_FIELDS.map((f) => (
          <span
            key={f.key}
            className={`field-chip ${collected.includes(f.key) ? "collected" : "missing"}`}
          >
            {collected.includes(f.key) ? "✓" : "○"} {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}
