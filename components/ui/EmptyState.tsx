import type { ReactNode } from "react";

export function EmptyState({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="empty-state-card" role="status">
      {title ? <h3>{title}</h3> : null}
      <p>{children}</p>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
