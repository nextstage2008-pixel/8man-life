// 年つきの言葉の辞書。その言葉が文に出てよい暦年の範囲（from 以上・to 以下）。
// 文を書いたら sim と content のテストでこの辞書に照らし、時代に合わない言葉を見つける。
export const ANACHRONISM = [
  { word: 'インボイス', from: 2023 },
  { word: '適格請求書', from: 2023 },
  { word: '軽減税率', from: 2019 },
  { word: '消費税10%', from: 2019 },
  { word: '令和', from: 2019 },
  { word: 'e-Tax', from: 2004 },
  { word: '電子申告', from: 2004 },
  { word: '税理士法人', from: 2002 },
  { word: 'マイナンバー', from: 2016 },
  { word: 'スマートフォン', from: 2008 },
  { word: 'スマホ', from: 2008 },
  { word: 'LINE', from: 2011 },
  { word: '生成AI', from: 2022 },
  { word: 'コロナ', from: 2020 },
  { word: 'オンライン会議', from: 2020 },
  { word: 'テレワーク', from: 2020 },
  { word: '在学中受験', from: 2023 },
  { word: '新紙幣', from: 2024 },
  { word: '電子取引データ', from: 2022 },
  { word: '定額減税', from: 2024, to: 2025 },
  { word: '国家公務員の定年が65歳', from: 2031 },
  { word: '18歳で成人', from: 2022 },
  { word: '大阪・関西万博', from: 2025, to: 2025 },
];

// 文の中で、その年に合わない言葉を返す（合っていれば空の配列）。
export function anachronisms(text, year) {
  const out = [];
  for (const { word, from, to } of ANACHRONISM) {
    if (!text.includes(word)) continue;
    if ((from !== undefined && year < from) || (to !== undefined && year > to)) out.push(word);
  }
  return out;
}
