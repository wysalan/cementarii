export type HoyolabLink = { ltuid: string; ltoken: string; ltmid: string; uid: string };

/** 從貼上的 cookie 字串（`ltoken_v2=...; ltuid_v2=...`）取出需要的三個值，找不到的不會出現在結果裡 */
export function parseHoyolabCookie(text: string) {
  const find = (name: string) => text.match(new RegExp(`(?:^|[; ])${name}=([^; ]+)`))?.[1];
  const found = { ltuid: find("ltuid_v2"), ltoken: find("ltoken_v2"), ltmid: find("ltmid_v2") };
  return Object.fromEntries(Object.entries(found).filter(([, v]) => v)) as Partial<HoyolabLink>;
}

const SECONDS_PER_RESIN = 8 * 60;

/** 由「距離回滿的秒數」推回目前這點樹脂是什麼時候回復的，當作計算的起始時間 */
export function resinStartTime(recoverySeconds: number, now = new Date()) {
  if (recoverySeconds <= 0) return new Date(now);
  const untilNext = recoverySeconds % SECONDS_PER_RESIN;
  const elapsed = (SECONDS_PER_RESIN - untilNext) % SECONDS_PER_RESIN;
  return new Date(now.getTime() - elapsed * 1000);
}
