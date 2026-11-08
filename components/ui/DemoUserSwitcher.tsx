"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dropdown } from "@/components/ui/forms/Dropdown";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: "employee" | "admin";
};

export function DemoUserSwitcher({
  initialUsers,
  initialCurrentUser,
}: {
  initialUsers: DemoUser[];
  initialCurrentUser: DemoUser;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [currentEmail, setCurrentEmail] = useState(initialCurrentUser.email);

  useEffect(
    () => setCurrentEmail(initialCurrentUser.email),
    [initialCurrentUser.email],
  );

  async function handleChange(email: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/demo-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Unable to switch role. Please retry.");
      setCurrentEmail(email);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to switch role.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="actions">
      <span className="muted">Viewing as</span>
      <Dropdown
        label="Viewing as"
        disabled={pending}
        value={currentEmail}
        onChange={(email) => void handleChange(email)}
        options={initialUsers.map((user) => ({
          value: user.email,
          label: `${user.name} (${user.role})`,
          description:
            user.role === "admin"
              ? "Review requests and manage stock"
              : "Request supplies and track progress",
        }))}
      />
      {pending ? (
        <span className="sr-only" role="status">
          Switching role…
        </span>
      ) : null}
      {error ? <span role="alert">{error}</span> : null}
    </div>
  );
}
