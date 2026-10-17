// データの解説とプライバシーのページ（about.html・privacy.html）。body の data-page で出す中身を選ぶ。
import { DATA } from '../data/index.js';
import { aboutView } from './views/about.js';
import { privacyView } from './views/privacy.js';

const app = document.getElementById('app');
const page = document.body.dataset.page;
if (page === 'about') app.innerHTML = aboutView(DATA);
else if (page === 'privacy') app.innerHTML = privacyView();
