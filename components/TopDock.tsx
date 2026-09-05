"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bot, Store, Receipt, User, LogOut, Sun, Moon, Activity, ScrollText } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { inr } from "@/lib/format";
import type { PublicUser } from "@/types";

const NAV = [
  { href: "/",       label: "Chat" },
  { href: "/shop",   label: "Shop" },
  { href: "/orders", label: "Orders" },
];

export default function TopDock({
  user,
  activityOpen,
  auditOpen,
  onToggleActivity,
  onToggleAudit,
}: {
  user: PublicUser | null;
  activityOpen?: boolean;
  auditOpen?: boolean;
  onToggleActivity?: () => void;
  onToggleAudit?: () => void;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const { theme, toggle } = useTheme();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/landing");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 px-5 py-3 sm:px-8"
      style={{ background: "var(--panel)", borderBottom: "1px solid var(--border)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "var(--accent)" }}>
            <Bot size={15} style={{ color: "var(--nude)" }} />
          </div>
          <span className="font-display text-base" style={{ color: "var(--text-hi)" }}>AgentCart</span>
        </Link>
        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{ background: pathname === l.href ? "var(--rose-soft)" : "transparent",
                       color: pathname === l.href ? "var(--rose)" : "var(--text-lo)" }}
            >{l.label}</Link>
          ))}
        </nav>
      </div>

      {user && (
        <div className="hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs lg:flex"
          style={{ borderColor: "var(--border)", color: "var(--text-mid)" }}>
          <span className="font-mono">{inr(user.wallet.balance)}</span>
          <span style={{ color: "var(--border)" }}>·</span>
          <span>Daily {inr(user.policy.dailySpendingLimit)}</span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {onToggleActivity && (
          <button onClick={onToggleActivity}
            className="hidden h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition sm:flex"
            style={{ borderColor: activityOpen ? "var(--rose)" : "var(--border)",
                     background: activityOpen ? "var(--rose-soft)" : "transparent",
                     color: activityOpen ? "var(--rose)" : "var(--text-lo)" }}>
            <Activity size={13} /><span className="hidden md:inline">Activity</span>
          </button>
        )}
        {onToggleAudit && (
          <button onClick={onToggleAudit}
            className="hidden h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition sm:flex"
            style={{ borderColor: auditOpen ? "var(--rose)" : "var(--border)",
                     background: auditOpen ? "var(--rose-soft)" : "transparent",
                     color: auditOpen ? "var(--rose)" : "var(--text-lo)" }}>
            <ScrollText size={13} /><span className="hidden md:inline">Audit</span>
          </button>
        )}
        {/* Mobile nav icons */}
        <Link href="/shop" className="flex h-8 w-8 items-center justify-center rounded-lg border transition sm:hidden"
          style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
          <Store size={14} />
        </Link>
        <Link href="/orders" className="flex h-8 w-8 items-center justify-center rounded-lg border transition sm:hidden"
          style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
          <Receipt size={14} />
        </Link>
        <button onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg border transition"
          style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <Link href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-lg border transition"
          style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
          <User size={14} />
        </Link>
        <button onClick={logout}
          className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:border-red-400 hover:text-red-400"
          style={{ borderColor: "var(--border)", color: "var(--text-lo)" }}>
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
