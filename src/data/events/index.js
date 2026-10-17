// 出来事をまとめる。分野ごとに数を数えて、件数の下限を content のテストで確かめる。
import { CHILDHOOD_EVENTS } from './childhood.js';
import { EXAM_EVENTS } from './exam-life.js';
import { TAX_OFFICE_EVENTS } from './tax-office.js';
import { CPA_EVENTS } from './cpa.js';
import { LAWYER_EVENTS } from './lawyer.js';
import { CAREER_EVENTS } from './career.js';
import { FAMILY_EVENTS } from './family.js';
import { CAREER_WORK_EVENTS } from './career-work.js';
import { CAREER_OWNER_EVENTS } from './career-owner.js';
import { FAMILY_LIFE_EVENTS } from './family-life.js';
import { RARE_EVENTS } from './rare.js';
import { FLAVOR_EVENTS } from './flavor.js';

export const CONTENT = {
  childhood: CHILDHOOD_EVENTS,
  exam: EXAM_EVENTS,
  taxOffice: TAX_OFFICE_EVENTS,
  cpa: CPA_EVENTS,
  lawyer: LAWYER_EVENTS,
  career: CAREER_EVENTS,
  careerWork: CAREER_WORK_EVENTS,
  careerOwner: CAREER_OWNER_EVENTS,
  family: [...FAMILY_EVENTS, ...FAMILY_LIFE_EVENTS],
  rare: RARE_EVENTS,
  // 何も起きなかった年の一行（出来事のくじには入らない。year.js の planYear が使う）
  flavor: FLAVOR_EVENTS,
};

export const ALL_EVENTS = Object.values(CONTENT).flat();
