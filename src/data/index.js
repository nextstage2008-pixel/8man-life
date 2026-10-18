// データを1つにまとめる。計算（src/engine）はこれを受け取って使う。
import { DATA_VERSION, SOURCES } from './meta.js';
import { SEIDO } from './seido.js';
import { EXAM } from './exam.js';
import { ROUTES } from './routes.js';
import { PRE } from './pre-routes.js';
import { LIFE, CAUSES } from './life.js';
import { PREFS } from './prefs.js';
import { NAMES, SURNAMES } from './names.js';
import { HISTORY, IMAGINE_LINE_YEAR } from './history.js';
import { ANACHRONISM } from './anachronism.js';
import { ROLES } from './roles.js';
import { ERA_HEISEI } from './era-heisei.js';
import { MONEY } from './money.js';

export const DATA = {
  DATA_VERSION, SOURCES, SEIDO, EXAM, ROUTES, PRE, LIFE, CAUSES, PREFS, NAMES, SURNAMES,
  HISTORY, IMAGINE_LINE_YEAR, ANACHRONISM, ROLES, MONEY,
  ERAS: { heisei: ERA_HEISEI },
};
