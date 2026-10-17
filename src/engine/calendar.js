// 暦年はここで1か所だけ出す（時代に合わない出来事を防ぐため）。
export function calendarYear(birthYear, age) {
  return birthYear + age;
}

// 月を1年の中の時刻 t（0〜1）にする。月の真ん中に置く。
export function monthT(month) {
  return (month - 0.5) / 12;
}
