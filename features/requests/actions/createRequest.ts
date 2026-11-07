"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { revalidateRequestReads } from "@/lib/cache-tags";
import { createRequest } from "@/features/requests/services/request.service";
import { DomainError } from "@/lib/errors";

export type CreateRequestState = {
  errors?: Record<string, string>;
  message?: string;
  requestId?: string;
};

export async function createInventoryRequestAction(
  _previousState: CreateRequestState,
  formData: FormData,
): Promise<CreateRequestState> {
  const requesterName = String(formData.get("requesterName") ?? "").trim();

  if (!requesterName) {
    return { errors: { requesterName: "Requester name is required." } };
  }

  let createdId = "";
  try {
    const actor = await getCurrentUser();
    const itemIds = formData.getAll("itemId");
    const quantities = formData.getAll("quantityRequested");
    const requestItems = itemIds
      .map((itemId, index) => ({
        itemId: String(itemId ?? "").trim(),
        quantityRequested: numberFromForm(quantities[index] ?? null),
      }))
      .filter((item) => item.itemId.length > 0);

    if (requestItems.length === 0) {
      return { errors: { form: "Add at least one inventory item." } };
    }

    const duplicateItem = requestItems.find(
      (item, index) =>
        requestItems.findIndex((entry) => entry.itemId === item.itemId) !==
        index,
    );

    if (duplicateItem) {
      return {
        errors: {
          form: "Each item can only appear once. Combine duplicate quantities into one line.",
        },
      };
    }

    const request = await createRequest(
      {
        key: formData.get("key") || undefined,
        department: actor.department,
        warehouse: "Main Warehouse",
        requiredBy:
          formData.get("requiredBy") ||
          new Date(new Date().setUTCHours(0, 0, 0, 0) + 7 * 86400000),
        priority: "normal",
        reason: formData.get("reason"),
        items: requestItems,
      },
      actor,
    );
    createdId = request.id;
    revalidateRequestReads(request.id);
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/requests");
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        errors: Object.fromEntries(
          error.issues.map((issue) => [
            issue.path.join(".") || "form",
            issue.message,
          ]),
        ),
      };
    }

    if (error instanceof DomainError) return { message: error.message };
    console.error("Unable to confirm inventory request creation");
    return {
      message:
        "Unable to confirm your request. Your values are kept. Please try again.",
    };
  }
  return { requestId: createdId };
}

function numberFromForm(value: FormDataEntryValue | null) {
  return value === null || value === "" ? Number.NaN : Number(value);
}
