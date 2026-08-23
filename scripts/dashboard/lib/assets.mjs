// The page's stylesheet and behaviour, inlined so the dashboard is one file
// that opens from disk with no server and no network.

export const CSS = `
:root{
  --bg:#f6f7f9; --panel:#ffffff; --panel-2:#fbfcfd; --ink:#14161a; --ink-2:#5b6472;
  --line:#e3e7ec; --line-2:#eef1f4;
  --accent:#8a1538; --accent-soft:#f7e9ee; --accent-ink:#8a1538;
  --gold:#a9761f; --gold-soft:#fbf3e3;
  --ok:#1c7a4a; --ok-soft:#e6f4ec;
  --warn:#a35a00; --warn-soft:#fdf1e1;
  --bad:#a3232b; --bad-soft:#fbeaea;
  --info:#1f5f9e; --info-soft:#e9f1fa;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
  --radius:10px;
  --shadow:0 1px 2px rgba(16,24,40,.05),0 1px 3px rgba(16,24,40,.06);
}
html[data-theme="dark"]{
  --bg:#0e1013; --panel:#16191e; --panel-2:#1b1f25; --ink:#e8eaed; --ink-2:#9aa4b2;
  --line:#272c34; --line-2:#20242b;
  --accent:#e85f86; --accent-soft:#2a1420; --accent-ink:#f0a6bd;
  --gold:#d8a844; --gold-soft:#2a2213;
  --ok:#4ec38a; --ok-soft:#14261d;
  --warn:#e0a35c; --warn-soft:#2a2013;
  --bad:#ef7b80; --bad-soft:#2b1618;
  --info:#6fb0ee; --info-soft:#132231;
  --shadow:0 1px 2px rgba(0,0,0,.4);
}
@media (prefers-color-scheme:dark){
  html:not([data-theme="light"]){
    --bg:#0e1013; --panel:#16191e; --panel-2:#1b1f25; --ink:#e8eaed; --ink-2:#9aa4b2;
    --line:#272c34; --line-2:#20242b;
    --accent:#e85f86; --accent-soft:#2a1420; --accent-ink:#f0a6bd;
    --gold:#d8a844; --gold-soft:#2a2213;
    --ok:#4ec38a; --ok-soft:#14261d;
    --warn:#e0a35c; --warn-soft:#2a2013;
    --bad:#ef7b80; --bad-soft:#2b1618;
    --info:#6fb0ee; --info-soft:#132231;
    --shadow:0 1px 2px rgba(0,0,0,.4);
  }
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  background:var(--bg); color:var(--ink); font-family:var(--sans);
  font-size:15px; line-height:1.55; -webkit-text-size-adjust:100%;
}
a{color:var(--info); text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:var(--mono); font-size:.88em; background:var(--panel-2); border:1px solid var(--line-2); border-radius:4px; padding:.05em .35em}
hr{border:0;border-top:1px solid var(--line);margin:1.2rem 0}

/* ---------- shell ---------- */
.wrap{max-width:1240px;margin:0 auto;padding:0 16px 96px}
header.top{
  background:linear-gradient(160deg,var(--accent) 0%,#4a0d20 100%);
  color:#fff;padding:26px 0 22px;margin-bottom:0;
}
html[data-theme="dark"] header.top, @media(prefers-color-scheme:dark){}
header.top .wrap{padding-bottom:0}
.brand{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px}
.brand h1{font-size:26px;margin:0;letter-spacing:-.02em;font-weight:650}
.brand .sub{opacity:.82;font-size:13.5px}
.stamp{margin-top:10px;font-size:12.5px;opacity:.82;display:flex;flex-wrap:wrap;gap:6px 16px}
.stamp code{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.2);color:#fff}

nav.tabs{
  position:sticky;top:0;z-index:40;background:var(--panel);
  border-bottom:1px solid var(--line);box-shadow:var(--shadow);
}
nav.tabs .inner{max-width:1240px;margin:0 auto;padding:0 8px;display:flex;gap:2px;overflow-x:auto;scrollbar-width:thin}
nav.tabs a{
  padding:11px 12px;font-size:13.5px;color:var(--ink-2);white-space:nowrap;
  border-bottom:2px solid transparent;text-decoration:none;font-weight:500;
}
nav.tabs a:hover{color:var(--ink);text-decoration:none}
nav.tabs a.active{color:var(--accent-ink);border-bottom-color:var(--accent);font-weight:600}
nav.tabs .spacer{flex:1}
.theme-btn{border:0;background:none;color:var(--ink-2);cursor:pointer;padding:8px 10px;font-size:15px}

section.panel{margin-top:26px;scroll-margin-top:56px}
section.panel > h2{
  font-size:19px;margin:0 0 4px;letter-spacing:-.01em;display:flex;align-items:center;gap:9px;flex-wrap:wrap
}
section.panel > .lede{color:var(--ink-2);font-size:13.5px;margin:0 0 14px;max-width:78ch}
.card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.pad{padding:14px 16px}

/* ---------- bits ---------- */
.pill{
  display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;
  letter-spacing:.02em;padding:2px 8px;border-radius:999px;border:1px solid transparent;
  text-transform:uppercase;white-space:nowrap
}
.pill.approved{background:var(--ok-soft);color:var(--ok);border-color:var(--ok)}
.pill.completed{background:var(--ok-soft);color:var(--ok);border-color:var(--ok)}
.pill.draft{background:var(--warn-soft);color:var(--warn);border-color:var(--warn)}
.pill.superseded{background:var(--info-soft);color:var(--info);border-color:var(--info)}
.pill.abandoned{background:var(--bad-soft);color:var(--bad);border-color:var(--bad)}
.pill.partial{background:var(--warn-soft);color:var(--warn);border-color:var(--warn)}
.pill.decision{background:var(--accent-soft);color:var(--accent-ink);border-color:var(--accent)}
.pill.other,.pill.none{background:var(--panel-2);color:var(--ink-2);border-color:var(--line)}
.pill.tier1{background:var(--accent-soft);color:var(--accent-ink);border-color:var(--accent)}
.pill.tier2{background:var(--gold-soft);color:var(--gold);border-color:var(--gold)}
.pill.tier3{background:var(--info-soft);color:var(--info);border-color:var(--info)}
.pill.tier4{background:var(--panel-2);color:var(--ink-2);border-color:var(--line)}
.pill.block{background:var(--bad-soft);color:var(--bad);border-color:var(--bad)}
.muted{color:var(--ink-2)}
.tiny{font-size:12px}
.mono{font-family:var(--mono)}
.right{text-align:right}

.empty{
  border:1px dashed var(--line);border-radius:var(--radius);padding:16px;
  color:var(--ink-2);font-size:13.5px;background:var(--panel-2)
}
.empty strong{color:var(--ink);display:block;margin-bottom:4px;font-size:14px}
.fail{border:1px solid var(--bad);background:var(--bad-soft);border-radius:var(--radius);padding:14px 16px;color:var(--bad);font-size:13.5px}
.fail strong{display:block;color:var(--bad);margin-bottom:4px}

/* ---------- kpi ---------- */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(178px,1fr));gap:10px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;box-shadow:var(--shadow)}
.kpi .label{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-2);font-weight:600}
.kpi .value{font-size:25px;font-weight:660;letter-spacing:-.02em;margin-top:3px;line-height:1.15}
.kpi .note{font-size:12px;color:var(--ink-2);margin-top:3px}
.kpi .delta{font-size:12px;font-weight:600}
.delta.up{color:var(--ok)} .delta.down{color:var(--bad)} .delta.flat{color:var(--ink-2)}

.bar{height:6px;background:var(--line-2);border-radius:99px;overflow:hidden;margin-top:7px}
.bar > span{display:block;height:100%;background:var(--accent);border-radius:99px}
.bar.ok > span{background:var(--ok)}
.bar.warn > span{background:var(--warn)}

/* ---------- filters ---------- */
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.filters select,.filters input{
  font:inherit;font-size:13px;padding:6px 9px;border:1px solid var(--line);
  border-radius:7px;background:var(--panel);color:var(--ink);min-width:120px
}
.filters .count{font-size:12.5px;color:var(--ink-2);margin-left:auto}
.chip{
  font-size:12.5px;padding:5px 10px;border:1px solid var(--line);border-radius:999px;
  background:var(--panel);color:var(--ink-2);cursor:pointer
}
.chip.on{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}

/* ---------- timeline ---------- */
.tl{position:relative;padding-left:20px}
.tl:before{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:2px;background:var(--line)}
.tl-item{position:relative;margin-bottom:9px}
.tl-item:before{
  content:"";position:absolute;left:-18px;top:15px;width:9px;height:9px;border-radius:50%;
  background:var(--panel);border:2px solid var(--ink-2)
}
.tl-item[data-kind="decision"]:before{border-color:var(--accent);background:var(--accent)}
.tl-item[data-kind="meeting"]:before{border-color:var(--gold);background:var(--gold)}
.tl-item[data-kind="work-done"]:before{border-color:var(--ok);background:var(--ok)}
.tl-item[data-kind="hire"]:before{border-color:var(--info);background:var(--info)}
.tl-head{display:flex;gap:10px;align-items:flex-start;padding:10px 13px;cursor:pointer}
.tl-head:hover{background:var(--panel-2)}
.tl-date{font-family:var(--mono);font-size:12px;color:var(--ink-2);min-width:82px;padding-top:2px}
.tl-title{font-weight:560;font-size:14.5px;flex:1;min-width:180px}
.tl-meta{font-size:12px;color:var(--ink-2);margin-top:2px;display:flex;gap:5px 12px;flex-wrap:wrap}

/* ---------- disclosure ---------- */
details.doc{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);margin-bottom:9px;box-shadow:var(--shadow)}
details.doc > summary{
  padding:11px 14px;cursor:pointer;list-style:none;display:flex;gap:10px;
  align-items:flex-start;flex-wrap:wrap
}
details.doc > summary::-webkit-details-marker{display:none}
details.doc > summary:hover{background:var(--panel-2)}
details.doc[open] > summary{border-bottom:1px solid var(--line-2);background:var(--panel-2)}
summary .caret{color:var(--ink-2);font-size:11px;padding-top:4px;transition:transform .12s}
details[open] > summary .caret{transform:rotate(90deg)}
.doc-body{padding:6px 18px 20px;max-height:640px;overflow:auto;border-top:0}
.doc-body.tall{max-height:none}
.expand-note{font-size:12px;color:var(--ink-2);padding:0 18px 12px}

/* ---------- rendered markdown ---------- */
.md h2,.md h3,.md h4,.md h5{margin:1.25em 0 .4em;line-height:1.3;letter-spacing:-.01em}
.md h2{font-size:17px;border-bottom:1px solid var(--line-2);padding-bottom:5px}
.md h3{font-size:15.5px}
.md h4{font-size:14px;color:var(--ink-2);text-transform:none}
.md p{margin:.6em 0}
.md ul,.md ol{margin:.5em 0;padding-left:1.35em}
.md li{margin:.22em 0}
.md blockquote{margin:.8em 0;padding:.5em 0 .5em 14px;border-left:3px solid var(--accent);color:var(--ink-2);background:var(--panel-2)}
.md blockquote p{margin:.2em 0}
.md pre.md-code{background:var(--panel-2);border:1px solid var(--line);border-radius:8px;padding:11px 13px;overflow-x:auto;font-size:12.5px}
.md pre.md-code code{background:none;border:0;padding:0}
.md-table-wrap{overflow-x:auto;margin:.8em 0;border:1px solid var(--line);border-radius:8px}
table.md-table{border-collapse:collapse;width:100%;font-size:13px;min-width:420px}
table.md-table th,table.md-table td{padding:7px 10px;border-bottom:1px solid var(--line-2);vertical-align:top}
table.md-table th{background:var(--panel-2);font-weight:620;position:sticky;top:0;font-size:12px;text-transform:uppercase;letter-spacing:.03em;color:var(--ink-2)}
table.md-table tr:last-child td{border-bottom:0}
.md img{max-width:100%;height:auto}
.md hr{margin:1em 0}

/* ---------- data table ---------- */
.dt-wrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel)}
table.dt{border-collapse:collapse;width:100%;font-size:13px;min-width:640px}
table.dt th,table.dt td{padding:8px 11px;border-bottom:1px solid var(--line-2);text-align:left;vertical-align:top}
table.dt th{background:var(--panel-2);font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink-2);font-weight:650;white-space:nowrap}
table.dt tr:last-child td{border-bottom:0}
table.dt tr:hover td{background:var(--panel-2)}

/* ---------- decisions ---------- */
.dec{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);margin-bottom:10px;box-shadow:var(--shadow);overflow:hidden}
.dec .dhead{padding:12px 15px;display:flex;gap:11px;align-items:flex-start;flex-wrap:wrap}
.dnum{font-family:var(--mono);font-size:12px;font-weight:700;color:#fff;background:var(--accent);border-radius:6px;padding:2px 7px;flex:0 0 auto}
.dec h3{margin:0;font-size:15px;font-weight:600;flex:1;min-width:200px}
.dgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0;border-top:1px solid var(--line-2)}
.dcell{padding:11px 15px;border-right:1px solid var(--line-2)}
.dcell:last-child{border-right:0}
.dcell .k{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-2);font-weight:650;margin-bottom:4px}
.dcell .v{font-size:13px}
.pred{border-top:1px solid var(--line-2);padding:10px 15px;background:var(--panel-2);font-size:13px}
.pred-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:5px 0}
.pred-claim{font-family:var(--mono);font-size:12.5px;background:var(--panel);border:1px solid var(--line);border-radius:5px;padding:2px 7px}
.pred-state{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em}
.pred-state.open{color:var(--info)}
.pred-state.overdue{color:var(--bad)}
.pred-state.hit{color:var(--ok)}
.pred-state.missed{color:var(--bad)}
.pred-state.partial{color:var(--warn)}
.progress{flex:1;min-width:120px;max-width:260px}

/* ---------- org chart ---------- */
.org{display:flex;justify-content:center;padding:6px 2px 2px;overflow-x:auto}
.org-sub{display:flex;flex-direction:column;align-items:center;position:relative}
/* stem down from a parent that has reports */
.org-stem{width:2px;height:18px;background:var(--line);flex:0 0 auto}
.org-kids{display:flex;justify-content:center;align-items:flex-start;gap:14px}
/* each report carries a stub up to a shared rail, so the lines mean what they show */
.org-kids > .org-sub{padding-top:18px}
.org-kids > .org-sub::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--line)}
.org-kids > .org-sub::after{content:"";position:absolute;top:0;left:calc(50% - 1px);width:2px;height:18px;background:var(--line)}
.org-kids > .org-sub:first-child::before{left:calc(50% - 1px)}
.org-kids > .org-sub:last-child::before{right:calc(50% - 1px)}
.org-kids > .org-sub:only-child::before{display:none}
.org-node{
  border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);
  padding:10px 13px;min-width:180px;max-width:216px;box-shadow:var(--shadow);cursor:pointer;
  text-align:left;position:relative;color:var(--ink);font-family:var(--sans);font-size:13px
}
.org-node:hover{border-color:var(--accent)}
.org-node.exec{border-color:var(--accent);border-width:1.5px}
.org-node .role{font-weight:640;font-size:13.5px;line-height:1.3;color:var(--ink)}
.org-node .who{font-family:var(--mono);font-size:11.5px;color:var(--ink-2);margin-top:2px;word-break:break-all}
.org-node .dept{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-2);margin-top:5px;font-weight:650}
.org-node .flag{margin-top:6px}
.org-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-2);margin-top:12px;justify-content:center}
@media (max-width:760px){
  .org-kids{flex-direction:column;align-items:stretch;gap:8px;padding-left:16px;border-left:2px solid var(--line);margin-left:8px}
  .org-kids > .org-sub{padding-top:0;align-items:stretch}
  .org-kids > .org-sub::before,.org-kids > .org-sub::after{display:none}
  .org-stem{display:none}
  .org-node{max-width:none;width:100%}
}

.person{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);margin-bottom:10px;box-shadow:var(--shadow)}
.person > summary{padding:12px 15px;cursor:pointer;list-style:none;display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.person > summary::-webkit-details-marker{display:none}
.person > summary:hover{background:var(--panel-2)}
.person-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:0;border-top:1px solid var(--line-2);border-bottom:1px solid var(--line-2)}
.fact{padding:10px 15px;border-right:1px solid var(--line-2)}
.fact:last-child{border-right:0}
.fact .k{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink-2);font-weight:650}
.fact .v{font-size:13px;margin-top:3px}

/* ---------- charts ---------- */
.chart{width:100%;height:auto;display:block}
.chart-wrap{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px 6px;box-shadow:var(--shadow)}
.chart-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink-2);padding:2px 2px 8px}
.swatch{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}

/* ---------- kanban ---------- */
.kanban{display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;align-items:flex-start}
.col{flex:0 0 232px;background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius);display:flex;flex-direction:column}
.col h4{margin:0;padding:10px 12px;font-size:12.5px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:8px;align-items:center}
.col .stage-n{font-family:var(--mono);font-size:11px;color:var(--ink-2)}
.col .body{padding:9px 11px;font-size:12px;color:var(--ink-2);flex:1;min-height:64px}
.col .owner{font-family:var(--mono);font-size:11px;color:var(--ink-2);padding:0 12px 9px}
.gate{font-size:11.5px;color:var(--ink-2);border-top:1px dashed var(--line);padding:8px 12px}
.gate b{color:var(--ink);font-weight:600}

/* ---------- search ---------- */
#searchbox{position:relative;flex:1;min-width:180px;max-width:320px}
#q{width:100%;font:inherit;font-size:13px;padding:6px 10px;border:1px solid var(--line);border-radius:7px;background:var(--panel-2);color:var(--ink)}
#results{
  position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--panel);
  border:1px solid var(--line);border-radius:var(--radius);box-shadow:0 8px 28px rgba(16,24,40,.16);
  max-height:66vh;overflow:auto;display:none;z-index:60;min-width:320px
}
#results.on{display:block}
#results a{display:block;padding:9px 12px;border-bottom:1px solid var(--line-2);color:var(--ink);text-decoration:none}
#results a:last-child{border-bottom:0}
#results a:hover,#results a.sel{background:var(--panel-2)}
#results .rt{font-size:13px;font-weight:560}
#results .rs{font-size:11.5px;color:var(--ink-2);font-family:var(--mono);word-break:break-all}
#results .none{padding:12px;color:var(--ink-2);font-size:13px}

.sources{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:8px}
.src{border:1px solid var(--line);border-radius:8px;padding:9px 11px;background:var(--panel);font-size:12.5px}
.src .ok{color:var(--ok);font-weight:650}
.src .no{color:var(--bad);font-weight:650}
.src .path{font-family:var(--mono);font-size:11px;color:var(--ink-2);word-break:break-all;margin-top:3px}

footer.foot{margin-top:36px;padding-top:16px;border-top:1px solid var(--line);color:var(--ink-2);font-size:12.5px}

@media (max-width:640px){
  .brand h1{font-size:21px}
  .tl-head{flex-direction:column;gap:3px}
  .tl-date{min-width:0}
  .dcell{border-right:0;border-bottom:1px solid var(--line-2)}
  .fact{border-right:0;border-bottom:1px solid var(--line-2)}
  .doc-body{padding:6px 12px 16px;max-height:520px}
  .org-node{min-width:150px}
  .kpi .value{font-size:21px}
}
@media print{
  nav.tabs,#searchbox,.filters{display:none}
  details{open:true}
  .doc-body{max-height:none}
}
`;

