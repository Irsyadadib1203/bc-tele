import { db } from "@/lib/mysql";
import { telegramTargetChatIds } from "@/lib/telegram-targets";

type TelegramResponse = { ok?: boolean; description?: string };
const TELEGRAM_MAX_LENGTH = 4096;

async function telegramRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as TelegramResponse;
  if (!response.ok || !payload.ok) {
    throw new Error(payload.description ?? "Telegram menolak pesan");
  }
}

/** Sends a user-authored Telegram message without involving any price data. */
export async function sendCustomBroadcast(customBroadcast: any, settings: any) {
  const content = String(customBroadcast?.content ?? "").trim();
  if (!content) throw new Error("Isi BC custom belum diisi.");
  if (content.length > TELEGRAM_MAX_LENGTH) {
    throw new Error(`Isi BC custom maksimal ${TELEGRAM_MAX_LENGTH} karakter.`);
  }
  const targets = telegramTargetChatIds(settings);
  if (!settings?.botToken || !targets.length) {
    throw new Error("Bot Token dan Target Chat ID harus dikonfigurasi.");
  }

  const failures: string[] = [];
  for (const target of targets) {
    try {
      await telegramRequest(
        `https://api.telegram.org/bot${settings.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: target, text: content, parse_mode: "HTML" }),
        },
      );
    } catch (error) {
      failures.push(`${target}: ${error instanceof Error ? error.message : "Telegram menolak pesan"}`);
    }
  }
  if (failures.length) throw new Error(`Gagal mengirim ke ${failures.join("; ")}`);
  await db.activityLog.create({
    data: {
      type: "BROADCAST_CUSTOM",
      message: `BC custom ${customBroadcast.name} berhasil dikirim ke ${targets.length} target`,
      meta: { customBroadcastId: customBroadcast.id },
    },
  });
  return customBroadcast.name;
}
