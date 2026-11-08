import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Metric = {
  label: string;
  count: number;
  color: string;
  href: string;
  active?: boolean;
};

export function MetricOverview({
  label,
  total,
  noun,
  metrics,
  note,
}: {
  label: string;
  total: number;
  noun: string;
  metrics: Metric[];
  note?: string;
}) {
  const unit = (count: number) =>
    count === 1 ? (noun === "supplies" ? "supply" : "request") : noun;
  return (
    <section className="tab-metric-overview" aria-label={label}>
      <div className="tab-metric-heading">
        <strong>{label}</strong>
        <span>
          {total} {unit(total)} · all records
        </span>
      </div>
      <div className="tab-metric-grid">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className={`tab-metric${metric.active ? " is-active" : ""}`}
            aria-label={`Show ${metric.label.toLowerCase()}: ${metric.count} ${unit(metric.count)}`}
          >
            <span className="tab-metric-label">
              <i style={{ background: metric.color }} />
              {metric.label}
              <ArrowUpRight size={14} aria-hidden="true" />
            </span>
            <div className="tab-metric-value">
              <strong>{metric.count}</strong>
              <span>
                {total ? Math.round((metric.count / total) * 100) : 0}%
              </span>
            </div>
            <div className="tab-metric-track" aria-hidden="true">
              <span
                style={{
                  width: `${total ? (metric.count / total) * 100 : 0}%`,
                  background: metric.color,
                }}
              />
            </div>
          </Link>
        ))}
      </div>
      {note ? <p className="chart-note">{note}</p> : null}
    </section>
  );
}