export const JS = `
(function(){
  "use strict";
  var D = window.__HK__ || {};

  /* ----- theme ----- */
  var root = document.documentElement;
  try{ var saved = localStorage.getItem('hk-theme'); if(saved) root.setAttribute('data-theme', saved); }catch(e){}
  var tbtn = document.getElementById('theme');
  if(tbtn) tbtn.addEventListener('click', function(){
    var now = root.getAttribute('data-theme');
    var next = now === 'dark' ? 'light' : now === 'light' ? 'dark'
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches ? 'light' : 'dark');
    root.setAttribute('data-theme', next);
    try{ localStorage.setItem('hk-theme', next); }catch(e){}
  });

  /* ----- section highlighting ----- */
  var links = [].slice.call(document.querySelectorAll('nav.tabs a[href^="#"]'));
  var sections = links.map(function(a){ return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  function onScroll(){
    var y = window.scrollY + 90, best = null;
    for(var i=0;i<sections.length;i++){ if(sections[i].offsetTop <= y) best = sections[i]; }
    links.forEach(function(a){ a.classList.toggle('active', best && a.getAttribute('href') === '#' + best.id); });
  }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* ----- generic filtering ----- */
  function wireFilters(scopeId){
    var scope = document.getElementById(scopeId);
    if(!scope) return;
    var controls = [].slice.call(scope.querySelectorAll('[data-filter]'));
    var items = [].slice.call(scope.querySelectorAll('[data-row]'));
    var counter = scope.querySelector('[data-count]');
    function apply(){
      var shown = 0;
      items.forEach(function(el){
        var ok = true;
        controls.forEach(function(c){
          var key = c.getAttribute('data-filter');
          var want = (c.value || '').trim();
          if(!want) return;
          var have = el.getAttribute('data-' + key) || '';
          if(key === 'text'){
            if(have.toLowerCase().indexOf(want.toLowerCase()) === -1) ok = false;
          } else if(have !== want) ok = false;
        });
        el.style.display = ok ? '' : 'none';
        if(ok) shown++;
      });
      if(counter) counter.textContent = shown + ' of ' + items.length + ' shown';
    }
    controls.forEach(function(c){ c.addEventListener('input', apply); c.addEventListener('change', apply); });
    apply();
  }
  ['timeline','plans','workdone','decisions','clusters','blocked','people'].forEach(wireFilters);

  /* ----- chip toggles (tier / status quick filters) ----- */
  [].slice.call(document.querySelectorAll('[data-chipgroup]')).forEach(function(group){
    var target = document.getElementById(group.getAttribute('data-chipgroup'));
    var chips = [].slice.call(group.querySelectorAll('.chip'));
    chips.forEach(function(chip){
      chip.addEventListener('click', function(){
        var on = chip.classList.contains('on');
        chips.forEach(function(c){ c.classList.remove('on'); });
        if(!on) chip.classList.add('on');
        if(target){ target.value = on ? '' : chip.getAttribute('data-value'); target.dispatchEvent(new Event('change')); }
      });
    });
  });

  /* ----- search ----- */
  var q = document.getElementById('q');
  var results = document.getElementById('results');
  var index = D.search || [];
  // Escapes the apostrophe and backtick too: everything built here goes through
  // innerHTML, and a value can land in an attribute quoted either way.
  var ESC = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','\`':'&#96;'};
  function esc(s){ return String(s === null || s === undefined ? '' : s).replace(/[&<>"'\`]/g, function(c){ return ESC[c]; }); }
  function search(term){
    var t = term.toLowerCase().trim();
    if(t.length < 2){ results.classList.remove('on'); results.innerHTML=''; return; }
    var words = t.split(/\\s+/);
    var hits = [];
    for(var i=0;i<index.length;i++){
      var row = index[i], score = 0, ok = true;
      for(var w=0; w<words.length; w++){
        var inTitle = row.title.toLowerCase().indexOf(words[w]) !== -1;
        var inText = row.text.indexOf(words[w]) !== -1;
        if(!inTitle && !inText){ ok = false; break; }
        score += inTitle ? 12 : 1;
      }
      if(ok) hits.push({row:row, score:score});
    }
    hits.sort(function(a,b){ return b.score - a.score; });
    if(!hits.length){ results.innerHTML = '<div class="none">Nothing matches &ldquo;' + esc(term) + '&rdquo;.</div>'; results.classList.add('on'); return; }
    results.innerHTML = hits.slice(0,40).map(function(h){
      return '<a href="#' + h.row.target + '" data-go="' + h.row.target + '"><span class="rt">' + esc(h.row.title) +
        '</span><br><span class="rs">' + esc(h.row.kind) + ' &middot; ' + esc(h.row.sub || '') + '</span></a>';
    }).join('');
    results.classList.add('on');
  }
  if(q){
    q.addEventListener('input', function(){ search(q.value); });
    q.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ q.value=''; results.classList.remove('on'); q.blur(); } });
    document.addEventListener('click', function(e){
      if(results.contains(e.target)){
        var a = e.target.closest('a[data-go]');
        if(a) setTimeout(function(){ reveal(a.getAttribute('data-go')); results.classList.remove('on'); }, 0);
        return;
      }
      if(e.target !== q) results.classList.remove('on');
    });
    document.addEventListener('keydown', function(e){
      if(e.key === '/' && document.activeElement !== q && !/input|textarea/i.test(document.activeElement.tagName)){
        e.preventDefault(); q.focus();
      }
    });
  }

  /* ----- open a target that lives inside a collapsed section ----- */
  function reveal(id){
    var el = document.getElementById(id);
    if(!el) return;
    var p = el;
    while(p){ if(p.tagName === 'DETAILS') p.open = true; p = p.parentElement; }
    el.scrollIntoView({behavior:'smooth', block:'start'});
    el.style.transition = 'background-color .35s';
    var prev = el.style.backgroundColor;
    el.style.backgroundColor = 'var(--gold-soft)';
    setTimeout(function(){ el.style.backgroundColor = prev; }, 1300);
  }
  window.addEventListener('hashchange', function(){ reveal(location.hash.slice(1)); });
  if(location.hash) setTimeout(function(){ reveal(location.hash.slice(1)); }, 60);

  /* ----- what changed since last visit ----- */
  var feed = document.getElementById('changed-feed');
  if(feed && D.changes){
    var key = 'hk-last-seen';
    var last = null;
    try{ last = localStorage.getItem(key); }catch(e){}
    var fresh = last ? D.changes.filter(function(c){ return c.mtime > last; }) : [];
    var head = document.getElementById('changed-head');
    if(!last){
      head.textContent = 'First visit on this browser — everything below is new to you. Next time this shows only what changed.';
    } else if(!fresh.length){
      head.textContent = 'Nothing has changed since your last visit (' + last.slice(0,16).replace('T',' ') + ').';
    } else {
      head.textContent = fresh.length + ' document' + (fresh.length===1?'':'s') + ' changed since your last visit (' + last.slice(0,16).replace('T',' ') + ').';
    }
    var list = (fresh.length ? fresh : D.changes.slice(0,8));
    // data-go plus a delegated listener, never an inline handler built from data:
    // a value inside an onclick string is decoded by the HTML parser before the
    // JS parser sees it, so a quote in it would break out of the string.
    feed.innerHTML = list.map(function(c){
      return '<div class="tl-item"><div class="tl-head" data-go="' + esc(c.docId) + '">' +
        '<div class="tl-date">' + esc(c.mtime.slice(0,10)) + '</div>' +
        '<div style="flex:1"><div class="tl-title">' + esc(c.title) + '</div>' +
        '<div class="tl-meta"><span>' + esc(c.kind) + '</span><span class="mono">' + esc(c.path) + '</span></div></div></div></div>';
    }).join('');
    feed.addEventListener('click', function(ev){
      var row = ev.target.closest('[data-go]');
      if(row) reveal(row.getAttribute('data-go'));
    });
    try{ localStorage.setItem(key, new Date().toISOString()); }catch(e){}
  }

  /* ----- expand long documents ----- */
  [].slice.call(document.querySelectorAll('[data-expand]')).forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var body = document.getElementById(btn.getAttribute('data-expand'));
      if(!body) return;
      body.classList.toggle('tall');
      btn.textContent = body.classList.contains('tall') ? 'Collapse to a window' : 'Expand the whole document';
    });
  });
})();
`;
