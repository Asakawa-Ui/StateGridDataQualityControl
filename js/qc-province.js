'use strict';

/**
 * S3 数据核查（主要变化范围、内部一致性、时间一致性）
 * 1. 面板 1（右上）：分要素展示对应方法通过的时次及占比
 * 2. 面板 2（底左）：S3 数据核查清单（时间一致性突变 / 内部一致性与范围异常）
 * 3. 面板 3（底右）：S3 数据核查趋势（24 时次平滑走势）
 * 4. 顶部 KPI：S3 综合通过率、变化范围通过率、内部一致性通过率、时间一致性通过率
 */

const QCP_ELEMENTS = [
  { key: 'TEM', name: '气温', unit: '℃', total: 1440, rangePass: 1432, intPass: 1428, timePass: 1424 },
  { key: 'PRS', name: '气压', unit: 'hPa', total: 1440, rangePass: 1435, intPass: 1430, timePass: 1431 },
  { key: 'RHU', name: '相对湿度', unit: '%', total: 1440, rangePass: 1431, intPass: 1425, timePass: 1427 },
  { key: 'WIN', name: '风速', unit: 'm/s', total: 1440, rangePass: 1429, intPass: 1426, timePass: 1422 },
  { key: 'WDIR', name: '风向', unit: '°', total: 1440, rangePass: 1436, intPass: 1428, timePass: 1425 },
  { key: 'RAIN', name: '雨量', unit: 'mm', total: 1440, rangePass: 1433, intPass: 1431, timePass: 1426 },
  { key: 'RAD', name: '总辐射', unit: 'W/m²', total: 1440, rangePass: 1430, intPass: 1427, timePass: 1423 },
  { key: 'ELEC', name: '大气电场', unit: 'kV/m', total: 1440, rangePass: 1428, intPass: 1424, timePass: 1420 }
];

