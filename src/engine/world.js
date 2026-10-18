// 出来事・分かれ道・仕組みをまとめて、人生を回す「世界」を作る。
import { askDecision, pickDecisions } from './decisions.js';
import { EXAM_SYSTEM } from './exam.js';
import { TAX_OFFICE_SYSTEM, CPA_SYSTEM, LAWYER_SYSTEM } from './routes-pre.js';
import { CAREER_SYSTEM } from './career.js';
import { ALL_EVENTS } from '../data/events/index.js';
import { PRE_DECISIONS } from '../data/decisions/pre.js';
import { MORE_DECISIONS } from '../data/decisions/more.js';
import { MURI } from '../data/decisions/career.js';
import { LIFE_SYSTEM } from './family.js';
import { deathStep } from './death.js';
import { PEER_SYSTEM } from './peers.js';
import { ARC_SYSTEM } from './arcs.js';
import { SCHOOL_SYSTEM } from './school.js';
import { TURNING_SYSTEM } from './turning.js';
import { PARENTS_SYSTEM } from './parents.js';


export function buildWorld() {
  return {
    events: [...ALL_EVENTS],
    decisions: [MURI, ...PRE_DECISIONS, ...MORE_DECISIONS],
    systems: [SCHOOL_SYSTEM, TURNING_SYSTEM, EXAM_SYSTEM, TAX_OFFICE_SYSTEM, CPA_SYSTEM, LAWYER_SYSTEM, CAREER_SYSTEM, LIFE_SYSTEM, PARENTS_SYSTEM, PEER_SYSTEM, ARC_SYSTEM],
    death: deathStep,
    askDecision,
    pickDecisions,
  };
}
