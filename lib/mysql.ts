import { randomUUID } from "crypto";
import mysql, {
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

type DbRow = RowDataPacket & Record<string, unknown>;
type Data = Record<string, unknown>;

const globalForDatabase = globalThis as typeof globalThis & {
  mysqlPool?: mysql.Pool;
};
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL belum diatur. Salin .env.example menjadi .env lalu isi koneksi MySQL.",
  );
}

export const pool =
  globalForDatabase.mysqlPool ?? mysql.createPool(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.mysqlPool = pool;
}

async function findOne<T extends DbRow = DbRow>(
  sql: string,
  values: unknown[] = [],
): Promise<T | null> {
  const [rows] = await pool.query<T[]>(sql, values);
  return rows[0] ?? null;
}

async function findMany<T extends DbRow = DbRow>(
  sql: string,
  values: unknown[] = [],
): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, values);
  return rows;
}

async function execute(
  sql: string,
  values: unknown[] = [],
): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, values as any);
  return result;
}

function parseJson(value: unknown, fallback: unknown[] = []): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return fallback;

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function toLevel(row: DbRow | null) {
  return row
    ? {
        ...row,
        isActive: Boolean(row.isActive),
        scheduleEnabled: Boolean(row.scheduleEnabled),
        feeEnabled: Boolean(row.feeEnabled),
        feeOverrides: parseJson(row.feeOverrides),
      }
    : null;
}

function toCategory(row: DbRow | null) {
  return row
    ? {
        ...row,
        selected: Boolean(row.selected),
        prefixFilterEnabled: Boolean(row.prefixFilterEnabled),
        products: parseJson(row.products),
      }
    : null;
}

function toSchedule(row: DbRow | null) {
  return row ? { ...row, enabled: Boolean(row.enabled) } : null;
}

function toSettings(row: DbRow | null) {
  return row
    ? {
        ...row,
        scheduleEnabled: Boolean(row.scheduleEnabled),
        feeMatrix: parseJson(row.feeMatrix),
      }
    : null;
}

function serialize(value: unknown): unknown {
  if (value instanceof Date) return value;
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return value;
}

function updateFields(data: Data) {
  const keys = Object.keys(data);
  if (keys.length === 0) return null;

  return {
    assignments: keys.map((key) => `\`${key}\` = ?`).join(", "),
    values: keys.map((key) => serialize(data[key])),
  };
}

