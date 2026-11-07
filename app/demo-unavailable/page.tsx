import { DemoUnavailable } from "@/components/ui/DemoUnavailable";

export default async function DemoStartUnavailable({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <DemoUnavailable
      reason={reason === "busy" ? "busy" : "unavailable"}
      startNewSession
    />
  );
}
