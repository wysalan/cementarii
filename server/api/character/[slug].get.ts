export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const slug = getRouterParam(event, "slug")!;
  const lang = await getLocale(event);

  const character = await db.query.characters.findFirst({
    where: (c, { eq }) => eq(c.slug, slug),
    columns: { id: false, createdAt: false, updatedAt: false },
    with: {
      i18n: {
        where: (t, { eq }) => eq(t.locale, lang),
        columns: { characterId: false, locale: false },
      },
      abilities: {
        orderBy: (t, { asc }) => [asc(t.kind), asc(t.sortOrder)],
        columns: { id: false, characterId: false },
        with: {
          i18n: {
            where: (t, { eq }) => eq(t.locale, lang),
            columns: { abilityId: false, locale: false },
          },
        },
      },
      lore: {
        where: (t, { eq }) => eq(t.locale, lang),
        columns: { characterId: false, locale: false },
      },
      costs: {
        orderBy: (t, { asc }) => [asc(t.kind), asc(t.stage), asc(t.materialId)],
        columns: { characterId: false, materialId: false },
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
      outfits: {
        orderBy: (t, { asc, desc }) => [desc(t.isDefault), asc(t.outfitId)],
        columns: { isDefault: true },
        with: {
          outfit: {
            columns: { id: true, variant: true, images: true, releasedIn: true },
            with: {
              i18n: {
                where: (t, { eq }) => eq(t.locale, lang),
                columns: { name: true, description: true },
              },
            },
          },
        },
      },
    },
  });

  if (!character) {
    throw createError({ statusCode: 404, statusMessage: "Character not found" });
  }

  const { lore, abilities, costs, outfits, ...rest } = character;

  const voicelineList = lore[0]?.voicelines ?? [];
  const voicelines = {
    friendship: voicelineList
      .filter((v) => v.type === "friendship")
      .map(({ type: _type, ...v }) => v),
    battle: voicelineList.filter((v) => v.type === "battle").map(({ type: _type, ...v }) => v),
  };

  return {
    ...flattenI18n(rest),
    stories: lore[0]?.stories ?? [],
    voicelines,
    abilities: abilities.map(flattenI18n),
    costs: {
      ascension: groupByStage(costs.filter((c) => c.kind === "ascension")),
      talent: groupByStage(costs.filter((c) => c.kind === "talent")),
    },
    outfits: outfits.map(({ outfit, ...link }) => ({ ...link, ...flattenI18n(outfit) })),
  };
}, API_CACHE);
