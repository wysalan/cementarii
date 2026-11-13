export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const lang = await getLocale(event);

  const artifacts = await db.query.artifactSets.findMany({
    columns: { id: true, slug: true, maxRarity: true },
    with: {
      i18n: {
        where: (t, { eq }) => eq(t.locale, lang),
        columns: { name: true },
      },
      // 代表圖示：依部位順序取第一件（有生之花就用生之花）
      pieces: {
        orderBy: (t, { asc }) => [asc(t.slot)],
        limit: 1,
        columns: { icon: true },
      },
    },
  });

  return artifacts.map(({ pieces, ...rest }) => ({
    ...flattenI18n(rest),
    icon: pieces[0]?.icon ?? null,
  }));
}, API_CACHE);
