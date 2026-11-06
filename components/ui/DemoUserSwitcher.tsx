"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Select } from "@/components/ui/forms/Select";

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
    <label className="actions">
      <span className="muted">Viewing as</span>
      <Select
        disabled={pending}
        value={currentEmail}
        onChange={(event) => void handleChange(event.target.value)}
      >
        {initialUsers.map((user) => (
          <option key={user.id} value={user.email}>
            {user.name} ({user.role})
          </option>
        ))}
      </Select>
      {error ? <span role="alert">{error}</span> : null}
    </label>
  );
}
