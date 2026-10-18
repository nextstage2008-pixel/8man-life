// 税理士になってからの出来事（作業15で仕組みに要るものを置き、作業19で数を増やす）。
// 実在の事務所・人物の名前は出さない。細かい手続き・金額には踏み込まない。
const REG = ['employed', 'partner', 'owner'];

export const CAREER_EVENTS = [
  { id: 'chosa-tachiai', ages: [25, 90], roles: REG, gap: 2, p: () => 0.25, kind: 'ev',
    texts: ['顧問先に税務調査が入り、立ち会いました。', '税務調査の立ち会いで、三日間、会社の会議室に詰めました。', '調査官の質問に一つずつ答えました。指摘は小さなもので済みました。', '税務調査の連絡が入りました。帳簿を見直して、その日を待ちました。'] },
  { id: 'shinki-komon', ages: [25, 85], roles: ['owner'], gap: 1, p: () => 0.35, kind: 'warm',
    texts: ['知り合いの紹介で、新しい顧問先が増えました。', '開業したばかりの社長から、顧問の依頼が来ました。', '昔の顧問先の社長が、取引先を紹介してくれました。', '相談に来た個人事業主が、そのまま顧問先になりました。'],
    fx: { h: 1 }, fxClients: 1 },
  { id: 'kaiyaku', ages: [25, 90], roles: ['owner'], gap: 2, p: () => 0.12, kind: 'bad',
    needs: s => s.career.clients > 2, fxClients: -1,
    texts: ['顧問先から、来年から別の事務所に頼むと言われました。', '顧問料の値下げの相談がまとまらず、顧問先が一つ減りました。', '社長が会社をたたむことになり、顧問先が一つ減りました。'] },
  { id: 'shacho-shokei', ages: [40, 90], roles: ['owner', 'partner'], gap: 4, p: () => 0.12, kind: 'ev',
    texts: ['顧問先の社長から、息子に会社を継がせたいと相談されました。', '顧問先の社長が引退し、娘さんが後を継ぎました。挨拶に来た新しい社長と、長い時間話しました。', '後継ぎのいない顧問先の社長と、会社を譲る先を一緒に考えました。'] },
  { id: 'tousan', ages: [30, 90], roles: ['owner'], gap: 6, p: (s, ctx) => (ctx.year === 2008 || ctx.year === 2009 || ctx.year === 2020 ? 0.3 : 0.05), kind: 'loss',
    needs: s => s.career.clients > 3, fxClients: -1, cost: 'tousan',
    texts: ['顧問先の会社が倒産しました。最後の決算書を作ったのは自分でした。', '長く付き合った顧問先が、資金繰りに行き詰まって店を閉めました。'] },
  { id: 'kakutei-isogashii', ages: [24, 80], roles: REG, gap: 3, p: () => 0.2, kind: 'ev',
    texts: ['確定申告の時期、事務所の電気が夜遅くまで消えませんでした。', '3月15日の夜、最後の申告を出し終えて、事務所の床に座り込みました。', '確定申告の時期、休みのない日が続きました。'] },
  { id: 'kessan-5gatsu', ages: [24, 80], roles: REG, gap: 3, p: () => 0.15, kind: 'ev',
    texts: ['5月、3月決算の会社の申告が重なり、机の上に書類が積み上がりました。', '5月の連休も、決算の数字を追いかけていました。'] },
  { id: 'kenshu', ages: [25, 85], roles: REG, gap: 3, p: () => 0.15, kind: 'ev',
    texts: ['税理士会の研修に出ました。改正の話を、ノートにびっしり書きました。', '夜の研修会に出て、同じ支部の税理士と顔見知りになりました。'] },
  { id: 'kouhai', ages: [30, 70], roles: ['employed', 'partner'], gap: 5, p: () => 0.12, kind: 'warm',
    texts: ['新しく入った職員に、申告書の見方を教えました。', '後輩の税理士試験の合格を、事務所のみんなで祝いました。'] },
  { id: 'ob-shoukai', ages: [55, 75], roles: ['owner'], p: () => 0.6, kind: 'ev',
    needs: s => s.route === 'tax-office' && s.age - s.career.kaigyoAt <= 2,
    texts: ['税務署のころの先輩が、知り合いの会社を紹介してくれました。', '開業の挨拶状を出すと、税務署で一緒に働いた人から連絡が来ました。'],
    fxClients: 2 },
  { id: 'nengajo', ages: [60, 110], roles: ['retired'], gap: 3, p: () => 0.25, kind: 'warm', needs: s => s.age - s.career.retiredAt <= 15,
    texts: ['昔の顧問先の社長から、年賀状が届きました。', '元の顧問先の二代目から、決算の報告に来たいと連絡がありました。', '引退したあとも、昔の顧問先から相談の電話がかかってきました。'] },
];

