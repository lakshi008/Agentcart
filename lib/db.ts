import fs from "fs";
import path from "path";
import type { AuditEvent, Order, User } from "@/types";

// A dependency-free, file-backed "database" for the hackathon MVP. It is
// intentionally simple: one JSON file, read on every request, written back
// after every mutation. Good enough for a single-instance demo; swap for a
// real database by keeping these same function signatures.

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

interface DbShape {
  users: User[];
  orders: Order[];
  auditEvents: AuditEvent[];
}

function emptyDb(): DbShape {
  return { users: [], orders: [], auditEvents: [] };
}

function ensureDb(): void {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb(), null, 2));
}

function readDb(): DbShape {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { users: parsed.users ?? [], orders: parsed.orders ?? [], auditEvents: parsed.auditEvents ?? [] };
  } catch {
    return emptyDb();
  }
}

function writeDb(db: DbShape): void {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ---- users -----------------------------------------------------------

export function findUserByEmail(email: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function findUserById(id: string): User | undefined {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

export function insertUser(user: User): void {
  const db = readDb();
  db.users.push(user);
  writeDb(db);
}

export function updateUser(id: string, patch: Partial<User>): User | undefined {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return undefined;
  db.users[idx] = { ...db.users[idx], ...patch };
  writeDb(db);
  return db.users[idx];
}

// ---- orders ------------------------------------------------------------

export function insertOrder(order: Order): void {
  const db = readDb();
  db.orders.push(order);
  writeDb(db);
}

export function listOrdersByUser(userId: string): Order[] {
  const db = readDb();
  return db.orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sumCapturedToday(userId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const db = readDb();
  return db.orders
    .filter((o) => o.userId === userId && o.status === "captured" && o.createdAt.slice(0, 10) === today)
    .reduce((sum, o) => sum + o.total, 0);
}

// ---- audit events --------------------------------------------------------

export function insertAuditEvent(event: AuditEvent): void {
  const db = readDb();
  db.auditEvents.push(event);
  writeDb(db);
}

export function listAuditEventsByUser(userId: string): AuditEvent[] {
  const db = readDb();
  return db.auditEvents
    .filter((e) => e.userId === userId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