function insertStatement(table: string, data: Data) {
  const keys = Object.keys(data);
  return {
    sql: `INSERT INTO \`${table}\` (${keys.map((key) => `\`${key}\``).join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`,
    values: keys.map((key) => serialize(data[key])),
  };
}

// This boundary intentionally returns database rows whose columns are determined by SQL.
// Application routes validate the values they consume from those rows.
export const db: any = {
  user: {
    findUnique: async ({
      where: { username, id },
    }: {
      where: { username?: string; id?: string };
    }) =>
      findOne(
        "SELECT * FROM `User` WHERE " + (username ? "username" : "id") + " = ?",
        [username ?? id],
      ),
  },

  settings: {
    findUnique: async (_args?: unknown) =>
      toSettings(await findOne("SELECT * FROM `Settings` WHERE id = 1")),
    upsert: async ({ update, create }: { update: Data; create: Data }) => {
      const exists = await findOne("SELECT id FROM `Settings` WHERE id = 1");
      const data = exists ? update : { id: 1, ...create };
      const fields = updateFields(data);

      if (exists && fields) {
        await execute(
          `UPDATE \`Settings\` SET ${fields.assignments} WHERE id = 1`,
          fields.values,
        );
      } else if (!exists) {
        const statement = insertStatement("Settings", data);
        await execute(statement.sql, statement.values);
      }

      return toSettings(await findOne("SELECT * FROM `Settings` WHERE id = 1"));
    },
    update: async ({ data }: { data: Data }) => {
      const fields = updateFields(data);
      if (fields)
        await execute(
          `UPDATE \`Settings\` SET ${fields.assignments} WHERE id = 1`,
          fields.values,
        );
      return toSettings(await findOne("SELECT * FROM `Settings` WHERE id = 1"));
    },
  },

  priceLevel: {
    findMany: async (_args?: unknown) =>
      (await findMany("SELECT * FROM `PriceLevel` ORDER BY createdAt ASC")).map(
        (row) => toLevel(row)!,
      ),
    findFirst: async (_args?: unknown) =>
      toLevel(
        await findOne(
          "SELECT * FROM `PriceLevel` ORDER BY createdAt ASC LIMIT 1",
        ),
      ),
    findUnique: async ({ where: { id } }: { where: { id: string } }) =>
      toLevel(await findOne("SELECT * FROM `PriceLevel` WHERE id = ?", [id])),
    count: async () =>
      Number(
        (
          await findOne<{ count: number } & DbRow>(
            "SELECT COUNT(*) AS count FROM `PriceLevel`",
          )
        )?.count ?? 0,
      ),
    create: async ({
      data,
    }: {
      data: { name: string; apiKey?: string | null };
    }) => {
      const id = randomUUID();
      await execute(
        "INSERT INTO `PriceLevel` (id, name, isActive, apiKey, createdAt) VALUES (?, ?, FALSE, ?, NOW())",
        [id, data.name, data.apiKey ?? null],
      );
      return toLevel(
        await findOne("SELECT * FROM `PriceLevel` WHERE id = ?", [id]),
      );
    },
    update: async ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Data;
    }) => {
      const fields = updateFields(data);
      if (fields)
        await execute(
          `UPDATE \`PriceLevel\` SET ${fields.assignments} WHERE id = ?`,
          [...fields.values, id],
        );
      return toLevel(
        await findOne("SELECT * FROM `PriceLevel` WHERE id = ?", [id]),
      );
    },
    delete: async ({ where: { id } }: { where: { id: string } }) =>
      execute("DELETE FROM `PriceLevel` WHERE id = ?", [id]),
  },

  productCategory: {
    findMany: async ({
      where = {},
      select,
    }: { where?: Data; select?: Data } = {}) => {
      const keys = Object.keys(where);
      const columns = select
        ? Object.keys(select)
            .map((key) => `\`${key}\``)
            .join(", ")
        : "*";
      const predicate = keys.length
        ? ` WHERE ${keys.map((key) => `\`${key}\` = ?`).join(" AND ")}`
        : "";
      const rows = await findMany(
        `SELECT ${columns} FROM \`ProductCategory\`${predicate} ORDER BY title ASC`,
        keys.map((key) => where[key]),
      );
      return rows.map((row) => toCategory(row)!);
    },
    findUnique: async ({ where: { id } }: { where: { id: string } }) =>
      toCategory(
        await findOne("SELECT * FROM `ProductCategory` WHERE id = ?", [id]),
      ),
    update: async ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Data;
    }) => {
      const fields = updateFields(data);
      if (fields)
        await execute(
          `UPDATE \`ProductCategory\` SET ${fields.assignments} WHERE id = ?`,
          [...fields.values, id],
        );
      return toCategory(
        await findOne("SELECT * FROM `ProductCategory` WHERE id = ?", [id]),
      );
    },
    updateMany: async ({ where, data }: { where: Data; data: Data }) => {
      const fields = updateFields(data);
      const keys = Object.keys(where);
      if (!fields || !keys.length) return { count: 0 };
      const result = await execute(
        `UPDATE \`ProductCategory\` SET ${fields.assignments} WHERE ${keys.map((key) => `\`${key}\` = ?`).join(" AND ")}`,
        [...fields.values, ...keys.map((key) => where[key])],
      );
      return { count: result.affectedRows };
    },
    deleteMany: async ({
      where: { levelId },
    }: {
      where: { levelId: string };
    }) => execute("DELETE FROM `ProductCategory` WHERE levelId = ?", [levelId]),
    upsert: async ({
      where: { levelId_title },
      update,
      create,
    }: {
      where: { levelId_title: { levelId: string; title: string } };
      update: Data;
      create: Data;
    }) => {
      const existing = await findOne<{ id: string } & DbRow>(
        "SELECT id FROM `ProductCategory` WHERE levelId = ? AND title = ?",
        [levelId_title.levelId, levelId_title.title],
      );

      if (existing) {
        const fields = updateFields(update);
        if (fields)
          await execute(
            `UPDATE \`ProductCategory\` SET ${fields.assignments} WHERE id = ?`,
            [...fields.values, existing.id],
          );
        return toCategory(
          await findOne("SELECT * FROM `ProductCategory` WHERE id = ?", [
            existing.id,
          ]),
        );
      }

      const id = randomUUID();
      const statement = insertStatement("ProductCategory", { id, ...create });
      await execute(statement.sql, statement.values);
      return toCategory(
        await findOne("SELECT * FROM `ProductCategory` WHERE id = ?", [id]),
      );
    },
  },

  customBroadcast: {
    findMany: async ({ where = {} }: { where?: Data } = {}) => {
      const keys = Object.keys(where);
      const predicate = keys.length ? ` WHERE ${keys.map((key) => `\`${key}\` = ?`).join(" AND ")}` : "";
      return findMany(`SELECT * FROM \`CustomBroadcast\`${predicate} ORDER BY createdAt ASC`, keys.map((key) => where[key]));
    },
    findUnique: async ({ where: { id } }: { where: { id: string } }) =>
      findOne("SELECT * FROM `CustomBroadcast` WHERE id = ?", [id]),
    count: async ({ where = {} }: { where?: Data } = {}) => {
      const keys = Object.keys(where);
      const predicate = keys.length ? ` WHERE ${keys.map((key) => `\`${key}\` = ?`).join(" AND ")}` : "";
      return Number(
        (await findOne<{ count: number } & DbRow>(`SELECT COUNT(*) AS count FROM \`CustomBroadcast\`${predicate}`, keys.map((key) => where[key])))?.count ?? 0,
      );
    },
    create: async ({ data }: { data: { levelId: string; name: string; content: string } }) => {
      const id = randomUUID();
      await execute(
        "INSERT INTO `CustomBroadcast` (id, levelId, name, content, createdAt) VALUES (?, ?, ?, ?, NOW())",
        [id, data.levelId, data.name, data.content],
      );
      return findOne("SELECT * FROM `CustomBroadcast` WHERE id = ?", [id]);
    },
    update: async ({ where: { id }, data }: { where: { id: string }; data: Data }) => {
      const fields = updateFields(data);
      if (fields) await execute(`UPDATE \`CustomBroadcast\` SET ${fields.assignments} WHERE id = ?`, [...fields.values, id]);
      return findOne("SELECT * FROM `CustomBroadcast` WHERE id = ?", [id]);
    },
    delete: async ({ where: { id } }: { where: { id: string } }) =>
      execute("DELETE FROM `CustomBroadcast` WHERE id = ?", [id]),
  },

  broadcastSchedule: {
    findMany: async ({ where = {} }: { where?: Data } = {}) => {
      const keys = Object.keys(where);
      const predicate = keys.length ? ` WHERE ${keys.map((key) => `\`${key}\` = ?`).join(" AND ")}` : "";
      return (await findMany(`SELECT * FROM \`BroadcastSchedule\`${predicate} ORDER BY createdAt DESC`, keys.map((key) => where[key]))).map((row) => toSchedule(row)!);
    },
    findUnique: async ({ where: { id } }: { where: { id: string } }) =>
      toSchedule(await findOne("SELECT * FROM `BroadcastSchedule` WHERE id = ?", [id])),
    create: async ({ data }: { data: Data }) => {
      const id = randomUUID();
      await execute(
        "INSERT INTO `BroadcastSchedule` (id, name, enabled, days, time, categoryIds, broadcastFormat, levelId, customBroadcastId, lastRunKey, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
        [
          id,
          data.name,
          Boolean(data.enabled),
          data.days,
          data.time,
          data.categoryIds,
          data.broadcastFormat ?? "image",
          data.levelId ?? null,
          data.customBroadcastId ?? null,
          data.lastRunKey ?? null,
        ],
      );
      return toSchedule(
        await findOne("SELECT * FROM `BroadcastSchedule` WHERE id = ?", [id]),
      );
    },
    update: async ({
      where: { id },
      data,
    }: {
      where: { id: string };
      data: Data;
    }) => {
      const fields = updateFields(data);
      if (fields)
        await execute(
          `UPDATE \`BroadcastSchedule\` SET ${fields.assignments} WHERE id = ?`,
          [...fields.values, id],
        );
      return toSchedule(
        await findOne("SELECT * FROM `BroadcastSchedule` WHERE id = ?", [id]),
      );
    },
    delete: async ({ where: { id } }: { where: { id: string } }) =>
      execute("DELETE FROM `BroadcastSchedule` WHERE id = ?", [id]),
  },

  activityLog: {
    findMany: async ({
      take = 30,
    }: { take?: number; orderBy?: unknown } = {}) =>
      findMany("SELECT * FROM `ActivityLog` ORDER BY createdAt DESC LIMIT ?", [
        Math.min(Math.max(1, take), 30),
      ]),
    create: async ({
      data,
    }: {
      data: { type: string; message: string; meta?: unknown };
    }) => {
      const id = randomUUID();
      await execute(
        "INSERT INTO `ActivityLog` (id, type, message, meta, createdAt) VALUES (?, ?, ?, ?, NOW())",
        [
          id,
          data.type,
          data.message,
          data.meta === undefined ? null : JSON.stringify(data.meta),
        ],
      );
      // Keep the activity table small and relevant. The derived table avoids
      // MySQL's restriction on selecting from the table being deleted.
      await execute(
        "DELETE FROM `ActivityLog` WHERE id NOT IN (SELECT id FROM (SELECT id FROM `ActivityLog` ORDER BY createdAt DESC, id DESC LIMIT 30) AS latest)",
      );
    },
  },
};
