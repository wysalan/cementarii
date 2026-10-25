export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const slug = getRouterParam(event, "slug")!;
  const lang = await getLocale(event);

  const artifact = await db.query.artifactSets.findFirst({
    where: (a, { eq }) => eq(a.slug, slug),
    columns: { createdAt: false, updatedAt: false },
    with: {
      i18n: {
        where: (t, { eq }) => eq(t.locale, lang),
        columns: { setId: false, locale: false },
      },
      pieces: {
        orderBy: (t, { asc }) => [asc(t.slot)],
        columns: { setId: false },
        with: {
          i18n: {
            where: (t, { eq }) => eq(t.locale, lang),
            columns: { setId: false, slot: false, locale: false },
          },
        },
      },
    },
  });

  if (!artifact) {
    throw createError({ statusCode: 404, statusMessage: "Artifact not found" });
  }

  const { pieces, ...rest } = artifact;

  return {
    ...flattenI18n(rest),
    pieces: pieces.map(flattenI18n),
  };
});
