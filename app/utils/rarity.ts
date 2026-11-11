// 漸層方向（bg-linear-to-b、bg-linear-to-br）由使用的地方決定
const GRADIENT: Record<number, string> = {
  1: "from-[#6a6d74] to-[#868586]",
  2: "from-[#4b6c67] to-[#519072]",
  3: "from-[#567496] to-[#5392b8]",
  4: "from-[#5e5789] to-[#9c75b7]",
  5: "from-[#945c2c] to-[#b27330]",
};

const BAR: Record<number, string> = {
  1: "bg-[#72778b]",
  2: "bg-[#2a9072]",
  3: "bg-[#5180cb]",
  4: "bg-[#a156e0]",
  5: "bg-[#bc6832]",
};

const RING: Record<number, string> = {
  1: "ring-[#868586]",
  2: "ring-[#519072]",
  3: "ring-[#5392b8]",
  4: "ring-[#9c75b7]",
  5: "ring-[#b27330]",
};

type Rarity = number | null | undefined;

export const rarityGradient = (rarity: Rarity) => GRADIENT[rarity ?? 0];
export const rarityBar = (rarity: Rarity) => BAR[rarity ?? 0];
export const rarityRing = (rarity: Rarity) => RING[rarity ?? 0];
