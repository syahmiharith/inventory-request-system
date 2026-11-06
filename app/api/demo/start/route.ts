import { NextResponse } from "next/server";
import {
  createWorkspace,
  hashToken,
  rateLimit,
  workspaceCookie,
} from "@/lib/demo-session";
import { handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    await rateLimit(`create:${hashToken(ip)}`, 30, 3600);
    await rateLimit("create:global:daily", 100, 86400);
    const { token } = await createWorkspace();
    const response = new NextResponse(null, {
      status: 303,
      headers: { Location: "/", "Cache-Control": "no-store" },
    });
    response.cookies.set(workspaceCookie, token, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production" && process.env.VERCEL === "1",
      path: "/",
      maxAge: 86400,
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
