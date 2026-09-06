import { db } from "@/lib/mysql";

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
  if (!settings?.botToken || !settings?.targetChatId) {
    throw new Error("Bot Token dan Target Chat ID harus dikonfigurasi.");
  }

  await telegramRequest(
    `https://api.telegram.org/bot${settings.botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.targetChatId,
        text: content,
        parse_mode: "HTML",
      }),
    },
  );
  await db.activityLog.create({
    data: {
      type: "BROADCAST_CUSTOM",
      message: `BC custom ${customBroadcast.name} berhasil dikirim`,
      meta: { customBroadcastId: customBroadcast.id },
    },
  });
  return customBroadcast.name;
}
