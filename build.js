// Build: node build.js
// content/manifest.js + content/<module>/<topic>.html  →  topics/*.html, module pages, track pages, index.html
const fs = require('fs');
const path = require('path');

const root = __dirname;
const { modules, tracks, needs } = require('./content/manifest.js');
const topicsDir = path.join(root, 'topics');
fs.mkdirSync(topicsDir, { recursive: true });

const moduleById = Object.fromEntries(modules.map((m) => [m.id, m]));
const trackById = Object.fromEntries(tracks.map((t) => [t.id, t]));
const all = modules.flatMap((m) => m.topics.map((t, i) => ({ ...t, module: m, index: i })));
const topicById = Object.fromEntries(all.map((t) => [t.id, t]));

// Maths topic → jin topics mein ye kaam aata hai
const usedBy = {};
for (const [topicId, mathIds] of Object.entries(needs)) {
  for (const z of mathIds) (usedBy[z] = usedBy[z] || []).push(topicById[topicId]);
}

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (s) => s.replace(/<[^>]+>/g, '');
const idsOf = (mods) => mods.flatMap((m) => m.topics.map((t) => t.id)).join(',');
const trackModules = (tr) => tr.modules.map((id) => moduleById[id]);

function progressBox(ids, total, label, extraClass = '') {
  return `<div class="progress-box${extraClass}" data-module-topics="${ids}">${label ? `<span>${esc(label)}</span>` : ''}<strong data-progress-label>0 / ${total} topics</strong><div class="progress-track"><span data-progress-bar></span></div></div>`;
}

function header(prefix, activeTrack) {
  const links = [['index.html', 'Learning map', 'home'], ...tracks.map((t) => [t.page, t.short, t.id])]
    .map(([href, label, id]) => `<a${id === activeTrack ? ' class="active"' : ''} href="${prefix}${href}">${label}</a>`).join('');
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header"><a class="brand" href="${prefix}index.html"><span class="brand-mark">ML</span><span>Machine Learning, <em>Visually</em></span></a><nav aria-label="Main navigation">${links}</nav></header>`;
}

function page({ title, description, prefix, activeTrack, mainClass, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)} — Machine Learning, Visually</title>
  <link rel="stylesheet" href="${prefix}styles.css">
  <script src="${prefix}app.js" defer></script>
</head>
<body>
  ${header(prefix, activeTrack)}
  <main id="main" class="${mainClass}">
${body}
  </main>
  <footer class="site-footer"><span>Ratne ke liye nahi, samajhne ke liye banaya hai. Saari explanations apni hain — video ka transcript nahi.</span><span>Courses: <a href="https://www.deeplearning.ai/specializations/machine-learning">Machine Learning</a> · <a href="https://www.deeplearning.ai/specializations/deep-learning">Deep Learning</a></span></footer>
