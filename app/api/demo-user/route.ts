import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getScopedDb } from "@/db/scoped";
import { demoWorkspaces, users } from "@/db/schema";
import { getCurrentUser, getDemoUsers } from "@/lib/auth";
import { getWorkspace, rateLimit } from "@/lib/demo-session";
import { NotFoundError } from "@/lib/errors";
import { handleRouteError } from "@/lib/http";

export async function GET() {
  try {
    return NextResponse.json({
      users: await getDemoUsers(),
      currentUser: await getCurrentUser(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
export async function POST(request: Request) {
  try {
    const workspace = await getWorkspace();
    await rateLimit(`role:${workspace.id}`, 60, 60);
    const body = await request.json();
    const [user] = await (
      await getScopedDb()
    )
      .select()
      .from(users)
      .where(eq(users.email, body.email ?? ""))
      .limit(1);
    if (!user) throw new NotFoundError("Demo user not found.");
    await db
      .update(demoWorkspaces)
      .set({ role: user.role })
      .where(eq(demoWorkspaces.id, workspace.id));
    return NextResponse.json({ currentUser: user });
  } catch (error) {
    return handleRouteError(error);
  }
}
