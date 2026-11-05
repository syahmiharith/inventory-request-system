"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { revalidateRequestReads } from "@/lib/cache-tags";
import { recordStockReceived } from "../services/stock-receipt.service";

export async function recordStockReceivedAction(formData: FormData) {
  const actor = await requireAdmin();
  const requestId = z.string().uuid().parse(formData.get("requestId"));
  let message = "Stock received. Review availability and issue the request.";
  let result = "success";
  try {
    await recordStockReceived(Object.fromEntries(formData), actor);
  } catch (error) {
    result = "error";
    message =
      error instanceof Error
        ? error.message
        : "Unable to record stock. Retry this delivery.";
  }
  revalidateRequestReads(requestId);
  for (const path of ["/", "/dashboard", "/inventory", "/requests"])
    revalidatePath(path);
  return { ok: result === "success", message };
}
