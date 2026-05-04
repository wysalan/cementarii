export default function useResinCalculator() {
  function formatTime(date: Date) {
    return `${date.getHours().toString().padStart(2, "0")} : ${date.getMinutes().toString().padStart(2, "0")}`;
  }

  function getTimeDiffPrefix(nowTime: Date, today: Date): string {
    if (nowTime.getDay() - today.getDay() === 1) {
      return "明天";
    } else if (nowTime.getDay() - today.getDay() === 2) {
      return "後天";
    } else {
      return "今天";
    }
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

  function getFullResinResult(
    currentResin: number,
    customTime: { hour: number; minute: number },
    useCustomTime?: boolean,
  ) {
    if (currentResin >= 200) return [{ resin: 200, prefix: "", time: "已回滿" }];
    const result: { resin: number; prefix: string; time: string }[] = [];
    const nowTime = new Date();
    if (useCustomTime) {
      nowTime.setHours(customTime.hour);
      nowTime.setMinutes(customTime.minute);
    }
    const today = new Date(nowTime);
    today.setHours(23, 59, 59, 999);

    const resin = Math.max(0, currentResin);
    const maxResin = 200;
    const remainResin = maxResin - resin;

    const resinRecoveryMinutes = 8;

    for (let counter = 0; counter < remainResin; counter++) {
      nowTime.setMinutes(nowTime.getMinutes() + resinRecoveryMinutes);
      currentResin++;
      if (!(currentResin % 10) || currentResin === 200) {
        const prefix = getTimeDiffPrefix(nowTime, today);
        result.push({
          resin: currentResin,
          prefix: prefix,
          time: `${formatTime(nowTime)}`,
        });
        if (currentResin === 200) {
          result.unshift({
            resin: currentResin,
            prefix: prefix,
            time: `${formatTime(nowTime)}`,
          });
        }
      }
    }
    return result;
  }
  return { getSimpleResinResult, getFullResinResult };
}
