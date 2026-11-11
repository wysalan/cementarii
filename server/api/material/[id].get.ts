export default defineCachedEventHandler(async (event) => {
  const db = useDb(event);
  const id = Number(getRouterParam(event, "id"));
  const lang = await getLocale(event);

  // 不是整數的 ID 直接當成找不到，不送進資料庫查詢
  const material = Number.isSafeInteger(id)
    ? await db.query.materials.findFirst({
        where: (m, { eq }) => eq(m.id, id),
        columns: { createdAt: false, updatedAt: false },
        with: {
          i18n: {
            where: (t, { eq }) => eq(t.locale, lang),
            columns: { materialId: false, locale: false },
          },
        },
      })
    : undefined;

  if (!material) {
    throw createError({ statusCode: 404, statusMessage: "Material not found" });
  }

  return flattenI18n(material);
}, API_CACHE);
