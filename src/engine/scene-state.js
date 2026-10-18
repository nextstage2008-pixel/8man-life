// 場面の絵のための状態（題名と場面の絵の設計書 4.4・4.5）。人生の計算の結果には使わない（乱数と結果は変えない）。
// 一緒に暮らす人は、出した行の文から決める（文と絵が食い違わないように）。文の決まりはこの表の1か所。
export const HOME_TEXT_RULES = [
  { fx: 'leave-parents', re: /一人暮らしを始めました|駅で家族に見送られました|都会の大学に進むことにしました|寮に入りました|独身寮|官舎に入りました/ },
  { fx: 'kid-out', re: /が家を出て、部屋が一つ空きました/ },
  { fx: 'parents-back', re: /年を取った親と、一緒に暮らすことになりました|実家に戻り、親と同じ食卓|親を家に迎え/ },
  { fx: 'apart', re: /単身で赴任しました|単身赴任の部屋で/ },
];

const AT_HOME_UNTIL = 22; // 出来事がなくても、本人と子はこの年で家を出る
const APART_YEARS = 2; // 単身赴任で家族を描かない年数（赴任した年からこの年数のあとの年まで）

export function homeFxOf(text) {
  return HOME_TEXT_RULES.find(r => r.re.test(text))?.fx ?? null;
}

export function applyHome(s, fx, age = s.age) {
  const h = s.home;
  if (fx === 'leave-parents') h.leftParents = true;
  else if (fx === 'parents-back') h.parentsBack = true;
  else if (fx === 'apart') h.apartUntil = age + APART_YEARS;
  else if (fx === 'kid-out') for (const c of s.children) if (age - c.bornAge === 18) h.kidsOut.add(c.name);
}

// いまの場面の状態（行ごとに添える）
// age：その行の年齢（年の終わりの処理の行は、出す時にはもう年齢が進んでいるため、行の年齢で数える）
export function sceneState(s, age = s.age) {
  const h = s.home;
  const married = !!(s.spouse && s.spouse.alive && !s.spouse.divorced);
  const withParents = !h.leftParents && !s.spouse && age < AT_HOME_UNTIL;
  const apart = h.apartUntil != null && age <= h.apartUntil;
  // 家族は男女と年つきで渡す（生まれの札・文と同じ人を描く）。きょうだいは、まだ生まれていない人と、家を出る年を過ぎた人を外す
  const parents = withParents || h.parentsBack ? s.parents.filter(p => p.alive).map(p => ({ sex: p.role === 'mother' ? 'female' : 'male' })) : [];
  const siblings = withParents ? s.siblings.filter(b => b.alive !== false).map(b => ({ age: age - (b.birthYear - s.birthYear), sex: b.sex })).filter(b => b.age >= 0 && b.age < AT_HOME_UNTIL) : [];
  const kids = s.children.filter(c => c.alive !== false && !h.kidsOut.has(c.name) && age - c.bornAge < AT_HOME_UNTIL).map(c => ({ age: age - c.bornAge, sex: c.sex }));
  return {
    age, sex: s.sex, route: s.route ?? null, phase: s.career.phase, workStyle: s.career.workStyle ?? null, job: s.career.job ?? null,
    residence: s.residence || s.pref, surname: s.surname, univ: s.flags.has('will-univ'),
    // 単身赴任の間は、家族を残して一人で暮らす
    apart,
    spouse: married && !apart,
    kids: apart ? [] : kids,
    parents: apart ? [] : parents,
    siblings: apart ? [] : siblings,
    grandkids: s.grandchildren.length,
    alive: s.alive,
  };
}
