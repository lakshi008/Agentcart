"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ChatComposer({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors focus-within:border-rose"
      style={{ background: "var(--bg-2)", borderColor: "var(--border)" }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        disabled={disabled}
        placeholder="Tell me what you're looking for…"
        className="flex-1 bg-transparent text-sm focus:outline-none disabled:opacity-50"
        style={{ color: "var(--text-hi)" }}
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-30"
        style={{ background: "var(--accent)", color: "var(--nude)" }}
      >
        <ArrowUp size={15} />
      </button>
    </div>
  );
}
