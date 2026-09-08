/**
 * Returns the configured Telegram recipients. Keeping them in one settings
 * field preserves existing installations while allowing IDs to be entered one
 * per line (or separated with commas/semicolons).
 */
export function telegramTargetChatIds(settings: { targetChatId?: unknown } | null | undefined) {
  const value = typeof settings?.targetChatId === "string" ? settings.targetChatId : "";
  return [...new Set(value.split(/[\n,;]+/).map((id) => id.trim()).filter(Boolean))];
}

export function hasTelegramTargets(settings: { targetChatId?: unknown } | null | undefined) {
  return telegramTargetChatIds(settings).length > 0;
}
