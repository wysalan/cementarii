// 旅行者每個元素各有一筆資料，而且不會出現在祈願裡
const TRAVELER_IDS = [10000005, 10000007];

/** 祈願可能抽到的角色與武器，匯入祈願紀錄時用來對應物品 ID 與名稱 */
export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const lang = await getLocale(event);

  const [characters, weapons] = await Promise.all([
    db.query.characters.findMany({
      where: (c, { notInArray }) => notInArray(c.gameId, TRAVELER_IDS),
      columns: { gameId: true, slug: true, rarity: true, images: true },
      with: { i18n: { where: (t, { eq }) => eq(t.locale, lang), columns: { name: true } } },
    }),
    db.query.weapons.findMany({
      columns: { id: true, slug: true, rarity: true, images: true },
      with: { i18n: { where: (t, { eq }) => eq(t.locale, lang), columns: { name: true } } },
    }),
  ]);

  return [
    ...characters.map(({ gameId, images, ...rest }) => ({
      ...flattenI18n(rest),
      id: gameId,
      kind: "character" as const,
      icon: images.icon,
    })),
    ...weapons.map(({ images, ...rest }) => ({
      ...flattenI18n(rest),
      kind: "weapon" as const,
      icon: images.icon,
    })),
  ];
}, API_CACHE);
