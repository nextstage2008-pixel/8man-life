// 1つの人生の状態。計算はこれを書き換えながら1年ずつ進む。
export function createState() {
  return {
    seed: 0, era: 'heisei',
    birthYear: 0, age: 0, pref: '', residence: '', sex: 'male', name: '', surname: '', tier: 3,
    parents: [], siblings: [], spouse: null, children: [], grandchildren: [],
    // 一緒に暮らす人（場面の絵だけが使う。engine/scene-state.js）
    home: { leftParents: false, parentsBack: false, apartUntil: null, kidsOut: new Set() },
    // 健康・幸福・知識・人間関係（0〜100）
    stats: { hl: 85, h: 60, sm: 50, so: 60 },
    talent: 0, aptitude: 0,
    money: { savings: 0, income: 0 },
    habits: { smoke: false, drink: false, exercise: false },
    illnesses: [],
    mental: null,
    flags: new Set(),
    route: 'exam', aspireAge: 20, aspireKind: '',
    career: {
      phase: 'pre', passed: new Set(), attempts: 0, examYears: 0, firstExamAge: null, kanpouAge: null,
      gradSchool: false, focus: 'normal', fulltime: false,
      taxOfficeEntry: null, taxOfficeYears: 0, post: null,
      cpaPassYear: null, auditYears: 0, lawyerSince: null,
      jitsumuYears: 0, registeredAt: null, workStyle: null, workplaces: [],
      clients: 0, clientsMax: 0, staff: 0, reputation: 50, successor: null, kaigyoAt: null, retiredAt: null,
    },
    alive: true, deathAge: null, deathCause: null,
    usedNames: new Set(), usedTexts: new Set(), lastSeen: new Map(), decisionCounts: new Map(), remembered: new Map(),
    imagineShown: false,
  };
}