</body>
</html>
`;
}

const topicLink = (t, prefix) => `<a class="chip" data-topic-link="${t.id}" href="${prefix}${t.slug}.html"><small>${esc(t.module.short)}</small>${esc(t.title)}</a>`;

function topicPage(t) {
  const m = t.module;
  const tr = trackById[m.track];
  const pos = all.indexOf(t);
  const prev = all[pos - 1];
  const next = all[pos + 1];
  const fragment = fs.readFileSync(path.join(root, 'content', m.id, `${t.id}.html`), 'utf8').replace(/^\uFEFF/, '');
  const toc = m.topics.map((x, i) => `<a data-topic-link="${x.id}"${x.id === t.id ? ' class="current" aria-current="page"' : ''} href="${x.slug}.html"><span>${pad(i + 1)}</span>${esc(x.title)}</a>`).join('\n            ');
  const prereq = (needs[t.id] || []).map((z) => topicById[z]);
  const prereqBox = prereq.length ? `<div class="prereq-box"><b>Maths mein atko to pehle ye dekh lo</b><div class="chips">${prereq.map((z) => topicLink(z, '')).join('')}</div></div>` : '';
  const coversBox = t.covers ? `<details class="covers-box" open><summary>Is page mein kya-kya hai</summary><ul>${t.covers.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></details>` : '';
  const used = usedBy[t.id] || [];
  const usedBox = used.length ? `<div class="used-box"><h4>Ye maths aage kahan kaam aayegi</h4><div class="chips">${used.map((u) => topicLink(u, '')).join('')}</div></div>` : '';
  const practice = t.practice ? `<div class="practice">
              <h4>✍️ Ab tumhari baari <small>(pehle khud socho, phir answer kholna)</small></h4>
              ${t.practice.map(([q, a]) => `<details class="qa"><summary>${q}</summary><p>${a}</p></details>`).join('\n              ')}
            </div>` : '';
  const crossLabel = (x) => (x.module !== m ? ` · ${x.module.short}` : '');
  const pager = `<nav class="pager" aria-label="Topic navigation">
          ${prev ? `<a class="pager-prev" href="${prev.slug}.html"><small>← Pichhla${crossLabel(prev)}</small>${esc(prev.title)}</a>` : '<span></span>'}
          ${next ? `<a class="pager-next" href="${next.slug}.html"><small>Agla${crossLabel(next)} →</small>${esc(next.title)}</a>` : `<a class="pager-next" href="../index.html"><small>Sab khatam 🎉</small>Learning map pe wapas</a>`}
        </nav>`;
  const trackCrumb = tr.page === m.page ? '' : ` › <a href="../${tr.page}">${esc(tr.title)}</a>`;
  const body = `    <section class="topic-hero">
      <div class="topic-hero-inner">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="../index.html">Learning map</a>${trackCrumb} › <a href="../${m.page}">${esc(m.short)}: ${esc(m.title)}</a> › Topic ${t.index + 1} / ${m.topics.length}</nav>
        <p class="eyebrow">${esc(m.short.toUpperCase())} · TOPIC ${pad(t.index + 1)} · ${esc(t.part.toUpperCase())}</p>
        <h1>${esc(t.title)}</h1>
        <p>${esc(t.subtitle)}</p>
      </div>
    </section>
    <div class="lesson-layout">
      <aside class="lesson-sidebar">
        <details class="toc" open><summary>${esc(m.short)} ke topics</summary>
          <nav aria-label="Module topics">
            ${toc}
          </nav>
        </details>
        ${progressBox(m.topics.map((x) => x.id).join(','), m.topics.length, `${m.short} progress`)}
      </aside>
      <div class="lesson-content">
        <div class="why-box"><b>Ye kyu seekh rahe hain?</b>${t.why}</div>
        ${prereqBox}
        ${coversBox}
        <article class="lesson-card single" id="${t.id}">
          <div class="lesson-body">
${fragment.replace(/\s+$/, '')}
            ${practice}
            ${usedBox}
            <div class="done-row"><label class="complete-control big"><input type="checkbox" data-topic="${t.id}"> Haan, ye samajh aa gaya ✓</label></div>
          </div>
        </article>
        ${pager}
      </div>
    </div>`;
  return page({ title: `${t.title} (${m.short})`, description: `${t.title}: ${t.subtitle}. Hinglish mein dost jaisi explanation, examples aur Q&A.`, prefix: '../', activeTrack: m.track, mainClass: m.color, body });
}

function topicCard(t, prefix) {
  return `<a class="topic-card" data-topic-card="${t.id}" href="${prefix}topics/${t.slug}.html">
          <span class="topic-index">${pad(t.index + 1)}</span>
          <span class="topic-card-text"><b>${esc(t.title)}</b><small>${esc(t.subtitle)}</small><em>${strip(t.why)}</em></span>
          <span class="topic-done" aria-hidden="true">✓</span>
        </a>`;
}

function modulePage(m) {
  const tr = trackById[m.track];
  const siblings = trackModules(tr);
  const next = siblings[siblings.indexOf(m) + 1];
  const parts = [...new Set(m.topics.map((t) => t.part))];
  const groups = parts.map((p) => `<section class="lesson-group"><p class="eyebrow">${esc(p.toUpperCase())}</p>
        <div class="topic-list">
        ${all.filter((t) => t.module === m && t.part === p).map((t) => topicCard(t, '')).join('\n        ')}
        </div></section>`).join('\n      ');
  const nextCard = next
    ? `<div class="next-module"><div><p class="eyebrow">IS COURSE KE BAAD</p><h2>${esc(next.title)}</h2><p>${esc(next.intro)}</p></div><a class="button button-primary" href="${next.page}">${esc(next.short)} dekho →</a></div>`
    : `<div class="next-module end-card"><div><p class="eyebrow">${esc(tr.title.toUpperCase())} POORA</p><h2>Ab aage kya?</h2><p>Learning map pe jao — doosra track shuru karo, ya kisi bhi topic ke “Ab tumhari baari” sawaal dobara solve karo.</p></div><a class="button button-primary" href="index.html">Learning map →</a></div>`;
  const trackCrumb = tr.page === m.page ? '' : `<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Learning map</a> › <a href="${tr.page}">${esc(tr.title)}</a></nav>`;
  const body = `    <section class="module-hero">
      ${trackCrumb}
      <p class="eyebrow">${esc(m.eyebrow)}</p>
      <h1>${esc(m.title)}</h1>
      <p>${esc(m.intro)}</p>
      <div class="module-path">${m.path.map((s) => `<span>${esc(s)}</span>`).join(' → ')}</div>
      <div class="hero-actions"><a class="button button-primary" href="topics/${m.topics[0].slug}.html">Topic 01 se shuru karo →</a>
      ${progressBox(m.topics.map((x) => x.id).join(','), m.topics.length, 'Progress', ' inline')}</div>
    </section>
    <div class="module-overview">
      ${groups}
      ${nextCard}
    </div>`;
  return page({ title: `${m.short}: ${m.title}`, description: m.intro, prefix: '', activeTrack: m.track, mainClass: m.color, body });
}

function moduleCard(m, prefix = '') {
  return `<article class="module-card ${m.color}">
          <div class="module-number">${esc(m.short)} · ${m.topics.length} TOPICS</div>
          <h3>${esc(m.title)}</h3>
          <p>${esc(m.intro)}</p>
          ${progressBox(m.topics.map((x) => x.id).join(','), m.topics.length, '', ' inline')}
          <a class="text-link" href="${prefix}${m.page}">Course kholo <span aria-hidden="true">→</span></a>
        </article>`;
}

function trackPage(tr) {
  const mods = trackModules(tr);
  const total = mods.reduce((n, m) => n + m.topics.length, 0);
  const body = `    <section class="module-hero track-hero">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Learning map</a></nav>
      <p class="eyebrow">${mods.length} COURSES · ${total} TOPICS</p>
      <h1>${esc(tr.title)}</h1>
      <p>${esc(tr.blurb)} Order mein chalo — har topic ke upar “pehle ye maths dekh lo” wale links hain, to maths ke liye alag se pareshaan hone ki zaroorat nahi.</p>
      <div class="hero-actions"><a class="button button-primary" href="topics/${mods[0].topics[0].slug}.html">Pehle topic se shuru karo →</a>
      ${progressBox(idsOf(mods), total, 'Poora track', ' inline')}</div>
    </section>
    <div class="module-overview">
      <div class="module-grid track-grid">
        ${mods.map((m) => moduleCard(m)).join('\n        ')}
      </div>
    </div>`;
  return page({ title: tr.title, description: tr.blurb, prefix: '', activeTrack: tr.id, mainClass: '', body });
}

function indexPage() {
  const trackCards = tracks.map((tr) => {
    const mods = trackModules(tr);
    const total = mods.reduce((n, m) => n + m.topics.length, 0);
    return `<article class="module-card ${tr.id === 'maths' ? 'module-green' : tr.id === 'ml' ? 'module-blue' : 'module-purple'}">
          <div class="module-number">${esc(tr.short.toUpperCase())} · ${mods.length > 1 ? `${mods.length} COURSES · ` : ''}${total} TOPICS</div>
          <h3>${esc(tr.title)}</h3>
          <p>${esc(tr.blurb)}</p>
          ${progressBox(idsOf(mods), total, '', ' inline')}
          <a class="text-link" href="${tr.page}">Kholo <span aria-hidden="true">→</span></a>
        </article>`;
  }).join('\n        ');
  const lvl = (name) => moduleById.m0.topics.filter((t) => t.part.startsWith(name));
  const route = [
    ['1', 'Maths Level 1 + 2', `${lvl('Level 1').length + lvl('Level 2').length} chhote pages — symbols se lekar derivative aur Python tak.`, `topics/${moduleById.m0.topics[0].slug}.html`],
    ['2', 'Machine Learning Specialization', 'Regression, classification, neural network ki shuruaat, trees, clustering, recommenders, RL.', 'ml.html'],
    ['3', 'Maths Level 3', `${lvl('Level 3').length} pages — broadcasting, matrix gradients, moving average, convolution. DL ke liye.`, `topics/${lvl('Level 3')[0].slug}.html`],
    ['4', 'Deep Learning Specialization', 'Network haath se banao, tune karo, projects chalao, CNN aur Transformers tak.', 'dl.html'],
  ].map(([n, h, p, href]) => `<li><span>${n}</span><div><strong><a href="${href}">${esc(h)}</a></strong><small>${esc(p)}</small></div></li>`).join('\n          ');
  const syllabus = tracks.map((tr) => `<div class="syllabus-track"><h3>${esc(tr.title)}</h3>
        <div class="syllabus">
        ${trackModules(tr).map((m) => `<div class="syllabus-module ${m.color}"><h4><span>${esc(m.short)}</span> ${esc(m.title)}</h4><ol>
          ${m.topics.map((t) => `<li><a data-topic-link="${t.id}" href="topics/${t.slug}.html">${esc(t.title)}</a></li>`).join('\n          ')}
        </ol></div>`).join('\n        ')}
        </div></div>`).join('\n      ');
  const body = `    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">ZERO MATHS SE DEEP LEARNING TAK · HINGLISH · DOST JAISI BAAT</p>
        <h1>Machine learning ko <span>samajhna</span>, ratna nahi.</h1>
        <p class="hero-intro">Maths nahi aati? Koi baat nahi. Yahan har topic ka apna page hai — jaise koi dost chai pe samjha raha ho. Kahaniyan, numbers ke saath solved examples, diagrams, woh sawaal jo tumhare dimaag mein aa rahe honge, aur end mein khud try karne ke liye sawaal.</p>
        <div class="hero-buttons"><a class="button button-primary" href="maths.html">Maths se shuru karo <span aria-hidden="true">→</span></a>
        <a class="button button-ghost" href="ml.html">Seedha ML</a><a class="button button-ghost" href="dl.html">Seedha DL</a></div>
        <p class="fine-print">${all.length} topic pages · Progress isi browser mein save hoti hai · Saari explanations apni hain, video transcript nahi.</p>
      </div>
      <div class="hero-art" aria-label="Model examples se seekhta hai aur prediction karta hai">
        <div class="art-label">LEARNING LOOP</div>
        <div class="loop-row"><span class="loop-box">Examples<br><small>data + answers</small></span><span class="loop-arrow">→</span><span class="loop-box loop-model">Model<br><small>pattern dhundhe</small></span></div>
        <div class="loop-down">↓ prediction ko sahi answer se milao</div>
        <div class="loop-row"><span class="loop-box loop-feedback">Feedback<br><small>galti ghatao</small></span><span class="loop-arrow">↻</span><span class="loop-box">Naya input<br><small>prediction karo</small></span></div>
        <div class="art-caption">Pattern seekho, phir aise example pe use karo jo model ne pehle kabhi nahi dekha.</div>
      </div>
    </section>

    <section class="section" aria-labelledby="route-title">
      <div class="section-heading">
        <div><p class="eyebrow">TEEN TRACKS</p><h2 id="route-title">Ek shared maths, do specializations.</h2></div>
        <p class="section-note">Maths ek hi jagah hai, aur har ML/DL topic ke upar bataya gaya hai ki uske liye kaunsa maths page chahiye.</p>
      </div>
      <div class="module-grid">
        ${trackCards}
      </div>
    </section>

    <section class="section split-section">
      <div>
        <p class="eyebrow">SUJHAYA HUA RAASTA</p>
        <h2>Bilkul zero se ho? Aise chalo.</h2>
        <ol class="how-list route-list">
          ${route}
        </ol>
        <p class="section-note">Beech mein koi maths page bhool gaye to tension nahi — har topic pe uska link khud mil jayega.</p>
      </div>
      <aside class="big-picture-card">
        <p class="eyebrow">HAR PAGE KAISE PADHEIN</p>
        <ol class="how-list">
          <li><span>1</span><div><strong>“Ye kyu seekh rahe hain?” padho</strong><small>Pehle pata ho ki ye kis problem ka jawab hai.</small></div></li>
          <li><span>2</span><div><strong>Baatcheet follow karo</strong><small>“TUM” wale bubble mein tumhare jaise sawaal hain.</small></div></li>
          <li><span>3</span><div><strong>Numbers khud check karo</strong><small>Calculator uthao. Khud karke dekhna hi asli samajh hai.</small></div></li>
          <li><span>4</span><div><strong>“Ab tumhari baari”</strong><small>Answer kholne se pehle ek minute khud socho.</small></div></li>
          <li><span>5</span><div><strong>Tick karo</strong><small>Progress har jagah dikhegi — module, track aur yahan.</small></div></li>
        </ol>
      </aside>
    </section>

    <section class="section" aria-labelledby="syllabus-title">
      <div class="section-heading"><div><p class="eyebrow">POORA SYLLABUS</p><h2 id="syllabus-title">Har topic, ek click door</h2></div><p class="section-note">✓ wale topics tumne “samajh aa gaya” mark kiye hain.</p></div>
      ${syllabus}
    </section>`;
  return page({ title: 'Learning map', description: 'Zero maths se Machine Learning aur Deep Learning: har topic ka alag page, Hinglish explanation, examples aur Q&A.', prefix: '', activeTrack: 'home', mainClass: '', body });
}

const missing = all.filter((t) => !fs.existsSync(path.join(root, 'content', t.module.id, `${t.id}.html`)));
if (missing.length) {
  console.error(`Missing ${missing.length} fragment(s): ${missing.map((t) => `${t.module.id}/${t.id}`).join(', ')}`);
  process.exit(1);
}

for (const t of all) fs.writeFileSync(path.join(topicsDir, `${t.slug}.html`), topicPage(t));
modules.forEach((m) => fs.writeFileSync(path.join(root, m.page), modulePage(m)));
tracks.filter((tr) => tr.page !== moduleById[tr.modules[0]].page).forEach((tr) => fs.writeFileSync(path.join(root, tr.page), trackPage(tr)));
fs.writeFileSync(path.join(root, 'index.html'), indexPage());

const expected = new Set(all.map((t) => `${t.slug}.html`));
const stale = fs.readdirSync(topicsDir).filter((f) => !expected.has(f));
stale.forEach((f) => fs.unlinkSync(path.join(topicsDir, f)));
console.log(`Built ${all.length} topic pages, ${modules.length} module pages, ${tracks.length} tracks, index.html${stale.length ? ` (removed ${stale.length} stale)` : ''}`);
