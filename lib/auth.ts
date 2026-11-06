import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { getScopedDb } from "@/db/scoped";
import { users, type User } from "@/db/schema";
import { AuthorizationError, NotFoundError } from "./errors";
import { getWorkspace } from "./demo-session";

export const getDemoUsers = cache(async () =>
  (await getScopedDb()).select().from(users).orderBy(users.role, users.name),
);
export const getDemoUsersForShell = getDemoUsers;
export const getCurrentUser = cache(async (): Promise<User> => {
  const workspace = await getWorkspace();
  const [user] = await (
    await getScopedDb()
  )
    .select()
    .from(users)
    .where(
      and(eq(users.workspaceId, workspace.id), eq(users.role, workspace.role)),
    )
    .limit(1);
  if (!user)
    throw new NotFoundError(
      "Demo identity was not found. Reset your demo to start again.",
    );
  return user;
});
export const getCurrentUserForShell = getCurrentUser;
export async function requireAdmin() {
  const user = await getCurrentUser();
  assertAdminRole(user.role);
  return user;
}
export function assertAdminRole(role: User["role"]) {
  if (role !== "admin") throw new AuthorizationError();
}
