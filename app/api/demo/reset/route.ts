import { NextResponse } from "next/server";
import {
  getWorkspace,
  deleteWorkspace,
  workspaceCookie,
} from "@/lib/demo-session";
import { handleRouteError } from "@/lib/http";

export async function POST() {
  try {
    await deleteWorkspace((await getWorkspace()).id);
    const response = NextResponse.json({ ok: true });
    response.cookies.delete(workspaceCookie);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
