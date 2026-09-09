import { env } from "cloudflare:workers";
import { createConnection, type Connection, type RowDataPacket } from "mysql2/promise";

type DbCfg = {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
  connectionString?: string;
};

function readEnv(name: "SESSION_SECRET" | "PASSWORD_PEPPER" | "DATABASE_URL") {
  try {
    // Static reads — avoid env[name] dynamic access.
    if (name === "SESSION_SECRET") {
      const value = env.SESSION_SECRET;
      if (typeof value === "string" && value.length > 0) return value;
    } else if (name === "PASSWORD_PEPPER") {
      const value = env.PASSWORD_PEPPER;
      if (typeof value === "string" && value.length > 0) return value;
    } else if (name === "DATABASE_URL") {
      const value = env.DATABASE_URL;
      if (typeof value === "string" && value.length > 0) return value;
    }
  } catch {
    // cloudflare:workers is unavailable in some middleware/build contexts
  }
  return process.env[name];
}

function secretsPresent() {
  return {
    hasSessionSecret: Boolean(readEnv("SESSION_SECRET")),
    hasPasswordPepper: Boolean(readEnv("PASSWORD_PEPPER")),
  };
}

function tzOffset(): string {
  const minutes = -new Date().getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${sign}${hh}:${mm}`;
}

function isLoopback(host: string) {
  return host === "localhost" || host === "127.0.0.1";
}

function fromHyperdrive(): DbCfg | null {
  try {
    const hd = env.HYPERDRIVE;
    if (!hd || typeof hd.host !== "string" || hd.host.length === 0) return null;
    // Local mock Hyperdrive is loopback; prefer DATABASE_URL when that exists.
    if (isLoopback(hd.host) && readEnv("DATABASE_URL")) return null;
    return {
      host: hd.host,
      user: hd.user,
      password: hd.password,
      database: hd.database,
      port: hd.port,
      connectionString: typeof hd.connectionString === "string" ? hd.connectionString : undefined,
    };
  } catch {
    return null;
  }
}

function fromDatabaseUrl(): DbCfg | null {
  const url = readEnv("DATABASE_URL");
  if (!url) return null;
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    port: Number(parsed.port || 3306),
    connectionString: url,
  };
}

function describeSource(cfg: DbCfg) {
  if (cfg.connectionString?.includes("hyperdrive") || !readEnv("DATABASE_URL") || !isLoopback(cfg.host)) {
    try {
      if (env.HYPERDRIVE) return "hyperdrive";
    } catch {
      /* ignore */
    }
  }
  return "database_url";
}

export async function withDb<T>(fn: (db: Connection) => Promise<T>): Promise<T> {
  const cfg = fromHyperdrive() ?? fromDatabaseUrl();
  if (!cfg) {
    throw new Error("Database is not configured. Set Hyperdrive or DATABASE_URL.");
  }

  try {
    const db = await createConnection({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      port: cfg.port,
      disableEval: true,
    });

    try {
      // Avoid mysql2 prepared-statement protocol; Hyperdrive MySQL rejects COM_STMT_PREPARE.
      await db.query(`SET time_zone = '${tzOffset()}'`);
      return await fn(db);
    } finally {
      await db.end();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[db]", message, {
      source: describeSource(cfg),
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
    });
    throw error;
  }
}

/** Safe connectivity probe for production debugging (no secrets). */
export async function probeDb() {
  const secrets = secretsPresent();
  const cfg = fromHyperdrive() ?? fromDatabaseUrl();
  if (!cfg) {
    return {
      ok: false as const,
      source: null,
      host: null,
      port: null,
      database: null,
      error: "Database is not configured. Set Hyperdrive or DATABASE_URL.",
      ...secrets,
    };
  }

  try {
    const db = await createConnection({
      host: cfg.host,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      port: cfg.port,
      disableEval: true,
    });
    try {
      await db.query("SELECT 1 AS ok");
      return {
        ok: true as const,
        source: describeSource(cfg),
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        error: null,
        ...secrets,
      };
    } finally {
      await db.end();
    }
  } catch (error) {
    return {
      ok: false as const,
      source: describeSource(cfg),
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      error: error instanceof Error ? error.message : String(error),
      ...secrets,
    };
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
