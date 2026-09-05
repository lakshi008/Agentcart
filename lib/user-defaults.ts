import crypto from "crypto";
import type { User } from "@/types";
import { hashPassword } from "@/lib/auth";

export function createNewUser(email: string, password: string, name: string): User {
  return {
    id: `user_${crypto.randomBytes(8).toString("hex")}`,
    email: email.toLowerCase().trim(),
    name: name.trim() || email.split("@")[0],
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    wallet: {
      balance: 25000,
      savedMethodLabel: null,
    },
    policy: {
      maxTransactionAmount: 3000,
      dailySpendingLimit: 5000,
      maxQuantityPerItem: 2,
      userApprovalRequired: true,
      maxPaymentAttempts: 1,
      hardCeiling: 15000, // absolute ceiling — even a manual override can never cross this
    },
  };
}
