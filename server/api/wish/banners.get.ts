/** 歷期祈願卡池與 UP 物品，用來判斷抽到的物品是不是當期 UP、每一抽屬於哪個版本 */
export default defineCachedEventHandler(async (event) => {
  return useDb(event).query.wishBanners.findMany({
    columns: { id: false, createdAt: false, updatedAt: false },
    orderBy: (b, { asc }) => asc(b.startsAt),
  });
}, API_CACHE);
