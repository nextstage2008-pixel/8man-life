// 税理士になってからの割合。業界の調査を丸めた値（先生の判断で出典名は書かない）と推定。
export const CAREER = {
  // 登録者の働き方（開業・社員・所属）。所属には企業内も含める
  workStyleShare: { value: { kaigyo: 0.7, shain: 0.1, shozoku: 0.2 }, src: 'industry-survey' },
  // 開業税理士で後継者がいない割合・自分の代で廃業する予定の割合
  noSuccessorShare: { value: 0.8, src: 'industry-survey' },
  closeOwnShare: { value: 0.4, src: 'industry-survey' },
  // 開業したときの顧問先の数（推定）。OB は紹介などで少し多めに始まる
  clientsStart: { value: { from: 2, to: 8 }, estimated: true },
  clientsStartOB: { value: { from: 6, to: 15 }, estimated: true },
  // 開業の年収（万円）＝基本＋顧問先1件あたり（推定。開業の平均所得の丸めた値から逆算）
  incomeBase: { value: 150, estimated: true },
  incomePerClient: { value: 16, estimated: true },
};
