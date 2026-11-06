import { redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { AppShell } from "@/components/layout/AppShell";
import { DemoUnavailable } from "@/components/ui/DemoUnavailable";
import { getCurrentUserForShell, getDemoUsersForShell } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let identity;
  try {
    identity = await Promise.all([
      getCurrentUserForShell(),
      getDemoUsersForShell(),
    ]);
  } catch (error) {
    if (error instanceof DomainError && error.statusCode === 410)
      redirect("/api/demo/start");
    console.error("Unable to load inventory demo session");
    return <DemoUnavailable />;
  }
  const [currentUser, demoUsers] = identity;
  return (
    <AppShell currentUser={currentUser} demoUsers={demoUsers}>
      {children}
    </AppShell>
  );
}
