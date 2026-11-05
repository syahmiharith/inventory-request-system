import { redirect } from "next/navigation";
import { DomainError } from "@/lib/errors";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentUserForShell, getDemoUsersForShell } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [currentUser, demoUsers] = await Promise.all([
    getCurrentUserForShell().catch((error) => {
      if (error instanceof DomainError && error.statusCode === 410)
        redirect("/api/demo/start");
      throw error;
    }),
    getDemoUsersForShell().catch((error) => {
      if (error instanceof DomainError && error.statusCode === 410)
        redirect("/api/demo/start");
      throw error;
    }),
  ]);

  return (
    <AppShell currentUser={currentUser} demoUsers={demoUsers}>
      {children}
    </AppShell>
  );
}
