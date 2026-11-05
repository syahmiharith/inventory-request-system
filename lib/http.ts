import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "./errors";

export function handleRouteError(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  console.error("Inventory demo operation failed");
  return NextResponse.json(
    {
      error:
        "Service unavailable. Your operation could not be confirmed. Refresh and retry.",
    },
    { status: 503 },
  );
}
