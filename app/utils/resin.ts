function formatTime(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function getTimeDiffPrefix(date: Date, now: Date): string {
  // round 用來吸收日光節約造成的 23/25 小時
  const days = Math.round(
    (new Date(date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86400000,
  );
  return ["今天", "明天", "後天"][days] ?? `${date.getMonth() + 1}/${date.getDate()}`;
}

export function getFullResinResult(currentResin: number, start?: Date, now = new Date()) {
  const time = new Date(start ?? now);
  if (currentResin >= 200) return [{ resin: 200, prefix: "", time: "已回滿", date: time }];
  const result: { resin: number; prefix: string; time: string; date: Date }[] = [];

  let resin = Math.max(0, currentResin);
  const maxResin = 200;
  const remainResin = maxResin - resin;

  const resinRecoveryMinutes = 8;

  for (let counter = 0; counter < remainResin; counter++) {
    time.setMinutes(time.getMinutes() + resinRecoveryMinutes);
    resin++;
    if (!(resin % 10) || resin === maxResin) {
      const row = {
        resin,
        prefix: getTimeDiffPrefix(time, now),
        time: formatTime(time),
        date: new Date(time),
      };
      result.push(row);
      if (resin === maxResin) result.unshift(row);
    }
  }
  return result;
}
