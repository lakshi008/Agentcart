"use client";

import { useEffect, useState } from "react";
import type { PublicUser } from "@/types";

export function useUser() {
  const [user, setUser]       = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res  = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user ?? null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  return { user, loading, refresh };
}
