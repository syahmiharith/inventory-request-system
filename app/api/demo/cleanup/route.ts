import { NextResponse } from "next/server";
import { cleanupExpiredWorkspaces } from "@/lib/demo-session";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return new Response("Unauthorized", { status: 401 });
  const deleted = await cleanupExpiredWorkspaces();
  console.info("Demo cleanup completed", { deleted });
  return NextResponse.json({ deleted });
}
