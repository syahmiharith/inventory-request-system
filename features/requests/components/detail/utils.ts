import type { RequestDetail } from "./types";

export function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function humanize(value: string) {
  if (value === "request_fulfilled") return "Request Issued";
  if (value === "fulfilled") return "Issued";
  return value.split("_").map(capitalize).join(" ");
}

export function timelineTone(action: string) {
  if (action.includes("approved")) return "is-approved";
  if (action.includes("rejected")) return "is-rejected";
  if (action.includes("fulfilled")) return "is-fulfilled";
  if (action.includes("created")) return "is-created";
  return "is-system";
}

export function formatHistoryMeta(
  entry: NonNullable<RequestDetail>["requestHistory"][number],
) {
  const transition =
    entry.fromStatus || entry.toStatus
      ? ` · ${humanize(entry.fromStatus ?? "new")} to ${humanize(entry.toStatus ?? "none")}`
      : "";

  const movement =
    typeof entry.metadata.before === "number" &&
    typeof entry.metadata.after === "number"
      ? ` · Stock ${entry.metadata.before} → ${entry.metadata.after}`
      : "";
  return `${entry.actorName} · ${entry.actorRole}${transition}${movement}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
