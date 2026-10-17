// 家族・健康・老後の出来事と、決まった場面の文。
// 夫婦の出来事は couple: true（配偶者が生きていて結婚しているときだけ）、子・孫の出来事は前提で絞る。
const married = s => !!(s.spouse && s.spouse.alive && !s.spouse.divorced);

// 確定申告の時期が忙しい人（税理士の事務所・税務署・会計事務所で働く受験生）
const busySeason = s => (s.career.phase === 'registered' && s.career.workStyle !== 'kigyonai') || s.career.phase === 'tax-office' || (s.route === 'exam' && s.career.job === 'jimusho' && s.career.phase !== 'retired' && s.career.phase !== 'registered');
// 試験に向けて勉強している人
const studying = s => ['aspirant', 'examinee', 'cpa-exam', 'law-exam'].includes(s.career.phase);

export const FAMILY_EVENTS = [
  { id: 'fufu-ryoko', ages: [25, 85], gap: 6, couple: true, needs: married, p: () => 0.15, kind: 'warm',
    texts: [s => `${s.spouse.name}と、久しぶりに二人で旅行に出かけました。`, s => `結婚記念日に、${s.spouse.name}と近所の店で食事をしました。`] },
  { id: 'fufu-kenka', ages: [25, 80], gap: 8, couple: true, needs: married, p: () => 0.1, kind: 'ev',
    texts: [{ text: s => `確定申告の時期に帰りが遅い日が続き、${s.spouse.name}とけんかになりました。翌朝、二人分のお茶をいれました。`, needs: busySeason }, s => `仕事の話ばかりしていて、${s.spouse.name}に「たまには休んで」と言われました。`] },
  { id: 'fufu-sasae', ages: [25, 80], gap: 10, couple: true, needs: married, p: () => 0.08, kind: 'warm',
    texts: [{ text: s => `試験の前の晩、${s.spouse.name}が何も聞かずに夜食を作ってくれました。`, needs: studying }, s => `落ち込んで帰った日、${s.spouse.name}は黙って隣に座ってくれました。`] },
  { id: 'fufu-rogo', ages: [65, 100], gap: 6, couple: true, needs: married, p: () => 0.15, kind: 'warm',
    texts: [s => `${s.spouse.name}と、朝の散歩が日課になりました。`, s => `${s.spouse.name}と縁側で、昔の話をしました。`] },
  { id: 'ko-nyugaku', ages: [28, 70], gap: 4, needs: s => s.children.some(c => s.age - c.bornAge === 6), p: () => 0.6, kind: 'warm',
    texts: [s => `${s.children.find(c => s.age - c.bornAge === 6).name}が小学校に入りました。ランドセルが大きく見えました。`, s => `${s.children.find(c => s.age - c.bornAge === 6).name}の入学式に出ました。体育館の後ろから、何度も背伸びして見ました。`] },
  { id: 'ko-seijin', ages: [40, 80], gap: 3, needs: s => s.children.some(c => s.age - c.bornAge === 20), p: () => 0.5, kind: 'warm',
    texts: [s => `${s.children.find(c => s.age - c.bornAge === 20).name}が20歳になりました。`, s => `${s.children.find(c => s.age - c.bornAge === 20).name}が二十歳になり、初めて一緒にお酒を飲みました。`] },
  { id: 'mago-asobi', ages: [50, 100], gap: 4, needs: s => s.grandchildren.some(g => s.age - g.bornAge >= 3), p: () => 0.25, kind: 'warm',
    texts: [s => `孫の${s.grandchildren[0].name}と公園に行きました。`, s => `孫が遊びに来て、家の中がにぎやかになりました。`] },
  { id: 'oya-kaigo', ages: [45, 75], gap: 6, needs: s => s.parents.some(p => p.alive && p.age + s.age >= 80), p: () => 0.2, kind: 'ev',
    texts: [() => '親の通院に付き添うため、仕事を早めに切り上げる日が増えました。', () => '実家に帰るたびに、親の背中が小さくなったように見えました。'] },
  { id: 'kenko-shindan', ages: [40, 90], gap: 5, p: () => 0.12, kind: 'ev',
    texts: ['健康診断で、医者に少し痩せるように言われました。', '人間ドックの結果を、しばらく机の引き出しに入れたままにしていました。'] },
];

