import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { recordStockReceived } from "@/features/requests/services/stock-receipt.service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await context.params;
    await recordStockReceived(
      { ...(await request.json()), requestId: id },
      actor,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
