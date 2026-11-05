import { NextResponse } from "next/server";
import { lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { demoWorkspaces } from "@/db/schema";
import { deleteWorkspace } from "@/lib/demo-session";

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return new Response("Unauthorized", { status: 401 });
  const expired = await db
    .select()
    .from(demoWorkspaces)
    .where(lt(demoWorkspaces.expiresAt, new Date()))
    .limit(100);
  for (const workspace of expired) await deleteWorkspace(workspace.id);
  await db.execute(sql`delete from demo_rate_limits where resets_at < now()`);
  return NextResponse.json({ deleted: expired.length });
}