export const FAMILY_TEXTS = {
  marry: [s => `${s._name}と結婚しました。`, s => `${s._name}と結婚しました。小さな式を挙げました。`],
  childBorn: [s => `${s._name}が生まれました。`, s => `${s._name}が生まれました。小さな手が指をにぎり返しました。`],
  childMarry: [s => `${s._name}が結婚しました。`],
  firstJob: {
    univ: ['大学を出て、会社に就職しました。', '大学を卒業し、春から会社で働き始めました。'],
    senmon: ['専門学校を出て、会社で働き始めました。', '専門学校を卒業し、地元の会社に就職しました。'],
    kou: ['高校を出て、会社で働き始めました。', '高校を卒業し、地元の会社に就職しました。'],
  },
  grandBorn: [s => `孫の${s._name}が生まれました。`, s => `初孫の${s._name}が生まれました。`],
  parentDie: [s => `${s._who}の${s._name}が亡くなりました。`, s => `${s._who}の${s._name}を見送りました。`],
  spouseDie: [s => `${s._name}が亡くなりました。`, s => `長く連れ添った${s._name}を見送りました。`],
  divorce: [s => `${s._name}と離婚しました。`],
  ill: {
    cancer: ['がんが見つかりました。治療が始まりました。', '検査でがんが見つかり、手術を受けました。', '別の場所に、またがんが見つかりました。'],
    heart: ['心臓の病気が見つかりました。', '胸の痛みで病院に運ばれ、心臓の病気と分かりました。', '心臓の病気が再び悪くなり、入院しました。'],
    stroke: ['脳卒中で倒れ、しばらく入院しました。', '言葉が出にくくなり、脳卒中と分かりました。リハビリが始まりました。', 'また脳卒中で倒れ、入院しました。'],
  },
  mentalStart: ['眠れない日が続き、朝、体が動かなくなりました。', '何をしても楽しいと思えない日が続きました。', '仕事に向かう電車の中で、急に息が苦しくなりました。', '夜中に何度も目が覚め、朝が来るのがつらくなりました。'],
  mentalRecover: ['少しずつ、朝起きるのがつらくなくなってきました。', '気がつくと、また笑える日が増えていました。', '散歩に出られる日が、少しずつ増えました。', '久しぶりに、好きだった本を最後まで読めました。'],
  // 死因ごとの最期の文（自殺は場面を描かない）
  death: {
    cancer: [s => `${s._age}歳で、がんのため亡くなりました。`, s => `${s._age}歳の冬、がんとの長い闘いを終えました。`],
    heart: [s => `${s._age}歳で、心臓の病気のため亡くなりました。`, s => `${s._age}歳のある朝、心臓の発作で亡くなりました。`],
    senility: [s => `${s._age}歳で、老衰のため亡くなりました。`, s => `${s._age}歳で、眠るように息を引き取りました。`],
    stroke: [s => `${s._age}歳で、脳卒中のため亡くなりました。`, s => `${s._age}歳で倒れ、そのまま目を覚ましませんでした。`],
    pneumonia: [s => `${s._age}歳で、肺炎のため亡くなりました。`, s => `${s._age}歳の冬、肺炎をこじらせて亡くなりました。`],
    accident: [s => `${s._age}歳で、不慮の事故のため亡くなりました。`, s => `${s._age}歳で、思いがけない事故に遭い亡くなりました。`],
    liver: [s => `${s._age}歳で、肝臓の病気のため亡くなりました。`, s => `${s._age}歳で、長く患った肝臓の病気のため亡くなりました。`],
    other: [s => `${s._age}歳で、病気のため亡くなりました。`, s => `${s._age}歳で、静かに生涯を終えました。`],
    suicide: [s => `${s._age}歳で、自殺により亡くなりました。`, s => `${s._age}歳で、自殺により生涯を閉じました。`],
  },
  seeOff: [s => `${s._who}に見守られて、静かに息を引き取りました。`],
  lastWords: ['最後に「いい仕事だった」と言いました。', '最後に、家族に「ありがとう」と言いました。', '最後まで、顧問先のことを気にかけていました。'],
};

// 自殺で亡くなったときに出す相談先（公開前に番号と名称を確かめる）
// 相談先（設計書6.6）。番号とつながる先は厚生労働省「まもろうよ こころ」の電話相談窓口のページで確かめた（2026-10-17）
export const SUPPORT_LINES = [
  'つらい気持ちを一人で抱えている方は、身近な人や専門の窓口に話してみてください。',
  'こころの健康相談統一ダイヤル：0570-064-556（かけた所の都道府県・政令指定都市の公的な相談窓口につながります。通話料がかかります）',
  'ほかの窓口（無料や24時間の電話、SNSの相談）は、厚生労働省「まもろうよ こころ」にあります：https://www.mhlw.go.jp/mamorouyokokoro/',
];
