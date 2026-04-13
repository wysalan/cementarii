export default function useResinCalculator() {
  function formatTime(date: Date) {
    return `${date.getHours().toString().padStart(2, "0")} : ${date.getMinutes().toString().padStart(2, "0")}`;
  }

  function getSimpleResinResult(currentResin: number) {
    if (currentResin >= 200) return "已回滿";

    const nowTime = new Date();
    const today = new Date(nowTime);
    today.setHours(23, 59, 59, 999);

    const resin = Math.max(0, currentResin);
    const maxResin = 200;

    const neededMinutes = (maxResin - resin) * 8;
    nowTime.setMinutes(nowTime.getMinutes() + neededMinutes);
    const prefix = nowTime > today ? "明天" : "今天";

    return `${prefix} ${formatTime(nowTime)}`;
  }
  return { getSimpleResinResult };
}
