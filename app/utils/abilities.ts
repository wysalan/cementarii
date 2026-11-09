type AbilityLike = { kind: string; sortOrder: number; isEnhanced: boolean; description: string };

/** 描述的切分單位：標籤、連結標記、換行、句號，其餘為一般文字 */
const TOKEN = /<\/?[a-z]+[^>]*>|\{\/?LINK[^}]*\}|\n|。|[^<{\n。]+|[<{]/gi;

/** 以「。」與換行切成句子，不會從標記中間切開（每一段的標記都是成對的） */
function splitSentences(raw: string): string[] {
  const out: string[] = [];
  let current = "";
  let depth = 0;
  for (const token of raw.match(TOKEN) ?? []) {
    if (token === "\n" && depth === 0) {
      if (current) out.push(current);
      out.push("\n");
      current = "";
      continue;
    }
    current += token;
    if (token.startsWith("</") || token.startsWith("{/")) depth = Math.max(0, depth - 1);
    else if (token.startsWith("<") || token.startsWith("{LINK")) depth++;
    else if (token === "。" && depth === 0) {
      out.push(current);
      current = "";
    }
  }
  if (current) out.push(current);
  return out;
}

/** 比對用的文字：標點與空白也去掉，只改標點的句子視為相同 */
const plainText = (raw: string) => raw.replace(/<[^>]+>|\{\/?LINK[^}]*\}|[\p{P}\s]/gu, "");

/** 兩段文字的相似度（相鄰兩字的 Dice 係數，0～1） */
function similarity(a: string, b: string): number {
  const pairs = (s: string) => {
    const chars = [...s];
    return new Set(chars.slice(1).map((c, i) => chars[i] + c));
  };
  const x = pairs(a);
  const y = pairs(b);
  if (!x.size || !y.size) return a === b ? 1 : 0;
  let shared = 0;
  for (const p of x) if (y.has(p)) shared++;
  return (2 * shared) / (x.size + y.size);
}

/** 與強化前最相近的句子相似度達到這個值，視為改寫過的句子；否則視為新增的句子 */
const CHANGED_THRESHOLD = 0.6;

/**
 * 在強化後的描述中，把新增的句子包上 `{DIFF=new}…{/DIFF}`、改寫過的包上 `{DIFF=changed}…{/DIFF}`。
 * 同一行相鄰、種類相同的句子合併成一段，避免底色在交界處重疊
 */
export function markEnhancedDiff(base: string, enhanced: string): string {
  const baseSentences = splitSentences(base).map(plainText).filter(Boolean);
  let out = "";
  let open: string | undefined;
  for (const raw of splitSentences(enhanced)) {
    const text = plainText(raw);
    let kind: string | undefined;
    if (text && !baseSentences.includes(text)) {
      const best = Math.max(0, ...baseSentences.map((b) => similarity(b, text)));
      kind = best >= CHANGED_THRESHOLD ? "changed" : "new";
    }
    if (open && open !== kind) out += "{/DIFF}";
    if (kind && kind !== open) out += `{DIFF=${kind}}`;
    out += raw;
    open = kind;
  }
  return open ? out + "{/DIFF}" : out;
}

const diffCache = new WeakMap<object, string>();

/** 技能要顯示的描述：強化後的技能加上差異標記（結果依技能物件快取） */
export function describeAbility(abilities: AbilityLike[], ability: AbilityLike): string {
  if (!ability.isEnhanced) return ability.description;
  const cached = diffCache.get(ability);
  if (cached !== undefined) return cached;
  const base = baseAbilityOf(abilities, ability);
  const marked = base
    ? markEnhancedDiff(base.description, ability.description)
    : ability.description;
  diffCache.set(ability, marked);
  return marked;
}

/** 同一個技能的另一個版本（強化前 ↔ 強化後，kind 與 sortOrder 相同） */
export function counterpartOf<T extends Omit<AbilityLike, "description">>(
  abilities: T[],
  ability: T,
): T | undefined {
  return abilities.find(
    (a) =>
      a.isEnhanced !== ability.isEnhanced &&
      a.kind === ability.kind &&
      a.sortOrder === ability.sortOrder,
  );
}

/** 強化後技能對應的強化前版本 */
export function baseAbilityOf<T extends Omit<AbilityLike, "description">>(
  abilities: T[],
  ability: T,
): T | undefined {
  if (!ability.isEnhanced) return undefined;
  return abilities.find(
    (a) => !a.isEnhanced && a.kind === ability.kind && a.sortOrder === ability.sortOrder,
  );
}

/** 詳細屬性逐列與強化前同一等級比對：沒有同名的屬性為 new，同名但數值不同為 changed */
export function diffAttributes(
  rows: { text?: string; value?: string }[],
  baseRows: { text?: string; value?: string }[] | undefined,
): ("new" | "changed" | undefined)[] {
  return rows.map((row) => {
    if (!baseRows) return undefined;
    const base = baseRows.find((b) => b.text === row.text);
    if (!base) return "new";
    return base.value === row.value ? undefined : "changed";
  });
}
