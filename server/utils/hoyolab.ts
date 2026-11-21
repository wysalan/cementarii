import { createHash, randomInt } from "node:crypto";

const DS_SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";
const LETTERS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const randomLetters = (length: number) =>
  Array.from({ length }, () => LETTERS[randomInt(LETTERS.length)]).join("");

/** HoYoLAB 國際服要求的動態簽章 */
export function generateDs(now = Date.now(), r = randomLetters(6)) {
  const t = Math.floor(now / 1000);
  const hash = createHash("md5").update(`salt=${DS_SALT}&t=${t}&r=${r}`).digest("hex");
  return `${t},${r},${hash}`;
}

const SERVERS: Record<string, string> = {
  "6": "os_usa",
  "7": "os_euro",
  "8": "os_asia",
  "18": "os_asia",
  "9": "os_cht",
};

/** 由 UID 開頭判斷伺服器；10 碼的 UID 看前兩碼。不是國際服的 UID 回傳 undefined */
export const genshinServerOf = (uid: string) => SERVERS[uid.slice(0, uid.length - 8)];
