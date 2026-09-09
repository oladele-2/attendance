import { env } from "cloudflare:workers";
import { createConnection, type Connection, type RowDataPacket } from "mysql2/promise";

function readEnv(name: "SESSION_SECRET" | "PASSWORD_PEPPER" | "DATABASE_URL") {
  try {
    const value = env[name];
    if (typeof value === "string" && value.length > 0) return value;
  } catch {
    // cloudflare:workers is unavailable in some middleware/build contexts
  }
  return process.env[name];
}

function tzOffset(): string {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function fromHyperdrive(): { host: string; user: string; password: string; database: string; port: number } | null {
  try {
    const hd = env.HYPERDRIVE;
    if (hd && typeof hd.host === "string" && hd.host.length > 0 && hd.host !== "localhost" && hd.host !== "127.0.0.1") {
      return {
        host: hd.host,
        user: hd.user,
        password: hd.password,
        database: hd.database,
        port: hd.port,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function fromDatabaseUrl() {
  const url = readEnv("DATABASE_URL");
  if (!url) return null;
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    port: Number(parsed.port || 3306),
  };
}

export async function withDb<T>(fn: (db: Connection) => Promise<T>): Promise<T> {
  const cfg = fromHyperdrive() ?? fromDatabaseUrl();
  if (!cfg) {
    throw new Error("Database is not configured. Set Hyperdrive or DATABASE_URL.");
  }

  const db = await createConnection({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    port: cfg.port,
    disableEval: true,
  });

  try {
    await db.query("SET time_zone = ?", [tzOffset()]);
    return await fn(db);
  } finally {
    await db.end();
  }
}

export async function queryOne<T extends RowDataPacket>(
  db: Connection,
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const [rows] = await db.query<T[]>(sql, params);
  return rows[0] ?? null;
}

export async function queryAll<T extends RowDataPacket>(
  db: Connection,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const [rows] = await db.query<T[]>(sql, params);
  return rows;
}
