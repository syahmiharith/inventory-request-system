import { vi, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { demoWorkspaces } from "@/db/schema";
const state = vi.hoisted(() => ({ token: "" }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => ({ value: state.token }) }),
}));
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
} from "@/lib/demo-session";

it("validates the opaque session against server expiry and rejects fabricated tokens", async () => {
  const session = await createWorkspace();
  try {
    state.token = session.token;
    expect((await getWorkspace()).id).toBe(session.workspace.id);
    await db
      .update(demoWorkspaces)
      .set({ expiresAt: new Date(0) })
      .where(eq(demoWorkspaces.id, session.workspace.id));
    await expect(getWorkspace()).rejects.toMatchObject({ statusCode: 410 });
    state.token = "forged";
    await expect(getWorkspace()).rejects.toMatchObject({ statusCode: 410 });
  } finally {
    await deleteWorkspace(session.workspace.id);
  }
});
