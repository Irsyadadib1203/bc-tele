import assert from "node:assert/strict";
import {
  levelTargetChatIds,
  priceFormatTargetGroup,
  targetGroupLabel,
} from "../lib/telegram-targets";

const levelOne = {
  targetMainChatId: "-10001\n-10002",
  targetPersonalChatId: "501, 502",
  priceChangeTargetGroup: "main",
  priceTextTargetGroup: "personal",
  priceImageTargetGroup: "personal",
};
const levelTwo = {
  targetMainChatId: "-20001",
  targetPersonalChatId: "601",
  priceChangeTargetGroup: "both",
  priceTextTargetGroup: "main",
  priceImageTargetGroup: "both",
};

assert.deepEqual(
  levelTargetChatIds(levelOne, priceFormatTargetGroup(levelOne, "change")),
  ["-10001", "-10002"],
  "Perubahan harga Level 1 hanya boleh memakai target utama Level 1",
);
assert.deepEqual(
  levelTargetChatIds(levelOne, priceFormatTargetGroup(levelOne, "text")),
  ["501", "502"],
  "BC teks Level 1 hanya boleh memakai target pribadi Level 1",
);
assert.deepEqual(
  levelTargetChatIds(levelOne, priceFormatTargetGroup(levelOne, "image")),
  ["501", "502"],
  "BC gambar Level 1 hanya boleh memakai target pribadi Level 1",
);
assert.deepEqual(
  levelTargetChatIds(levelTwo, priceFormatTargetGroup(levelTwo, "change")),
  ["-20001", "601"],
  "Level 2 harus memakai daftar targetnya sendiri",
);
assert.deepEqual(
  levelTargetChatIds({ targetMainChatId: "1", targetPersonalChatId: "1\n2" }, "both"),
  ["1", "2"],
  "Target ganda harus terkirim satu kali saja",
);
assert.equal(targetGroupLabel("personal"), "Chat pribadi");

console.log("Target routing checks passed.");
