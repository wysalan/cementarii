export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const slug = getRouterParam(event, "slug")!;
  const lang = await getLocale(event);

  const weapon = await db.query.weapons.findFirst({
    where: (w, { eq }) => eq(w.slug, slug),
    columns: { createdAt: false, updatedAt: false },
    with: {
      i18n: {
        where: (t, { eq }) => eq(t.locale, lang),
        columns: { weaponId: false, locale: false },
      },
      costs: {
        orderBy: (t, { asc }) => [asc(t.stage), asc(t.materialId)],
        columns: { weaponId: false, materialId: false },
        with: {
          material: {
            columns: { id: true, rarity: true, icon: true },
            with: {
              i18n: {
                where: (t, { eq }) => eq(t.locale, lang),
                columns: { name: true },
              },
            },
          },
        },
      },
    },
  });

  if (!weapon) {
    throw createError({ statusCode: 404, statusMessage: "Weapon not found" });
  }

  const { costs, ...rest } = weapon;

  return {
    ...flattenI18n(rest),
    costs: groupByStage(costs),
  };
}, API_CACHE);
