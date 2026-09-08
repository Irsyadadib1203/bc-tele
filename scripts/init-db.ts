import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { RowDataPacket } from "mysql2";
import { db, pool } from "../lib/mysql";

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const [rows] = await pool.query<(RowDataPacket & { count: number })[]>(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );

  if (Number(rows[0]?.count) === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS \`User\` (id VARCHAR(191) PRIMARY KEY, username VARCHAR(191) UNIQUE NOT NULL, passwordHash VARCHAR(255) NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS \`Settings\` (id INT PRIMARY KEY, siteUrl VARCHAR(500), apiKey TEXT, selectedLevelId VARCHAR(50), theme VARCHAR(10) DEFAULT 'light', scheduleEnabled BOOLEAN DEFAULT TRUE, botToken TEXT, targetChatId TEXT, pollingInterval INT DEFAULT 15, caption TEXT, imageCaption TEXT, broadcastFormat VARCHAR(10) DEFAULT 'image', headerTitle VARCHAR(255) DEFAULT 'PRICE UPDATE', headerSubtitle VARCHAR(255) DEFAULT 'Tanggal dan waktu pembaruan otomatis', primaryColor VARCHAR(20) DEFAULT '#5B5BD6', accentColor VARCHAR(20) DEFAULT '#A78BFA', headerImageUrl VARCHAR(1000), updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS \`PriceLevel\` (id VARCHAR(191) PRIMARY KEY, name VARCHAR(100) NOT NULL, isActive BOOLEAN DEFAULT FALSE, apiKey TEXT, feeEnabled BOOLEAN DEFAULT FALSE, feeSmall INT DEFAULT 5, feeMedium INT DEFAULT 10, feeLarge INT DEFAULT 25, feeOverrides TEXT, headerTitle VARCHAR(255) DEFAULT 'PRICE UPDATE', primaryColor VARCHAR(20) DEFAULT '#5B5BD6', accentColor VARCHAR(20) DEFAULT '#A78BFA', createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS \`ProductCategory\` (id VARCHAR(191) PRIMARY KEY, levelId VARCHAR(191) NOT NULL, title VARCHAR(255) NOT NULL, type VARCHAR(100), selected BOOLEAN DEFAULT FALSE, prefixFilterEnabled BOOLEAN DEFAULT FALSE, excludedPrefixes TEXT, productCount INT DEFAULT 0, products JSON NOT NULL, syncedAt DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY level_title(levelId,title))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS \`CustomBroadcast\` (id VARCHAR(191) PRIMARY KEY, name VARCHAR(100) NOT NULL, content TEXT NOT NULL, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS \`BroadcastSchedule\` (id VARCHAR(191) PRIMARY KEY, name VARCHAR(100) NOT NULL, enabled BOOLEAN DEFAULT FALSE, days VARCHAR(100) NOT NULL, time VARCHAR(5) NOT NULL, categoryIds TEXT NOT NULL, broadcastFormat VARCHAR(10) DEFAULT 'image', levelId VARCHAR(191), customBroadcastId VARCHAR(191), lastRunKey VARCHAR(32), createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS \`ActivityLog\` (id VARCHAR(191) PRIMARY KEY, type VARCHAR(40) NOT NULL, message TEXT NOT NULL, meta JSON, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);

  await addColumnIfMissing("PriceLevel", "feeEnabled", "BOOLEAN DEFAULT FALSE");
  await addColumnIfMissing("PriceLevel", "feeSmall", "INT DEFAULT 5");
  await addColumnIfMissing("PriceLevel", "feeMedium", "INT DEFAULT 10");
  await addColumnIfMissing("PriceLevel", "feeLarge", "INT DEFAULT 25");
  await addColumnIfMissing("PriceLevel", "feeOverrides", "TEXT");
  await addColumnIfMissing("PriceLevel", "headerTitle", "VARCHAR(255)");
  await addColumnIfMissing("PriceLevel", "primaryColor", "VARCHAR(20)");
  await addColumnIfMissing("PriceLevel", "accentColor", "VARCHAR(20)");
  await addColumnIfMissing("Settings", "imageCaption", "TEXT");
  await pool.query("ALTER TABLE `Settings` MODIFY COLUMN `targetChatId` TEXT");
  await addColumnIfMissing("BroadcastSchedule", "broadcastFormat", "VARCHAR(10) DEFAULT 'image'");
  await addColumnIfMissing("BroadcastSchedule", "levelId", "VARCHAR(191)");
  await addColumnIfMissing("BroadcastSchedule", "customBroadcastId", "VARCHAR(191)");
  await addColumnIfMissing("BroadcastSchedule", "lastRunKey", "VARCHAR(32)");

  const user = await db.user.findUnique({ where: { username: "admin" } });
  if (!user) {
    await pool.execute("INSERT INTO `User` (id, username, passwordHash, createdAt) VALUES (?, ?, ?, NOW())", [
      randomUUID(),
      "admin",
      await bcrypt.hash("admin123", 12),
    ]);
  }

  await db.settings.upsert({ update: {}, create: { id: 1 } });
  // Existing installations used one global header. Copy it into every level
  // once so switching to independent designs does not change current output.
  await pool.query("UPDATE `PriceLevel` AS levelItem JOIN `Settings` AS settingsItem ON settingsItem.id = 1 SET levelItem.headerTitle = COALESCE(levelItem.headerTitle, settingsItem.headerTitle, 'PRICE UPDATE'), levelItem.primaryColor = COALESCE(levelItem.primaryColor, settingsItem.primaryColor, '#5B5BD6'), levelItem.accentColor = COALESCE(levelItem.accentColor, settingsItem.accentColor, '#A78BFA') WHERE levelItem.headerTitle IS NULL OR levelItem.primaryColor IS NULL OR levelItem.accentColor IS NULL");
  if ((await db.priceLevel.count()) === 0) {
    await db.priceLevel.create({ data: { name: "Member" } });
    await db.priceLevel.create({ data: { name: "H2H" } });
  }
  if ((await db.customBroadcast.count()) === 0) {
    await db.customBroadcast.create({ data: { name: "BC Custom 1", content: "" } });
  }
  await pool.query(
    "DELETE FROM `ActivityLog` WHERE id NOT IN (SELECT id FROM (SELECT id FROM `ActivityLog` ORDER BY createdAt DESC, id DESC LIMIT 30) AS latest)",
  );

  const settings = await db.settings.findUnique();
  if (!settings?.selectedLevelId) {
    const first = await db.priceLevel.findFirst();
    if (first) await db.settings.update({ data: { selectedLevelId: first.id } });
  }
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
