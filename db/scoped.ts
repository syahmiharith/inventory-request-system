import { and, eq, type SQL } from "drizzle-orm";
import { db, type DbClient } from "@/db";
import { LEGACY_WORKSPACE_ID } from "./schema";
import { getWorkspace, rateLimit } from "@/lib/demo-session";

// Apply ownership at the data-access boundary, including callers with no filters.
// Drizzle's fluent builders are mutable. Reapply scope when callers supply where().
type Callable = (...args: unknown[]) => unknown;
type Builder = Record<string, unknown>;
export function scopedClient(client: Builder, workspaceId: string): DbClient {
  function wrap(builder: Builder, condition?: SQL, insert = false): Builder {
    return new Proxy(builder, {
      get(target, property) {
        const value = Reflect.get(target, property);
        if (typeof value !== "function") return value;
        if (
          property === "then" ||
          property === "catch" ||
          property === "finally"
        )
          return value.bind(target);
        return (...args: unknown[]) => {
          if (property === "where" && condition)
            args = [and(condition, args[0] as SQL | undefined)];
          if (property === "values" && insert) {
            const rows = Array.isArray(args[0]) ? args[0] : [args[0]];
            const owned = rows.map((row) => ({
              ...(row as object),
              workspaceId,
            }));
            args = [Array.isArray(args[0]) ? owned : owned[0]];
          }
          const result = (value as Callable).apply(target, args) as Builder;
          if (!result || typeof result !== "object") return result;
          if (property === "from" || property === "set") {
            const table =
              property === "from" ? (args[0] as Builder) : undefined;
            if (property === "from" && !table?.workspaceId)
              throw new Error("Demo reads require workspace ownership.");
            const scope = table?.workspaceId
              ? eq(table.workspaceId as Parameters<typeof eq>[0], workspaceId)
              : condition;
            if (scope && typeof result.where === "function")
              (result.where as Callable).call(result, scope);
            return wrap(result, scope, insert);
          }
          return wrap(result, condition, insert);
        };
      },
    });
  }
  return new Proxy(client, {
    get(target, property) {
      const value = Reflect.get(target, property);
      if (typeof value !== "function") return value;
      if (property === "transaction")
        return (callback: (tx: DbClient) => unknown) =>
          (value as Callable).call(target, (tx: Builder) =>
            callback(scopedClient(tx, workspaceId)),
          );
      return (...args: unknown[]) => {
        const result = (value as Callable).apply(target, args) as Builder;
        if (["insert", "update", "delete"].includes(String(property))) {
          const table = args[0] as Builder;
          if (!table.workspaceId)
            throw new Error("Demo writes require workspace ownership.");
          const scope = eq(
            table.workspaceId as Parameters<typeof eq>[0],
            workspaceId,
          );
          if (property === "delete")
            (result.where as Callable).call(result, scope);
          return wrap(result, scope, property === "insert");
        }
        if (String(property).startsWith("select")) return wrap(result);
        return result;
      };
    },
  }) as unknown as DbClient;
}

export async function getScopedDb() {
  const workspaceId =
    process.env.NODE_ENV === "test"
      ? LEGACY_WORKSPACE_ID
      : (await getWorkspace()).id;
  return scopedClient(db as unknown as Builder, workspaceId);
}

export async function limitMutation() {
  if (process.env.NODE_ENV !== "test")
    await rateLimit(`mutation:${(await getWorkspace()).id}`, 120, 60);
}
