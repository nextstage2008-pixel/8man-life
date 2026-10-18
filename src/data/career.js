// 税理士になってからの割合。業界の調査をもとに丸めた値と推定。
export const CAREER = {
  // 登録者の働き方（開業・社員・所属）。所属には企業内も含める
  workStyleShare: { value: { kaigyo: 0.7, shain: 0.1, shozoku: 0.2 }, src: 'industry-survey' },
  // 開業税理士で後継者がいない割合・自分の代で廃業する予定の割合
  noSuccessorShare: { value: 0.8, src: 'industry-survey' },
  closeOwnShare: { value: 0.4, src: 'industry-survey' },
  // 開業したときの顧問先の数（推定）。OB は紹介などで少し多めに始まる
  clientsStart: { value: { from: 2, to: 8 }, estimated: true },
  clientsStartOB: { value: { from: 6, to: 15 }, estimated: true },
  // 年収は data/money.js（MONEY）にまとめた
};
