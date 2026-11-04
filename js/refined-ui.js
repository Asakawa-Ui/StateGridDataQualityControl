'use strict';

// 精细视觉组件，数据和业务行为沿用现有质控模型。
const refinedKpis = dsKpis;
dsKpis = function () {
  let index = 0;
  const symbols = ['shield', 'database', 'clock', 'bell'];
  return refinedKpis().replace(/<div class="ds-kpi">/g, () => {
    const n = index++;
    return `<div class="ds-kpi metric-${n}"><span class="metric-emblem" aria-hidden="true">${icon(symbols[n])}</span>`;
  });
};

const refinedCard = dsCard;
dsCard = function (...args) {
  return refinedCard(...args).replace(/(<h3>)([\s\S]*?)(<\/h3>)/, (all, start, title, end) =>
    start + title.replace(/(<svg[\s\S]*?<\/svg>)/, '<span class="card-symbol">$1</span>') + end);
};

dsGovernanceBody = function () {
  const list = filteredEvents();
  const closed = list.filter(e => e.status === '已闭环').length;
  const stages = dsStageCounts().filter(([name]) => name !== '已闭环');
  const colors = ['#efb66b', '#86b9ee', '#65d4c4', '#a49ad7'];
  const total = stages.reduce((sum, [, count]) => sum + count, 0);
  let offset = 0;
  const segments = stages.map(([, count], i) => {
    const start = offset;
    offset += total ? count / total * 100 : 0;
    return `${colors[i]} ${start}% ${offset}%`;
  });
  return `<div class="ref-governance"><div class="ref-governance-ring" style="--stage-gradient:${total ? 'conic-gradient(from -90deg,' + segments.join(',') + ')' : '#243f53'}" role="img" aria-label="待处理${total}项，已闭环${closed}项"><div><b>${total}<small>项</small></b><span>待处理事件</span></div></div><div class="ref-stage-list">${stages.map(([name, count], i) => `<button onclick="openEvents('${name}')"><i style="background:${colors[i]}"></i><span>${name}</span><b>${count}</b></button>`).join('')}</div></div><div class="ref-governance-foot"><span>本期已闭环 <b>${closed}</b> 项</span><span>共 <b>${list.length}</b> 项事件</span></div>`;
};

dsAlertList = function (rows, open = true) {
  if (!rows.length) return dsEmpty('当前范围没有待处理告警');
  return rows.map((e, i) => `<button class="ds-alert-item refined-alert ${e.level === '严重' ? 'critical' : e.level === '重要' ? 'important' : 'general'}" onclick="${open ? `openEvent('${e.id}')` : `selectScreenEvent('${e.id}')`}"><span class="ref-alert-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="ds-alert-copy"><strong>${station(e.station).n}</strong><span class="ref-alert-type">${e.type}</span><small>${e.id}<span>${e.time} · ${e.status}</span></small></span>${dsTag(e.level, dsEventColor(e))}</button>`).join('');
};

dsStationList = function (limit = 3) {
  const rows = tileView.status === 'all' ? dsScopedStations().slice(0, limit).map(s => ({id: s.id, name: s.n, note: s.id + ' / ' + s.element, quality: s.quality})) : networkShown().slice(0, limit).map(s => ({id: s.id, name: s.name, note: s.id, status: networkStatus(s)}));
  if (!rows.length) return dsEmpty('当前没有匹配的站点');
  return rows.map((s, i) => `<button class="ds-station-row refined-station" onclick="selectNetworkStation('${s.id}')"><span class="ref-station-index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="ref-station-copy"><strong>${esc(s.name)}</strong><small>${esc(s.note)}</small>${s.quality !== undefined ? `<i class="ref-quality-track"><i style="width:${s.quality}%"></i></i>` : ''}</span><b class="${s.quality < 98 ? 'amber' : ''}">${s.quality !== undefined ? s.quality.toFixed(2) + '<em>%</em>' : NETWORK_STATUS[s.status].label}</b></button>`).join('');
};

dsTypeBody = function () {
  const list = filteredEvents();
  if (!list.length) return dsEmpty();
  const types = [...new Set(list.map(e => e.type))].map(type => ({name: type, count: list.filter(e => e.type === type).length})).sort((a, b) => b.count - a.count);
  return `<div class="ref-type-grid">${types.map((type, i) => `<div class="ref-type-tile"><span><i class="ref-type-dot type-${i % 3}"></i>${esc(type.name.replace('异常', ''))}</span><div><b>${type.count}</b><small>${(type.count / list.length * 100).toFixed(1)}%</small></div></div>`).join('')}</div>`;
};

render();
