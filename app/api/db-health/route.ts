import { probeDb, withDb } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const table = url.searchParams.get("table") || "attendance";
  const result = await probeDb();

  if (!/^[A-Za-z0-9_]+$/.test(table)) {
    return Response.json(result, { status: result.ok ? 200 : 503 });
  }

  try {
    const columns = await withDb(async (db) => {
      const [rows] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
      return rows;
    });
    return Response.json({ ...result, table, columns }, { status: result.ok ? 200 : 503 });
  } catch (error) {
    return Response.json(
      {
        ...result,
        table,
        columns: null,
        schemaError: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
