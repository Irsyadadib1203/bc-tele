export type TargetGroup = "main" | "personal" | "both";

const labels: Record<TargetGroup, string> = {
  main: "Chat utama",
  personal: "Chat pribadi",
  both: "Chat utama dan pribadi",
};

/** Normalizes the textarea format used throughout the panel. */
export function telegramTargetChatIds(settings: { targetChatId?: unknown } | null | undefined) {
  const value = typeof settings?.targetChatId === "string" ? settings.targetChatId : "";
  return [...new Set(value.split(/[\n,;]+/).map((id) => id.trim()).filter(Boolean))];
}

export function isTargetGroup(value: unknown): value is TargetGroup {
  return value === "main" || value === "personal" || value === "both";
}

export function targetGroup(value: unknown, fallback: TargetGroup = "main"): TargetGroup {
  return isTargetGroup(value) ? value : fallback;
}

export function targetGroupLabel(value: unknown) {
  return labels[targetGroup(value)];
}

/**
 * Resolves recipients only from the supplied level. No level can inherit or
 * read targets from another level. The legacy field remains a safe fallback
 * for an installation that has not run its database migration yet.
 */
export function levelTargetChatIds(level: {
  targetMainChatId?: unknown;
  targetPersonalChatId?: unknown;
  targetChatId?: unknown;
} | null | undefined, group: unknown) {
  const selected = targetGroup(group);
  const main = telegramTargetChatIds({ targetChatId: level?.targetMainChatId ?? level?.targetChatId });
  const personal = telegramTargetChatIds({ targetChatId: level?.targetPersonalChatId });
  if (selected === "main") return main;
  if (selected === "personal") return personal;
  return [...new Set([...main, ...personal])];
}

export function priceFormatTargetGroup(level: Record<string, unknown> | null | undefined, format: "text" | "image" | "change") {
  if (format === "change") return targetGroup(level?.priceChangeTargetGroup);
  if (format === "text") return targetGroup(level?.priceTextTargetGroup);
  return targetGroup(level?.priceImageTargetGroup);
}

export function hasTelegramTargets(settings: { targetChatId?: unknown } | null | undefined) {
  return telegramTargetChatIds(settings).length > 0;
}
