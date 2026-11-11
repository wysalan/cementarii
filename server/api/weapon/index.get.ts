export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const lang = await getLocale(event);

  const weapons = await db.query.weapons.findMany({
    columns: {
      id: true,
      slug: true,
      weaponType: true,
      rarity: true,
      substatType: true,
      images: true,
    },
    with: {
      i18n: {
        where: (t, { eq }) => eq(t.locale, lang),
        columns: { name: true },
      },
    },
  });

  return weapons.map(({ images, ...rest }) => ({ ...flattenI18n(rest), icon: images.icon }));
}, API_CACHE);
