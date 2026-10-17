// 時計で人生を進める再生機（画面を持たない）。runLife が出す行と分かれ道を、その年の中の時刻 t に合わせて出す。
// 行は (年齢 + t) × 1年の秒数、分かれ道も同じ。tick(dt) で時計を進め、その時刻までに来たものを順に返す。
// 分かれ道に来たら止まり、answer(k) で進む（k を渡さなければおまかせ）。
// answers（選択肢の番号の列）を渡すと、その数だけは止まらずに答える。fast（既定）なら時計を待たずに一気に進み（続きから）、
// fast: false なら行はふつうの時計で出し、分かれ道の時刻に答える（再現リンクを見る）。
// answers（出力）：答えた番号の列。おまかせの答えも、分かれ道のすぐあとの「題：「選んだもの」」の行から番号を読む。
import { runLife, birthCard, secondsPerYear } from '../../engine/life.js';

const SPEEDS = [1, 2, 4, 8, 16];
const MAX_DT = 1; // 1回の刻みの上限（秒）。裏のタブから戻っても一気に進まない

export function createPlayer(config, { data, world, answers = null, fast: fastMode = true } = {}) {
  config.trace = config.trace ?? [];
  const spy = secondsPerYear(birthCard(config, data).e0);
  const gen = runLife(config, data, world);
  const queue = answers ? [...answers] : [];
  const lines = [];
  const views = [];
  const answered = [];
  let asked = null; // 答えたが、まだ番号を読んでいない分かれ道
  // 続きから：答えの列のぶんと、その次の分かれ道（保存したところ）までは時計を待たずに進む
  let resuming = fastMode && queue.length > 0;
  let pending = gen.next();
  let clock = 0;

  const dueOf = v => (v.kind === 'line' ? (v.line.age + (v.line.t ?? 0.99)) * spy : (v.view.age + (v.view.t ?? 0)) * spy);

  const p = {
    state: 'running', speed: 1, spy, lines, views, answers: answered, trace: config.trace, currentDecision: null, summary: null,
    setSpeed(x) { if (SPEEDS.includes(x)) p.speed = x; },
    pause() { if (p.state === 'running') p.state = 'paused'; },
    resume() { if (p.state === 'paused') p.state = 'running'; },
    tick(dt) {
      if (p.state !== 'running') return [];
      clock += Math.min(Math.max(dt, 0), MAX_DT) * p.speed;
      return drain(false);
    },
    // 次の分かれ道（なければ最期）まで時計を進める
    skipToDecision() {
      if (p.state !== 'running' && p.state !== 'paused') return [];
      p.state = 'running';
      return drain(true);
    },
    answer(k) {
      if (p.state !== 'decision') return;
      asked = p.currentDecision;
      p.currentDecision = null;
      p.state = 'running';
      pending = gen.next(k);
    },
  };

  function drain(skip) {
    const out = [];
    while (true) {
      if (pending.done) {
        p.state = 'ended';
        p.summary = pending.value;
        out.push({ type: 'end', summary: p.summary });
        return out;
      }
      const v = pending.value;
      const due = dueOf(v);
      const fast = skip || resuming;
      if (!fast && due > clock) return out;
      if (fast && due > clock) clock = due;
      if (v.kind === 'line') {
        if (asked && v.line.kind === 'dec') {
          answered.push(asked.choices.findIndex(c => v.line.text === `${asked.title}：「${c.label}」`));
          asked = null;
        }
        lines.push(v.line);
        out.push({ type: 'line', line: v.line });
        pending = gen.next();
        continue;
      }
      views.push(v.view);
      if (queue.length) {
        asked = v.view;
        const k = v.view.choices[queue.shift()]?.k;
        pending = gen.next(k);
        continue;
      }
      resuming = false;
      p.state = 'decision';
      p.currentDecision = v.view;
      out.push({ type: 'decision', view: v.view });
      return out;
    }
  }

  return p;
}
