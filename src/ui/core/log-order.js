// 人生の記録の並べ方（題名と場面の絵の設計書 4.4：本家と同じく新しい順）。
// 新しい年のカードはいちばん上に作り、行はそのカードのいちばん上に足す。log は新しい順のカードの列 [{ age, lines }]。
export function emptyLog() {
  return [];
}

// 返す値：{ log（足したあと）, op: { newCard（新しいカードを上に作るか）, age } }。画面はこの op どおりに差し込む
export function addToLog(log, line) {
  const top = log[0];
  if (top && top.age === line.age) {
    return { log: [{ age: top.age, lines: [line, ...top.lines] }, ...log.slice(1)], op: { newCard: false, age: line.age } };
  }
  return { log: [{ age: line.age, lines: [line] }, ...log], op: { newCard: true, age: line.age } };
}
