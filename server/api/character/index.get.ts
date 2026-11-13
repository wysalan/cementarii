export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const lang = await getLocale(event);

  const characters = await db.query.characters.findMany({
    orderBy: (c, { asc, desc }) => [desc(c.releasedAt), asc(c.gameId), asc(c.id)],
    columns: {
      slug: true,
      element: true,
      weaponType: true,
      bodyType: true,
      rarity: true,
      association: true,
      birthMonth: true,
      images: true,
      enhancedIn: true,
    },
    with: {
      i18n: {
        where: (t, { eq }) => eq(t.locale, lang),
        columns: { name: true, region: true },
      },
      // 最新的一套非預設衣裝，給「大頭照切換為衣裝版本」用
      outfits: {
        where: (t, { eq }) => eq(t.isDefault, false),
        orderBy: (t, { asc }) => [asc(t.outfitId)],
        limit: 1,
        columns: {},
        with: { outfit: { columns: { images: true } } },
      },
    },
  });

  return characters.map(({ images, outfits, ...rest }) => ({
    ...flattenI18n(rest),
    icon: images.icon,
    costumeIcon: outfits[0]?.outfit.images.icon ?? null,
  }));
}, API_CACHE);
