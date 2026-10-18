// 税理士になる前の分かれ道（21種類）。どれも統計の重み（推定）のおまかせを持ち、結果は状態を少し動かす。
// 分かれ道の置き場（world.decisions）から、立場と前提で絞って年に2件まで出る。
const D = (id, o) => ({ maxPerLife: 1, ...o, id });
const choice = (k, label, sub) => (sub ? { k, label, sub } : { k, label });
const bump = (st, k, n) => { st.stats[k] = Math.max(0, Math.min(100, st.stats[k] + n)); };
const married = s => !!(s.spouse && s.spouse.alive && !s.spouse.divorced);
const TAX_ALT = ['shohi', 'sozoku', 'choshu', 'kotei', 'shuzei', 'jumin', 'jigyo'];
const GROUP = { shohi: 'a', shuzei: 'a', jumin: 'b', jigyo: 'b' };

export const PRE_DECISIONS = [
  // 学生のころ
  D('bunri', { ages: [16, 16], roles: ['student'], when: (s, ctx) => ctx.rng() < 0.5,
    build: () => ({ title: '文系か理系か', body: '進む道を決める時期になりました。', choices: [choice('bun', '文系に進む'), choice('ri', '理系に進む')] }),
    auto: { bun: 65, ri: 35 },
    apply: k => ({ lines: [{ text: k === 'bun' ? '数学が好きなまま、文系を選びました。' : '理系を選びました。将来のことは、まだ分かりませんでした。' }] }) }),
  D('bukatsu-tsuzukeru', { ages: [14, 14], roles: ['student'], when: (s, ctx) => ctx.rng() < 0.4, needs: s => s.school.bukatsu,
    build: () => ({ title: '部活を続けますか', body: '受験の勉強の時間が足りなくなってきました。', choices: [choice('keep', '最後まで続ける'), choice('quit', 'やめて勉強する')] }),
    auto: { keep: 65, quit: 35 },
    apply: k => ({ lines: [{ text: k === 'keep' ? '最後の大会まで続けると決めました。' : '部活をやめ、塾に通うことにしました。' }], apply: st => (k === 'keep' ? bump(st, 'so', 3) : bump(st, 'sm', 3)) }) }),
  D('jimoto-tokai', { ages: [18, 18], when: () => true, needs: s => s.flags.has('will-univ'),
    build: s => ({ title: 'どこの大学に行きますか', body: `${s.pref}を出るかどうか、迷っています。`, choices: [choice('jimoto', '地元の大学に行く'), choice('tokai', '都会の大学に行く', '一人暮らしが始まる')] }),
    auto: { jimoto: 50, tokai: 50 },
    apply: k => ({ lines: [{ text: k === 'jimoto' ? '地元の大学に進むことにしました。' : '都会の大学に進むことにしました。' }], apply: st => { if (k === 'tokai') st.residence = '東京都'; } }) }),
  // 18歳で事務所や会社に勤めて志す人は、その年の3月から働くので聞かない
  D('shinro-18', { ages: [18, 18], when: () => true, needs: s => !s.flags.has('will-univ') && s.route !== 'tax-office' && !(s.aspireAge <= 18 && ['jimusho', 'keiri'].includes(s.aspireKind)),
    build: () => ({ title: '高校を出たらどうしますか', body: '進路を決める時期になりました。', choices: [choice('shushoku', '就職する'), choice('senmon', '専門学校で簿記を学ぶ')] }),
    auto: { shushoku: 55, senmon: 45 },
    apply: k => ({ lines: [{ text: k === 'shushoku' ? '地元の会社に就職しました。' : '専門学校の会計の科に入りました。' }], apply: st => { if (k === 'senmon') { st.flags.add('boki1'); st.school.senmon = true; st.schoolEndAge = 20; } else st.flags.add('shushoku'); } }) }),
  // 試験組
  D('yobiko-dokugaku', { roles: ['aspirant', 'examinee'], when: () => true, needs: s => s.route === 'exam' && s.career.examYears <= 1,
    build: () => ({ title: 'どうやって勉強しますか', body: '税理士試験の勉強の仕方を決めます。', choices: [choice('yobiko', '予備校に通う', '費用はかかるが、教材と講義がそろう'), choice('dokugaku', '独学でやる', '費用は少ないが、全部自分で決める')] }),
    auto: { yobiko: 80, dokugaku: 20 },
    apply: k => ({ lines: [{ text: k === 'yobiko' ? '予備校に通うことにしました。' : '本と過去問で、独学でやることにしました。' }], apply: st => { st.career.method = k; } }) }),
  D('kamoku-kaeru', { roles: ['examinee'], when: () => true, maxPerLife: 2,
    needs: s => s.route === 'exam' && !!s.career.taxPlan && Object.entries(s.career.tries ?? {}).some(([id, n]) => n >= 3 && !['boki', 'zaihyo', 'hojin', 'shotoku'].includes(id) && !s.career.passed.has(id)),
    build: s => {
      const id = Object.entries(s.career.tries).find(([x, n]) => n >= 3 && !['boki', 'zaihyo', 'hojin', 'shotoku'].includes(x) && !s.career.passed.has(x))[0];
      return { title: '科目を変えますか', body: '同じ科目で、三回届きませんでした。', choices: [choice('change', '別の科目に変える', '一から勉強し直す'), choice('keep', 'この科目で続ける', 'これまでの勉強を生かす')], _id: id };
    },
    auto: { change: 35, keep: 65 },
    apply: (k, s) => {
      if (k === 'keep') return { lines: [{ text: 'もう一度、同じ科目に挑むことにしました。' }] };
      const id = Object.entries(s.career.tries).find(([x, n]) => n >= 3 && !['boki', 'zaihyo', 'hojin', 'shotoku'].includes(x) && !s.career.passed.has(x))[0];
      return { lines: [{ text: '科目を変え、新しい教材を買いそろえました。' }], apply: st => {
        const plan = st.career.taxPlan;
        const used = new Set(plan.map(x => GROUP[x] ?? x));
        const alt = TAX_ALT.find(x => !plan.includes(x) && !used.has(GROUP[x] ?? x) && !st.career.passed.has(x));
        if (alt) plan[plan.indexOf(id)] = alt;
      } };
    } }),
  D('senen-switch', { roles: ['examinee'], when: (s, ctx) => ctx.rng() < 0.3, needs: s => s.route === 'exam' && ['jimusho', 'keiri'].includes(s.career.job) && s.career.examYears >= 3 && s.age <= 45,
    build: () => ({ title: '仕事を辞めて専念しますか', body: '働きながらの受験が、何年も続いています。', choices: [choice('senen', '辞めて勉強に専念する', '合格しやすくなるが、収入がなくなる'), choice('keep', '働きながら続ける')] }),
    auto: { senen: 20, keep: 80 },
    apply: k => ({ lines: [{ text: k === 'senen' ? '仕事を辞め、一年だけ勉強に専念すると決めました。' : '働きながら続けることにしました。' }], apply: st => { if (k === 'senen') { st.career.job = 'senen'; st.career.fulltime = true; } } }) }),
  D('yasumu', { roles: ['examinee'], when: (s, ctx) => ctx.rng() < 0.3, needs: s => s.route === 'exam' && s.career.examYears >= 5,
    build: () => ({ title: '受験を続けますか', body: '受験を始めて、何年もたちました。', choices: [choice('keep', '今年も受ける'), choice('rest', '一年休む', '気持ちを立て直す')] }),
    auto: { keep: 80, rest: 20 },
    apply: k => ({ lines: [{ text: k === 'keep' ? '今年も申し込むことにしました。' : '今年は一年休むことにしました。' }], apply: st => { if (k === 'rest') { st.flags.add('rest-year'); bump(st, 'h', 5); } } }) }),
  D('kekkonshiki', { roles: ['examinee'], when: (s, ctx) => ctx.rng() < 0.08, needs: s => s.age <= 40,
    build: () => ({ title: '友だちの結婚式', body: '本試験の前の週に、友だちの結婚式があります。', choices: [choice('go', '出席する'), choice('skip', '欠席して勉強する')] }),
    auto: { go: 50, skip: 50 },
    apply: k => ({ lines: [{ text: k === 'go' ? '結婚式に出て、帰りの電車で理論を復習しました。' : 'お祝いの手紙を送り、結婚式は欠席しました。' }], apply: st => bump(st, 'so', k === 'go' ? 4 : -3) }) }),
  D('jimusho-kaeru', { roles: ['examinee'], when: (s, ctx) => ctx.rng() < 0.25, needs: s => s.route === 'exam' && s.career.job === 'jimusho' && s.career.examYears >= 2,
    build: () => ({ title: '事務所を移りますか', body: '残業が多く、勉強の時間が取れません。', choices: [choice('move', '受験に理解のある事務所に移る'), choice('stay', '今の事務所に残る')] }),
    auto: { move: 30, stay: 70 },
    apply: k => ({ lines: [{ text: k === 'move' ? '受験生を応援してくれる事務所に移りました。' : '今の事務所で続けることにしました。' }], apply: st => { if (k === 'move') st.career.focus = 'study'; } }) }),
  D('chokuzen-kyuka', { roles: ['examinee'], when: (s, ctx) => ctx.rng() < 0.15, needs: s => s.route === 'exam' && ['jimusho', 'keiri'].includes(s.career.job), maxPerLife: 2,
    build: () => ({ title: '直前期に休みを取りますか', body: '本試験まで、あと一か月です。', choices: [choice('take', '休みを取る', '職場に頼む'), choice('no', 'いつも通り働く')] }),
    auto: { take: 50, no: 50 },
    apply: k => ({ lines: [{ text: k === 'take' ? '職場に頭を下げ、試験前の二週間の休みをもらいました。' : '試験の前の日まで、いつも通り働きました。' }], apply: st => { if (k === 'take') st.career.focusBoostAge = st.age; } }) }),
  // 税務署
  D('kyoku-kibou', { roles: ['tax-office'], when: (s, ctx) => ctx.rng() < 0.3, needs: s => s.career.taxOfficeYears >= 8 && s.career.taxOfficeYears <= 20,
    build: () => ({ title: '国税局に行きますか', body: '国税局への異動の希望を聞かれました。', choices: [choice('kyoku', '国税局を希望する', '大きな会社の調査に関われる'), choice('sho', '税務署に残る')] }),
    auto: { kyoku: 40, sho: 60 },
    apply: k => ({ lines: [{ text: k === 'kyoku' ? '国税局への異動を希望しました。' : '税務署で、地域の仕事を続けることにしました。' }], apply: st => { if (k === 'kyoku') st.flags.add('kyoku'); } }) }),
  D('tanshin-or-kazoku', { roles: ['tax-office'], when: (s, ctx) => ctx.rng() < 0.3, needs: s => married(s) && s.career.taxOfficeYears >= 5,
    build: () => ({ title: '転勤が決まりました', body: '遠くの税務署への転勤の内示が出ました。', choices: [choice('kazoku', '家族で引っ越す'), choice('tanshin', '単身で赴任する')] }),
    auto: { kazoku: 60, tanshin: 40 },
    apply: k => ({ lines: [{ text: k === 'kazoku' ? '家族そろって、新しい町に引っ越しました。' : '家族を残し、一人で新しい町に移りました。' }], apply: st => bump(st, 'so', k === 'tanshin' ? -4 : 1) }) }),
  D('chosa-choshu', { roles: ['tax-office'], when: () => true, needs: s => s.career.taxOfficeYears >= 3 && s.career.taxOfficeYears <= 6,
    build: () => ({ title: 'どの仕事を希望しますか', body: '次の異動の希望を出す時期です。', choices: [choice('fuka', '調査の部署', '申告を確かめる仕事'), choice('choshu', '徴収の部署', '税を納めてもらう仕事')] }),
    auto: { fuka: 75, choshu: 25 },
    apply: k => ({ lines: [{ text: k === 'fuka' ? '調査の部署を希望しました。' : '徴収の部署を希望しました。' }], apply: st => { st.career.duty = k; } }) }),
  D('kanri-mezasu', { roles: ['tax-office'], when: () => true, needs: s => s.career.post === '上席' && s.career.taxOfficeYears >= 14 && s.career.taxOfficeYears <= 18,
    build: () => ({ title: '管理職を目指しますか', body: '上司に、この先のことを聞かれました。', choices: [choice('aim', '管理職を目指す'), choice('genba', '現場の調査を続ける')] }),
    auto: { aim: 65, genba: 35 },
    apply: k => ({ lines: [{ text: k === 'aim' ? '管理職を目指すと答えました。' : '現場の仕事を続けたいと答えました。' }], apply: st => { if (k === 'genba') st.career.noPromote = true; } }) }),
  // 公認会計士
  D('ipo-team', { roles: ['cpa'], when: (s, ctx) => ctx.rng() < 0.3, needs: s => s.career.auditYears >= 2,
    build: () => ({ title: 'どのチームに入りますか', body: '担当の希望を聞かれました。', choices: [choice('ipo', '上場の準備を手伝うチーム'), choice('kansa', 'いつもの監査のチーム')] }),
    auto: { ipo: 30, kansa: 70 },
    apply: k => ({ lines: [{ text: k === 'ipo' ? '上場を目指す会社を手伝うチームに入りました。' : 'これまで通り、監査のチームで働くことにしました。' }], apply: st => { if (k === 'ipo') st.career.reputation += 3; } }) }),
  D('kaigai-funin', { roles: ['cpa'], when: (s, ctx) => ctx.rng() < 0.15, needs: s => s.career.auditYears >= 4 && s.career.auditYears <= 10,
    build: () => ({ title: '海外の事務所に行きますか', body: '海外の事務所で二年働かないかと言われました。', choices: [choice('go', '行く'), choice('no', '断る')] }),
    auto: { go: 15, no: 85 },
    apply: k => ({ lines: [{ text: k === 'go' ? '海外の事務所に赴任しました。' : '今回は断ることにしました。' }], apply: st => { if (k === 'go') st.career.auditTarget += 2; } }) }),
  D('cpa-zei-junbi', { roles: ['cpa'], when: (s, ctx) => ctx.rng() < 0.3, needs: s => s.career.auditYears >= 2,
    build: () => ({ title: '税の勉強を始めますか', body: '税の仕事に興味が湧いてきました。', choices: [choice('start', '税法の勉強会に通う'), choice('later', '今は監査に集中する')] }),
    auto: { start: 50, later: 50 },
    apply: k => ({ lines: [{ text: k === 'start' ? '仕事のあとに、税法の勉強会に通い始めました。' : '今は監査に集中すると決めました。' }], apply: st => { if (k === 'start') st.career.auditTarget = Math.max(st.career.auditYears + 1, st.career.auditTarget - 2); } }) }),
  // 弁護士
  D('law-route', { roles: ['law-exam'], when: () => true, needs: s => !s.career.lawPassed && !s.decisionCounts.has('law-route'),
    build: () => ({ title: 'どの道で司法試験を目指しますか', body: '司法試験の受験資格を得る道は二つあります。', choices: [choice('school', '法科大学院に進む'), choice('yobi', '予備試験を受ける', '狭き門だが、早く受けられる')] }),
    auto: { school: 70, yobi: 30 },
    apply: k => ({ lines: [{ text: k === 'school' ? '法科大学院に進むことにしました。' : '予備試験から目指すことにしました。' }], apply: st => { st.flags.add(k === 'yobi' ? 'yobi' : 'law-school'); } }) }),
  D('shushu-kibou', { roles: ['law-exam'], when: () => true, needs: s => !!s.career.lawPassed,
    build: s => ({ title: '修習の希望', body: '司法修習の配属先の希望を出します。', choices: [choice('jimoto', `${s.pref}の近くを希望する`), choice('tokai', '大きな町を希望する')] }),
    auto: { jimoto: 50, tokai: 50 },
    apply: k => ({ lines: [{ text: k === 'jimoto' ? '地元の近くを希望しました。' : '大きな町の裁判所を希望しました。' }] }) }),
  D('kigyonai-ben', { roles: ['lawyer'], when: (s, ctx) => ctx.rng() < 0.3, needs: s => s.career.lawyerSince != null && s.age - s.career.lawyerSince >= 2 && s.age - s.career.lawyerSince <= 8,
    build: () => ({ title: '会社の中で働きますか', body: '知り合いの会社から、法務部に来ないかと誘われました。', choices: [choice('stay', '法律事務所に残る'), choice('kigyo', '会社の法務部に移る')] }),
    auto: { stay: 85, kigyo: 15 },
    apply: k => ({ lines: [{ text: k === 'stay' ? '法律事務所に残ることにしました。' : '会社の法務部に移りました。' }], apply: st => { if (k === 'kigyo') st.career.workplaces.push('会社の法務部'); } }) }),
];