function qcpElemMethodData() {
  const scopeFactor = (S.scope === '全国') ? 22 : 1;
  const isConn = (S.scope === '全国' || (typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function' && QcDatabase.isProvinceConnected(S.scope)));
  
  return QCP_ELEMENTS.map(elem => {
    if (!isConn) {
      return {
        ...elem,
        totalHours: 0,
        rangeHours: 0, rangeRate: '0.00',
        intHours: 0, intRate: '0.00',
        timeHours: 0, timeRate: '0.00',
        compRate: '0.00'
      };
    }
    const total = elem.total * scopeFactor;
    const range = elem.rangePass * scopeFactor;
    const internal = elem.intPass * scopeFactor;
    const time = elem.timePass * scopeFactor;
    const comp = Math.round(Math.min(range, internal, time) * 0.998);

    return {
      ...elem,
      totalHours: total,
      rangeHours: range,
      rangeRate: (range / total * 100).toFixed(2),
      intHours: internal,
      intRate: (internal / total * 100).toFixed(2),
      timeHours: time,
      timeRate: (time / total * 100).toFixed(2),
      compRate: (comp / total * 100).toFixed(2)
    };
  });
}

// 切换当前聚焦要素
function qcpSelectElement(elemName) {
  S.element = elemName;
  render();
}

// 1. 右上方：分要素展示对应方法通过的时次及占比
function qcpElemMethodPassCard() {
  const list = qcpElemMethodData();
  const curElem = S.element || '综合';

  const rowsHtml = list.map(item => {
    const isCur = (curElem === item.name) || (curElem === '综合' && item.name === '气温');
    return `
      <div class="qcp-elem-card ${isCur ? 'active' : ''}" onclick="qcpSelectElement('${item.name}')">
        <div class="qcp-elem-card-head">
          <div class="qcp-elem-meta">
            <strong class="qcp-elem-title">${item.name}</strong>
            <span class="qcp-elem-unit">${item.unit}</span>
          </div>
          <div class="qcp-elem-comp-rate">
            <span>综合通过率</span>
            <b>${item.compRate}%</b>
          </div>
        </div>

        <div class="qcp-methods-grid">
          <div class="qcp-method-row method-range">
            <span class="qcp-m-label">主要变化范围</span>
            <div class="qcp-m-bar-wrap">
              <div class="qcp-m-bar"><i style="width:${item.rangeRate}%;background:#36b3d9;box-shadow:0 0 6px #36b3d988"></i></div>
            </div>
            <span class="qcp-m-val" title="${num(item.rangeHours)} / ${num(item.totalHours)} 时次">${num(item.rangeHours)}时次</span>
            <b class="qcp-m-pct" style="color:#36b3d9">${item.rangeRate}%</b>
          </div>

          <div class="qcp-method-row method-internal">
            <span class="qcp-m-label">内部一致性</span>
            <div class="qcp-m-bar-wrap">
              <div class="qcp-m-bar"><i style="width:${item.intRate}%;background:#8e9dfa;box-shadow:0 0 6px #8e9dfa88"></i></div>
            </div>
            <span class="qcp-m-val" title="${num(item.intHours)} / ${num(item.totalHours)} 时次">${num(item.intHours)}时次</span>
            <b class="qcp-m-pct" style="color:#8e9dfa">${item.intRate}%</b>
          </div>

          <div class="qcp-method-row method-time">
            <span class="qcp-m-label">时间一致性</span>
            <div class="qcp-m-bar-wrap">
              <div class="qcp-m-bar"><i style="width:${item.timeRate}%;background:#f0ad4e;box-shadow:0 0 6px #f0ad4e88"></i></div>
            </div>
            <span class="qcp-m-val" title="${num(item.timeHours)} / ${num(item.totalHours)} 时次">${num(item.timeHours)}时次</span>
            <b class="qcp-m-pct" style="color:#f0ad4e">${item.timeRate}%</b>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const bodyHtml = `
    <div class="qcp-method-pass-body">
      <div class="qcp-elem-scroll-list">
        ${rowsHtml}
      </div>
    </div>
  `;

  return dsCard('核查方法通过时次与占比', bodyHtml, `分要素 · 3类方法`, 'qcp-elem-pass-card', 'layers');
}

// 2. S3 三大异常清单数据源（主要变化范围、内部一致性、时间一致性）
const S3_RAW_RANGE_ISSUES = [
  { id: 'S3-R-01', stationId: 'AH-HS-022', stationName: '黄山歙县站', deviceName: '220kV 歙县变', prov: '安徽省', element: '气压', val: '1125.2 hPa', diff: '超出上限 +25.2 hPa', method: '主要变化范围', rule: 'QC-RANGE-OVER', time: '10-23 11:30', tag: '范围超界', type: 'range', reason: '气压绝对值超出测站海拔变化合理范围' },
  { id: 'S3-R-02', stationId: 'HB-WH-087', stationName: '武汉江夏站', deviceName: '220kV 江夏变', prov: '湖北省', element: '气温', val: '44.5 ℃', diff: '突破分位界限 +2.5℃', method: '主要变化范围', rule: 'QC-RANGE-EXCEED', time: '10-23 14:15', tag: '范围超限', type: 'range', reason: '气温超出该季节测站合理变化区间' },
  { id: 'S3-R-03', stationId: 'JS-YC-066', stationName: '盐城滨海站', deviceName: '500kV 滨海线 #076', prov: '江苏省', element: '雨量', val: '278.4 mm', diff: '超出日极值上限', method: '主要变化范围', rule: 'QC-RANGE-RAIN', time: '10-23 10:40', tag: '极值超界', type: 'range', reason: '累计雨量突破本地日降水历史阈值区间' },
  { id: 'S3-R-04', stationId: 'HN-CS-041', stationName: '长沙望城站', deviceName: '500kV 望城变', prov: '湖南省', element: '相对湿度', val: '103.5 %', diff: '超出物理饱和界限', method: '主要变化范围', rule: 'QC-RANGE-RH', time: '10-23 13:50', tag: '饱和溢出', type: 'range', reason: '高湿环境湿敏电容凝结短路造成数值溢出' },
  { id: 'S3-R-05', stationId: 'SC-GZ-028', stationName: '甘孜康定站', deviceName: '500kV 甘康线 #128', prov: '四川省', element: '风速', val: '43.5 m/s', diff: '超出抗风设计界限', method: '主要变化范围', rule: 'QC-RANGE-WSPD', time: '10-23 15:42', tag: '狂风超界', type: 'range', reason: '峡谷瞬时极端突风突破风速传感器标定范围' },
  { id: 'S3-R-06', stationId: 'ZJ-HZ-013', stationName: '杭州余杭站', deviceName: '500kV 余杭变', prov: '浙江省', element: '大气电场', val: '64.2 kV/m', diff: '突破地面晴空界限', method: '主要变化范围', rule: 'QC-RANGE-ELEC', time: '10-23 15:20', tag: '场强超界', type: 'range', reason: '雷暴强对流单体过境诱发地面强电场' }
];

const S3_RAW_INTERNAL_ISSUES = [
  { id: 'S3-I-01', stationId: 'HN-CS-041', stationName: '长沙望城站', deviceName: '500kV 望城变', prov: '湖南省', element: '相对湿度', val: '100.0 % (气温39℃)', diff: '负相关性失效', method: '内部一致性', rule: 'QC-INT-T-RH', time: '10-23 13:50', tag: '协同倒挂', type: 'internal', reason: '极端高温下相对湿度饱和，违背温湿负相关物理规律' },
  { id: 'S3-I-02', stationId: 'SC-GZ-028', stationName: '甘孜康定站', deviceName: '500kV 甘康线 #128', prov: '四川省', element: '风速', val: '32.4 m/s (风向38°)', diff: '风压风速失谐', method: '内部一致性', rule: 'QC-INT-W-P', time: '10-23 15:40', tag: '失谐', type: 'internal', reason: '大风速下杆塔动态压差未同步响应' },
  { id: 'S3-I-03', stationId: 'ZJ-HZ-013', stationName: '杭州余杭站', deviceName: '500kV 余杭变', prov: '浙江省', element: '大气电场', val: '-42.8 kV/m', diff: '反向极性异常', method: '内部一致性', rule: 'QC-INT-ELEC', time: '10-23 15:20', tag: '极性反转', type: 'internal', reason: '晴空背景下电场极性与邻近通道相反' },
  { id: 'S3-I-04', stationId: 'AH-HS-022', stationName: '黄山歙县站', deviceName: '220kV 歙县变', prov: '安徽省', element: '气压', val: '1014.2 hPa (骤升4hPa)', diff: '温压耦合失效', method: '内部一致性', rule: 'QC-INT-T-P', time: '10-23 11:30', tag: '热力失谐', type: 'internal', reason: '气压陡升时气温剧烈反常波动，违反温压互锁' },
  { id: 'S3-I-05', stationId: 'JS-YC-066', stationName: '盐城滨海站', deviceName: '500kV 滨海线 #076', prov: '江苏省', element: '总辐射', val: '1380 W/m² (地温无升)', diff: '感热响应脱节', method: '内部一致性', rule: 'QC-INT-RAD-T', time: '10-23 10:40', tag: '辐射脱节', type: 'internal', reason: '强辐射背景下近地面气温完全不响应' }
];

const S3_RAW_TIME_ISSUES = [
  { id: 'S3-T-01', stationId: 'SC-GZ-028', stationName: '甘孜康定站', deviceName: '500kV 甘康线 #128', prov: '四川省', element: '风速', val: '28.6 m/s', diff: '+18.2 m/s / 10min', method: '时间一致性', rule: 'QC-TIME-JUMP', time: '10-23 15:40', tag: '突变', type: 'time', reason: '相邻时次风速阶跃突增突破极值斜率' },
  { id: 'S3-T-02', stationId: 'ZJ-HZ-013', stationName: '杭州余杭站', deviceName: '500kV 余杭变', prov: '浙江省', element: '大气电场', val: '48.2 kV/m', diff: '+24.6 kV/m / 10min', method: '时间一致性', rule: 'QC-TIME-STEP', time: '10-23 15:20', tag: '阶跃', type: 'time', reason: '对流雷云过境造成电场时序离散跳变' },
  { id: 'S3-T-03', stationId: 'AH-HS-022', stationName: '黄山歙县站', deviceName: '220kV 歙县变', prov: '安徽省', element: '气温', val: '36.4 ℃', diff: '+6.8 ℃ / 10min', method: '时间一致性', rule: 'QC-TIME-SURGE', time: '10-23 14:30', tag: '骤升', type: 'time', reason: '变电区局地辐射升温致使温升过快' },
  { id: 'S3-T-04', stationId: 'JS-YC-066', stationName: '盐城滨海站', deviceName: '500kV 滨海线 #076', prov: '江苏省', element: '气压', val: '992.4 hPa', diff: '-9.2 hPa / 10min', method: '时间一致性', rule: 'QC-TIME-DROP', time: '10-23 13:10', tag: '骤降', type: 'time', reason: '海风锋面过境气压阶梯式深幅陡降' },
  { id: 'S3-T-05', stationId: 'HB-WH-087', stationName: '武汉江夏站', deviceName: '220kV 江夏变', prov: '湖北省', element: '相对湿度', val: '74.0 %', diff: '连续 6 时次无波动', method: '时间一致性', rule: 'QC-TIME-STUCK', time: '10-23 12:00', tag: '卡滞', type: 'time', reason: '湿敏传感器采样通道电平锁死卡滞' },
  { id: 'S3-T-06', stationId: 'HN-CS-041', stationName: '长沙望城站', deviceName: '500kV 望城变', prov: '湖南省', element: '雨量', val: '64.8 mm', diff: '+52.4 mm / 10min', method: '时间一致性', rule: 'QC-TIME-PULSE', time: '10-23 11:40', tag: '脉冲', type: 'time', reason: '机械计数翻斗受风振扰动连续误抖动' }
];

function qcpFilterListByScope(list) {
  return (S.scope === '全国') ? list : list.filter(item => item.prov === S.scope);
}

function qcpOpenAuditModal(id) {
  const all = [...S3_RAW_RANGE_ISSUES, ...S3_RAW_INTERNAL_ISSUES, ...S3_RAW_TIME_ISSUES];
  const item = all.find(x => x.id === id);
  if (!item) return;
  S.detail = null;

  const infoPairs = [
    ['装置线路', item.deviceName],
    ['所在站址', `${item.stationName} (${item.prov})`],
    ['核查要素', item.element],
    ['核查方法', item.method],
    ['质控规则', item.rule],
    ['异常特征', item.tag],
    ['实测数值', item.val],
    ['偏离情况', item.diff],
    ['检出时次', item.time],
    ['机理核查结论', item.reason]
  ];

  coreOpenModal(`数据核查诊断 · ${item.deviceName}`, qccInfo(infoPairs) + qccNote('S3综合数据核查依据时间连续差分、地面要素内部物理耦合关联及多级变化范围进行综合校验，异常样本已纳入复核清单。'));
}

// 通用渲染 S3 单类核查异常清单卡片（统一驾驶舱清单样式：无条数标识，全部入口置于底部）
function qcpRenderSingleListCard(title, rawList, typeCls, iconName, allModalFnName) {
  const list = qcpFilterListByScope(rawList);

  const renderItem = (item, idx) => {
    const idxStr = String(idx + 1).padStart(2, '0');
    return `
      <button type="button" class="qcr-issue-item is-${typeCls}" onclick="qcpOpenAuditModal('${item.id}')">
        <div class="qcr-issue-row1">
          <span class="qcr-issue-idx">${idxStr}</span>
          <span class="qcr-elem-badge badge-${typeCls}">${item.element}</span>
          <strong class="qcr-issue-dev" title="${esc(item.deviceName)}">${esc(item.deviceName)}</strong>
          <time class="qcr-issue-time">${item.time}</time>
        </div>
        <div class="qcr-issue-row2">
          <div class="qcr-issue-left">
            <span class="qcr-issue-station">${esc(item.stationName)}</span>
            <span class="qcr-issue-prov">${esc(item.prov)}</span>
          </div>
          <div class="qcr-issue-right">
            <span class="qcr-issue-diff" title="${item.diff}">${item.diff}</span>
            <b class="qcr-issue-val val-${typeCls}">${item.val}</b>
          </div>
        </div>
      </button>
    `;
  };

  const itemsHtml = list.map(renderItem).join('');
  const scrollHtml = list.length
    ? `<div class="qcr-auto-scroll-list" tabindex="0" role="region" aria-label="${title}">
         <div class="qcr-scroll-track track-1">${itemsHtml}</div>
         <div class="qcr-scroll-track track-2" aria-hidden="true">${itemsHtml}</div>
       </div>`
    : dsEmpty('当前筛选无异常记录');

  const footHtml = `
    <div class="qco-problem-foot">
      <button type="button" class="qco-prob-all-btn" onclick="${allModalFnName}()">全部${icon('chevron')}</button>
    </div>
  `;

  return dsCard(title, scrollHtml + footHtml, '', `qcp-${typeCls}-card qcr-issue-card`, iconName);
}

// 1. 右上卡片：主要变化范围异常清单
function qcpRangeCard() {
  return qcpRenderSingleListCard('主要变化范围异常清单', S3_RAW_RANGE_ISSUES, 'range', 'layers', 'qcpOpenAllRangeModal');
}

// 2. 右中卡片：内部一致性异常清单
function qcpInternalCard() {
  return qcpRenderSingleListCard('内部一致性异常清单', S3_RAW_INTERNAL_ISSUES, 'internal', 'activity', 'qcpOpenAllInternalModal');
}

// 3. 右下卡片：时间一致性异常清单
function qcpTimeCard() {
  return qcpRenderSingleListCard('时间一致性异常清单', S3_RAW_TIME_ISSUES, 'time', 'clock', 'qcpOpenAllTimeModal');
}

// 查看全部：主要变化范围异常弹窗
function qcpOpenAllRangeModal() {
  const list = qcpFilterListByScope(S3_RAW_RANGE_ISSUES);
  S.detail = null;
  const rows = list.map((item, idx) => [
    String(idx + 1).padStart(2, '0'),
    `<b>${esc(item.deviceName)}</b><br><small style="color:#7fb5d1">${esc(item.stationName)} (${esc(item.prov)})</small>`,
    `<span class="qcr-elem-badge badge-range">${esc(item.element)}</span>`,
    `<b style="color:#36b3d9">${esc(item.val)}</b>`,
    `<span style="color:#a8c9dd">${esc(item.diff)}</span>`,
    `<time style="font-family:var(--pg-number-font);color:#8cb4cb">${item.time}</time>`,
    `<button class="ds-button" onclick="closeModal();qcpOpenAuditModal('${item.id}')">诊断</button>`
  ]);
  const summary = `<div class="qcc-info"><div><span>管理范围</span><b>${S.scope} · ${S.period}</b></div><div><span>范围异常</span><b style="color:#36b3d9">${list.length} 站次</b></div><div><span>核查方法</span><b>主要变化范围校验</b></div></div>`;
  coreOpenModal('主要变化范围异常清单 · 全量记录', summary + qccTable(['序号', '装置线路 / 站址', '监测要素', '实测值', '偏离情况', '检出时次', '操作'], rows) + qccNote('主要变化范围基于测站地理气候合理变化极值进行校验，超出合理变化区间的观测已被标记为可疑或错误。'));
}

// 查看全部：内部一致性异常弹窗
function qcpOpenAllInternalModal() {
  const list = qcpFilterListByScope(S3_RAW_INTERNAL_ISSUES);
  S.detail = null;
  const rows = list.map((item, idx) => [
    String(idx + 1).padStart(2, '0'),
    `<b>${esc(item.deviceName)}</b><br><small style="color:#7fb5d1">${esc(item.stationName)} (${esc(item.prov)})</small>`,
    `<span class="qcr-elem-badge badge-internal">${esc(item.element)}</span>`,
    `<b style="color:#8e9dfa">${esc(item.val)}</b>`,
    `<span style="color:#a8c9dd">${esc(item.diff)}</span>`,
    `<time style="font-family:var(--pg-number-font);color:#8cb4cb">${item.time}</time>`,
    `<button class="ds-button" onclick="closeModal();qcpOpenAuditModal('${item.id}')">诊断</button>`
  ]);
  const summary = `<div class="qcc-info"><div><span>管理范围</span><b>${S.scope} · ${S.period}</b></div><div><span>内部一致性异常</span><b style="color:#8e9dfa">${list.length} 站次</b></div><div><span>核查方法</span><b>多要素物理相关性校验</b></div></div>`;
  coreOpenModal('内部一致性异常清单 · 全量记录', summary + qccTable(['序号', '装置线路 / 站址', '监测要素', '实测值', '失谐情况', '检出时次', '操作'], rows) + qccNote('内部一致性基于温湿度负相关、风速风压耦合、晴空电场极性等多要素自然规律进行物理互验。'));
}

// 查看全部：时间一致性异常弹窗
function qcpOpenAllTimeModal() {
  const list = qcpFilterListByScope(S3_RAW_TIME_ISSUES);
  S.detail = null;
  const rows = list.map((item, idx) => [
    String(idx + 1).padStart(2, '0'),
    `<b>${esc(item.deviceName)}</b><br><small style="color:#7fb5d1">${esc(item.stationName)} (${esc(item.prov)})</small>`,
    `<span class="qcr-elem-badge badge-time">${esc(item.element)}</span>`,
    `<b style="color:#f0ad4e">${esc(item.val)}</b>`,
    `<span style="color:#a8c9dd">${esc(item.diff)}</span>`,
    `<time style="font-family:var(--pg-number-font);color:#8cb4cb">${item.time}</time>`,
    `<button class="ds-button" onclick="closeModal();qcpOpenAuditModal('${item.id}')">诊断</button>`
  ]);
  const summary = `<div class="qcc-info"><div><span>管理范围</span><b>${S.scope} · ${S.period}</b></div><div><span>时间一致性异常</span><b style="color:#f0ad4e">${list.length} 站次</b></div><div><span>核查方法</span><b>连续时序突变与卡滞校验</b></div></div>`;
  coreOpenModal('时间一致性异常清单 · 全量记录', summary + qccTable(['序号', '装置线路 / 站址', '监测要素', '实测值', '突变偏离', '检出时次', '操作'], rows) + qccNote('时间一致性依据前后时次差分速率阈值与持续定值卡滞规则进行校验，识别数据突变或探头死锁。'));
}

// 4. 左下大面板：综合质控情况趋势
function qcpAuditTrendCard() {
  return dsCard(
    '综合质控情况趋势',
    `<div class="qcp-trend-chart dashboard-echart" data-dashboard-chart="s3-trend" role="img" aria-label="${S.scope} ${S.period} 综合质控情况趋势"></div><div class="qcp-trend-legend"><span><i style="background:#1fc79a"></i>S3通过率</span><span><i style="background:#36b3d9"></i>主要变化范围</span><span><i style="background:#8e9dfa"></i>内部一致性</span><span><i style="background:#f0ad4e"></i>时间一致性</span></div>`,
    S.period,
    'qcp-trend-card',
    'chart'
  );
}

// 4. 原上方 4 个通过率卡片：移至综合质控情况趋势面板左侧，2*2 布局
function qcpKpiGrid2x2() {
  const isConn = (S.scope === '全国' || (typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function' && QcDatabase.isProvinceConnected(S.scope)));
  const total = isConn ? 30720 : 0;
  const s3Pass = isConn ? 30308 : 0;
  const rangePass = isConn ? 30542 : 0;
  const intPass = isConn ? 30465 : 0;
  const timePass = isConn ? 30382 : 0;

  const toPct = val => total ? (val / total * 100).toFixed(2) : '0.00';

  const kpis = [
    { title: 'S3综合通过率', val: toPct(s3Pass) + '%', count: `${num(s3Pass)} / ${num(total)}`, color: '#1fc79a', fill: toPct(s3Pass) },
    { title: '主要变化范围通过', val: toPct(rangePass) + '%', count: `${num(rangePass)} 时次`, color: '#36b3d9', fill: toPct(rangePass) },
    { title: '内部一致性通过', val: toPct(intPass) + '%', count: `${num(intPass)} 时次`, color: '#8e9dfa', fill: toPct(intPass) },
    { title: '时间一致性通过', val: toPct(timePass) + '%', count: `${num(timePass)} 时次`, color: '#f0ad4e', fill: toPct(timePass) }
  ];

  return `
    <div class="qcp-kpi-grid-2x2">
      ${kpis.map(item => `
        <div class="ds-kpi ds-kpi-province qcp-kpi-tile">
          <div class="ds-kpi-label">
            <span>${item.title}</span>
            <button aria-label="查看${item.title}口径" onclick="qccShowScope()">${icon('info')}</button>
          </div>
          <div class="ds-kpi-value" style="color:${item.color}">${item.val}</div>
          <div class="ds-kpi-note">
            <span>${item.count}</span>
          </div>
          <div class="qcp-kpi-bar"><i style="width:${item.fill}%;background:${item.color};box-shadow:0 0 6px ${item.color}88"></i></div>
        </div>
      `).join('')}
    </div>
  `;
}
function qcpKpis() { return qcpKpiGrid2x2(); }

// 主页面装配：严格按用户要求布局
// 1. 右侧列 (ds-side-cards)：平均放等高等宽的三个清单（主要变化范围、内部一致性、时间一致性）
// 2. 底栏左侧 (ds-lower-cards)：上方 4 个 KPI 卡片 2*2 放着
// 3. 底栏右侧 (ds-lower-trend)：综合质控情况趋势面板
function qcpProvincePage() {
  return dsColumns(
    qcpKpiGrid2x2(),
    qcpRangeCard() + qcpInternalCard() + qcpTimeCard(),
    qcpAuditTrendCard()
  );
}

// 全局挂载与兼容
if (typeof window !== 'undefined') {
  window.qcpProvincePage = qcpProvincePage;
  window.qcpKpis = qcpKpis;
  window.qcpKpiGrid2x2 = qcpKpiGrid2x2;
  window.qcpRangeCard = qcpRangeCard;
  window.qcpInternalCard = qcpInternalCard;
  window.qcpTimeCard = qcpTimeCard;
  window.qcpAuditTrendCard = qcpAuditTrendCard;
  window.qcpElemMethodPassCard = qcpElemMethodPassCard;
  window.qcpAuditListCard = qcpAuditTrendCard;
}
