import type { SelectHTMLAttributes } from "react";

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={["input", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
