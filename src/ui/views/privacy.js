// プライバシー（設計書6.8「送る情報は最小にする」）。何を送り、何を送らず、何を端末に残すか。
// サーバーのない版（GitHub Pages）は、どこにも何も送らないので、その事実どおりの文にする。
import { authorLink } from './author.js';
import { SITE } from '../site.js';
import { serverEnabled } from '../core/net.js';

const head = `<header class="share-head"><a class="share-title" href="./">8万分の1</a></header>
  <h1 class="page-title">プライバシー</h1>
  <section class="card">
    <p>このゲームは、アカウントの登録なしで遊べます。名前やメールアドレスは聞きません。</p>
  </section>`;

const local = `<section class="card">
    <h2 class="sec">端末に残すもの</h2>
    <p>続きから遊ぶための途中の記録、速さの好み、30日の判定止め（振り返りなどに危ない言葉が書かれたとき）を、ブラウザの保存領域に残します。どこにも送りません。`;

function withServer(site) {
  return `${head}
  <section class="card">
    <h2 class="sec">サーバーに送るもの</h2>
    <ul class="plain-list">
      <li><b>共有するとき</b>（「Xに投稿する」を押したとき）：データの版・乱数の種・生まれる場所の決め方・分かれ道の答えの番号の列。サーバーはこれで同じ人生を計算し直し、共有ページを作ります。共有ページは、リンクを知る人なら誰でも見られます。</li>
      <li><b>最期まで見届けたとき</b>（みんなの集計）：データの版・税理士になった道・合格までの年数・享年・分かれ道ごとの答え。人数を足すだけで、1人ずつの記録は残しません。</li>
      <li><b>ご意見を送ったとき</b>：書いた文と、そのときの人生の情報（データの版・種・生まれる場所の決め方・答えの番号・年齢と暦年・画面・最後に出た一行）。最後に出た一行には、主人公などの架空の名前が入ることがあります。ご意見は作者だけが読み、公開しません。</li>
    </ul>
  </section>
  <section class="card">
    <h2 class="sec">送らないもの</h2>
    <p>あなたの名前や連絡先は聞きません。振り返りの記入欄に書いた文と、故人へのひとことは、どこにも送りません。投稿の文や画像の札にも入りません。</p>
    <p>主人公の名前は、計算で作った架空の名前です。投稿の文・画像の札・共有ページに出ます。</p>
  </section>
  <section class="card">
    <h2 class="sec">トラッキング拒否</h2>
    <p>ブラウザでトラッキング拒否（DNT）やグローバル・プライバシー・コントロール（GPC）を設定していると、みんなの集計には送りません。サーバーも、その設定のついた要求は数えません。共有とご意見は、ボタンを押したときだけ送ります。</p>
  </section>
  ${local}作者は Cookie を使いません（配信の Cloudflare が、守りのために付けることがあります）。</p>
  </section>
  <section class="card">
    <h2 class="sec">接続の情報</h2>
    <p>配信は Cloudflare、文字（フォント）は Google Fonts から読み込みます。そのため、それぞれの会社に接続の情報（IP アドレスやブラウザの種類など）が届きます。作者はこれを集めたり残したりしません。</p>
  </section>
  <section class="card">
    <h2 class="sec">残す期間と、共有ページを消したいとき</h2>
    <p>共有ページとご意見は、期限を決めずに残します。みんなの集計は人数の合計だけです。</p>
    <p>共有ページを消したいときは、<a href="./#feedback">ご意見の窓口</a>から、共有ページのアドレスを添えて知らせてください。</p>
  </section>
  <footer class="credit">${authorLink(site)} · <a href="about.html">データの解説</a></footer>`;
}

function withoutServer(site) {
  return `${head}
  <section class="card">
    <h2 class="sec">送るもの</h2>
    <p>遊んだ内容は、どこにも送りません（共有ページ・みんなの集計・ご意見の窓口は、まだありません）。</p>
    <p>「Xに投稿する」を押すと、X の投稿の画面が開きます。投稿の文に入る住所（再現リンク）には、データの版・乱数の種・生まれる場所の決め方・分かれ道の答えの番号が入ります。投稿するかどうかは、X の画面で決められます。</p>
  </section>
  <section class="card">
    <h2 class="sec">投稿や札に入らないもの</h2>
    <p>あなたの名前や連絡先は聞きません。振り返りの記入欄に書いた文と、故人へのひとことは、投稿の文や画像の札に入りません。</p>
    <p>主人公の名前は、計算で作った架空の名前です。投稿の文と画像の札に出ます。</p>
  </section>
  ${local}作者は Cookie を使いません。</p>
  </section>
  <section class="card">
    <h2 class="sec">接続の情報</h2>
    <p>配信は GitHub Pages、文字（フォント）は Google Fonts から読み込みます。そのため、それぞれの会社に接続の情報（IP アドレスやブラウザの種類など）が届きます。作者はこれを集めたり残したりしません。</p>
  </section>
  <footer class="credit">${authorLink(site)} · <a href="about.html">データの解説</a></footer>`;
}

export function privacyView(site = SITE) {
  return `<div class="screen page">
  ${serverEnabled(site) ? withServer(site) : withoutServer(site)}
</div>`;
}
