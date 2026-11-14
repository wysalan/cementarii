// Noto Sans TC 依字元範圍分成上百個子集，瀏覽器遇到新的字才下載對應的子集，
// 切換分頁、技能時新出現的字會先用系統字型顯示再換回來，看起來像文字閃爍。
// 頁面資料載入後，趁空檔把資料與介面文字用到的子集先載好。
export default defineNuxtPlugin((nuxtApp) => {
  const requested = new Set<string>();

  const warmUp = () => {
    // 使用者開啟省流量模式時不預先下載
    if ((navigator as { connection?: { saveData?: boolean } }).connection?.saveData) return;
    const i18n = nuxtApp.$i18n;
    const text =
      JSON.stringify(nuxtApp.payload.data) +
      JSON.stringify(i18n.getLocaleMessage(i18n.locale.value));
    const chars = [...new Set(text)].filter((c) => !requested.has(c));
    if (!chars.length) return;
    for (const c of chars) requested.add(c);
    document.fonts.load('1em "Noto Sans TC Variable"', chars.join("")).catch(() => {});
  };

  nuxtApp.hook("page:finish", () => {
    (window.requestIdleCallback ?? setTimeout)(warmUp);
  });
});
