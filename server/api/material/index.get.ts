export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const lang = await getLocale(event);

  const materials = await db.query.materials.findMany({
    orderBy: (m, { asc }) => [asc(m.id)],
    columns: { id: true, rarity: true, icon: true },
    with: {
      // 多取一份英文名稱，讓搜尋可以用英文找
      i18n: {
        where: (t, { inArray }) => inArray(t.locale, [lang, "en"]),
        columns: { locale: true, name: true, typeText: true },
      },
    },
  });

  return materials.map(({ i18n, ...rest }) => {
    const text = i18n.find((t) => t.locale === lang);
    if (!text) throw createError({ statusCode: 404, statusMessage: "Translation not found" });
    return {
      ...rest,
      name: text.name,
      nameEn: i18n.find((t) => t.locale === "en")?.name ?? null,
      typeText: text.typeText,
    };
  });
}, API_CACHE);
