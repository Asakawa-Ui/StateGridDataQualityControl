'use strict';

// 省级单位目录与原型已有的8省统计分开维护；没有数据时不补造到报率。
const QCA_PROVINCIAL_UNITS=[
 ['beijing','北京','北京市'],['tianjin','天津','天津市'],['hebei','河北','河北省'],['jibei','冀北','河北省'],['shanxi','山西','山西省'],['shandong','山东','山东省'],
 ['shanghai','上海','上海市'],['jiangsu','江苏','江苏省'],['zhejiang','浙江','浙江省'],['anhui','安徽','安徽省'],['fujian','福建','福建省'],
 ['liaoning','辽宁','辽宁省'],['jilin','吉林','吉林省'],['heilongjiang','黑龙江','黑龙江省'],['mengdong','蒙东','内蒙古自治区'],
 ['hubei','湖北','湖北省'],['hunan','湖南','湖南省'],['henan','河南','河南省'],['jiangxi','江西','江西省'],
 ['sichuan','四川','四川省'],['chongqing','重庆','重庆市'],['shaanxi','陕西','陕西省'],['gansu','甘肃','甘肃省'],['qinghai','青海','青海省'],['ningxia','宁夏','宁夏回族自治区'],['xinjiang','新疆','新疆维吾尔自治区'],['xizang','西藏','西藏自治区']
];
function qcaProvinceDirectory(source=provinces){return QCA_PROVINCIAL_UNITS.map(([id,name,province])=>{const data=source.find(p=>p.unitId===id||(!p.unitId&&p.short===name));return {id,name,province,company:name==='蒙东'?'国网内蒙古东部电力':'国网'+name+'电力',data,arrival:data?data.complete*100:null,timely:data?data.timely*100:null};});}
function qcaProvinceSlotLabels(count=8){
 const curM=typeof getEffectiveTimelineMinute==='function'?getEffectiveTimelineMinute():(S.currentMinute??1000);
 const out=[];
 for(let i=count;i>=1;i--){
  const m=(curM-i*10+1440)%1440;
  out.push(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));
 }
 return out;
}
function qcaProvinceLatestMix(unit){
 if(!unit.data)return null;
 const rows=(typeof networkStations!=='undefined'?networkStations:[]).filter(s=>s.province===unit.province&&(typeof matchStationEquipFilter==='function'?matchStationEquipFilter(s):true));
 if(!rows.length){
  return {total:100,timely:86,mild_delay:6,severe_delay:4,critical_delay:2,missing:2,arrivalPct:unit.arrival};
 }
 const c={total:rows.length,timely:0,mild_delay:0,severe_delay:0,critical_delay:0,missing:0};
 for(let i=0;i<rows.length;i++){
  const st=typeof networkArrivalStatus==='function'?networkArrivalStatus(rows[i]):'timely';
  c[st]=(c[st]||0)+1;
 }
 return {...c,arrivalPct:unit.arrival};
}
function qcaProvincePastSeries(unit,slotLabels){
 if(!unit.data)return slotLabels.map(t=>({time:t,status:'pending',label:'待接入'}));
 const curM=typeof getEffectiveTimelineMinute==='function'?getEffectiveTimelineMinute():1000;
 const seedBase=typeof qccHash==='function'?qccHash(unit.id+'|'+S.period+'|'+Math.floor(curM/10)):17;
 const labels={timely:'及时',mild_delay:'提醒延迟',severe_delay:'严重延迟',critical_delay:'危急延迟',missing:'缺失'};
 return slotLabels.map((t,idx)=>{
  const v=(seedBase+(idx+1)*137+idx*idx*29)%100;
  const pen=unit.arrival<99?8:unit.arrival<99.3?4:0;
  const st=v<(82-pen)?'timely':v<(91-Math.floor(pen/2))?'mild_delay':v<96?'severe_delay':v<99?'critical_delay':'missing';
  return {time:t,status:st,label:labels[st]};
 });
}
function qcaRenderMergedProvinceCard(units,available){
 const slotLabels=qcaProvinceSlotLabels(8);
 const colHead=`<div class="qca-seq-colhead"><span class="th-prov">省份</span><span class="th-past">过去8时次</span><span class="th-curr">当前比例</span><span class="th-rate">到报率</span></div>`;
 return dsCard(
  '省级到报情况',
  `<div class="qca-province-summary qca-merged-toolbar"><div class="qca-summary-counts">${S.scope!=='全国'?`<button type="button" class="qca-reset-scope" onclick="changeScope('全国')">全国</button>`:''}</div><div class="qca-arrival-legend" aria-label="接收状态图例"><span><i class="seg-timely"></i>及时</span><span><i class="seg-mild_delay"></i>提醒延迟</span><span><i class="seg-severe_delay"></i>严重延迟</span><span><i class="seg-critical_delay"></i>危急延迟</span><span><i class="seg-missing"></i>缺失</span></div></div><div class="qca-seq-head-row">${colHead}</div><div class="qca-province-grid qca-merged-grid">${units.map(u=>{
   const mix=qcaProvinceLatestMix(u);
   const past=qcaProvincePastSeries(u,slotLabels);
   const dotsHtml=past.map((d,i)=>`<i class="qca-past-dot is-${d.status}" style="--dot-idx:${i}" title="${u.name} ${d.time} · ${d.label}"></i>`).join('');
   const barHtml=mix?[['timely','及时',mix.timely],['mild_delay','提醒延迟',mix.mild_delay],['severe_delay','严重延迟',mix.severe_delay],['critical_delay','危急延迟',mix.critical_delay],['missing','缺失',mix.missing]].map(([k,lbl,cnt])=>cnt>0?`<b class="seg-${k}" style="width:${(cnt/mix.total*100).toFixed(2)}%" title="当前${lbl} ${cnt}站 (${(cnt/mix.total*100).toFixed(1)}%)"></b>`:'').join(''):'';
   return `<button type="button" class="qca-province-row qca-prov-seq-row ${u.data?'available':'pending'} ${u.data&&S.scope===u.province?'selected':''}" aria-label="${u.company}，${u.data&&u.arrival!=null?'到报率 '+u.arrival.toFixed(2)+'%':'--'}" onclick="qcaSelectProvince('${u.id}')"><span class="qca-prov-name">${u.name}</span><span class="qca-past-dots" aria-hidden="true">${dotsHtml}</span><span class="qca-latest-bar" aria-hidden="true">${barHtml}</span><strong class="qca-prov-rate">${u.data&&u.arrival!=null?u.arrival.toFixed(2)+'%':'--'}</strong></button>`;
  }).join('')}</div>`,
  '27 家省级单位',
  'qca-province-card qca-merged-province-card',
  'link'
 );
}
function qcaProvinceArrivals(){
 const rawUnits=qcaProvinceDirectory(),units=rawUnits.slice().sort((a,b)=>{const rA=a.data&&a.arrival!=null?a.arrival:-1,rB=b.data&&b.arrival!=null?b.arrival:-1;return rB!==rA?rB-rA:a.name.localeCompare(b.name,'zh-CN');}),available=units.filter(u=>u.data).length;
 return qcaRenderMergedProvinceCard(units,available);
}
function qcaSelectProvince(id){const unit=qcaProvinceDirectory().find(u=>u.id===id);if(!unit)return;if(unit.data){changeScope(unit.province);return;}S.detail=null;coreOpenModal(unit.company+' · 接入状态',qccInfo([['省级单位',unit.company],['所在省区',unit.province+(unit.name==='蒙东'?'（仅东部管理范围）':'')],['数据状态','待接入'],['到报率','—'],['及时率','—']])+qccNote('当前原型未提供该单位的接入统计，接入数据后展示对应到报、及时和站点明细。未接入不代表到报率为0。')+qccAction('查看完整单位目录','qcaDirectoryHelp()'));}
function qcaDirectoryHelp(){S.detail=null;coreOpenModal('省级单位目录说明',qccInfo([['目录单位',QCA_PROVINCIAL_UNITS.length+' 家'],['省级行政区域',new Set(QCA_PROVINCIAL_UNITS.map(u=>u[2])).size+' 个'],['现有样本数据',qcaProvinceDirectory().filter(u=>u.data).length+' 家单位'],['特殊口径','河北与冀北分列；蒙东对应内蒙古东部']])+qccNote('省级到报面板默认展示全网完整目录，地图范围筛选用于查看已有数据单位，目录本身保持完整。没有接入统计的单位显示“待接入”，不计入已有8省快照的应到与实到汇总。')+`<p class="qcc-note">目录口径参考：<a href="https://wap.sasac.gov.cn/n4470048/n29955503/n30329277/n30329358/c30986322/content.html" target="_blank" rel="noopener">国家电网省级公司说明</a>；<a href="https://www.nea.gov.cn/2014-08/03/c_133617050.htm" target="_blank" rel="noopener">国家能源局经营范围说明</a>。</p>`);}
function qcaChannelHealth(source=qccRows()){
 const groups=new Map();
 for(const row of source){const key=row.station+'|'+row.element;if(!groups.has(key))groups.set(key,{station:row.station,element:row.element,missing:[],maxRun:0});if(row.value==null)groups.get(key).missing.push(row);}
 for(const group of groups.values()){
  const sorted=group.missing.slice().sort((a,b)=>(-a.day*24+a.hour)-(-b.day*24+b.hour));let run=0,previous=null;
  for(const row of sorted){const tick=-row.day*24+row.hour;run=previous!=null&&tick===previous+1?run+1:1;previous=tick;group.maxRun=Math.max(group.maxRun,run);}
 }
 const gaps=[...groups.values()].filter(g=>g.missing.length).sort((a,b)=>b.maxRun-a.maxRun||b.missing.length-a.missing.length),total=groups.size;
 return {total,healthy:total-gaps.length,gaps,affectedStations:new Set(gaps.map(g=>g.station)).size,maxRun:Math.max(0,...gaps.map(g=>g.maxRun)),rate:total?(total-gaps.length)/total*100:null,stations:new Set(source.map(r=>r.station)).size};
}
function qcaChannelCard(){
 const d=qcaChannelHealth(),representative=d.gaps[0];
 return dsCard('原始通道缺测监测',`<div class="qca-channel-hero"><strong>${d.rate==null?'—':d.rate.toFixed(2)}<small>${d.rate==null?'':'%'}</small></strong><span>无缺测通道占比<small>${d.healthy} / ${d.total} 个通道</small></span></div><div class="qca-channel-metrics"><div><b>${d.gaps.length}</b><span>缺测通道</span></div><div><b>${d.affectedStations}</b><span>影响站点</span></div><div><b>${d.maxRun}<small>时次</small></b><span>最长连续缺测</span></div></div><div class="qca-channel-foot"><span>${representative?station(representative.station).n+' · '+QCC_ELEMENT[representative.element].n:'当前窗口原始通道无缺测'}</span><button onclick="qcaOpenChannelGaps()">明细${icon('chevron')}</button></div><div class="qca-channel-source">${d.stations} 个重点站 · 原始观测要素通道</div>`,S.period,'qca-channel-card','activity');
}
function qcaOpenChannelGaps(){const d=qcaChannelHealth();S.detail=null;coreOpenModal('原始通道缺测 · '+S.scope,qccInfo([['范围 / 时段',S.scope+' / '+S.period],['原始要素通道',d.total+' 个'],['无缺测通道',d.healthy+' 个'],['缺测通道',d.gaps.length+' 个'],['无缺测通道占比',d.rate==null?'—':d.rate.toFixed(2)+'%']])+qccTable(['站点','要素','缺测记录','最长连续缺测'],d.gaps.map(g=>[station(g.station).n,QCC_ELEMENT[g.element].n,g.missing.length+' 条',g.maxRun+' 时次']))+qccNote('每个站点、每种要素计一个通道。原始观测值缺失即计入缺测；无缺测通道占比 = 当前窗口无原始缺测的通道 / 已有通道。按逐小时样本判断连续时次，不将时次直接解释为故障时长；订正记录不改变原始接入缺测事实。')+qccAction('查看关联质控结果',"qcoOpenMethod('missing')",true));}

function qcaChannelTrendData(){
 const isConn = (typeof QcDatabase!=='undefined'&&typeof QcDatabase.isProvinceConnected==='function')
   ? QcDatabase.isProvinceConnected(S.scope)
   : (S.scope==='全国'||qcaProvinceDirectory().some(u=>u.data&&u.province===S.scope));
 
 const isSingleDay = ['当前','今日'].includes(S.period);
 const N = isSingleDay ? 24 : (S.period==='近3日' ? 3 : 7);
 const labels = [];
 const timely = [], mild = [], severe = [], critical = [], missing = [];

 const unit = S.scope!=='全国' ? qcaProvinceDirectory().find(u=>u.province===S.scope) : null;
 const baseArr = unit&&unit.arrival!=null ? (92.5 + Math.min(1.8, Math.max(-1.5, (unit.arrival - 99.0) * 2))) : 93.2;
 const baseTimely = unit&&unit.timely!=null ? (44.6 + Math.min(2.0, Math.max(-2.0, (unit.timely - 98.5) * 2))) : 44.8;
 const scopeSeed = typeof qccHash==='function' ? qccHash(S.scope||'全国') : 17;

 for(let step=0; step<N; step++){
  let label, t;
  if(isSingleDay){
   label = String(step).padStart(2,'0') + ':00';
   t = step;
  } else {
   const dayOffset = N - 1 - step;
   const d = new Date(Date.UTC(2026, 9, 23 - dayOffset));
   label = `${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
   t = step * (24 / Math.max(1, N - 1));
  }
  labels.push(label);

  if(!isConn){
   timely.push(0);
   mild.push(0);
   severe.push(0);
   critical.push(0);
   missing.push(0);
   continue;
  }

  const wave = Math.sin(t * Math.PI / 12 + 0.8) * 0.65 + Math.cos(t * Math.PI / 6) * 0.35;
  const seedNoise = ((scopeSeed + step * 19) % 7 - 3) * 0.12;

  const curArr = Math.max(91.0, Math.min(95.0, baseArr + wave * 0.7 + seedNoise));
  const curTimely = Math.max(41.0, Math.min(48.5, baseTimely + wave * 1.2 + seedNoise * 1.5));
  const curDelayed = Math.max(1.0, curArr - curTimely);
  const curMissing = Math.max(0.5, 100.0 - curArr);

  const wTimely = curTimely;
  const wMild = curDelayed * 0.54;
  const wSevere = curDelayed * 0.32;
  const wCritical = Math.max(0.05, curDelayed - wMild - wSevere);
  const wMissing = curMissing;

  const sum = wTimely + wMild + wSevere + wCritical + wMissing;
  const pTimely = Number((wTimely / sum * 100).toFixed(2));
  const pMild = Number((wMild / sum * 100).toFixed(2));
  const pSevere = Number((wSevere / sum * 100).toFixed(2));
  const pCritical = Number((wCritical / sum * 100).toFixed(2));
  const pMissing = Number((100.00 - pTimely - pMild - pSevere - pCritical).toFixed(2));

  timely.push(pTimely);
  mild.push(pMild);
  severe.push(pSevere);
  critical.push(pCritical);
  missing.push(pMissing);
 }

 return { labels, timely, mild, severe, critical, missing, isConn };
}

function qcaLinkItems(){
 const isConn = (typeof QcDatabase!=='undefined'&&typeof QcDatabase.isProvinceConnected==='function')
   ? QcDatabase.isProvinceConnected(S.scope)
   : (S.scope==='全国'||qcaProvinceDirectory().some(u=>u.data&&u.province===S.scope));

 if(!isConn){
  return { missing:[], delayed:[], isConn:false };
 }

 const rawMissing = [
  { id:'LK-M-01', stationId:'JS-YC-066', stationName:'盐城滨海站', deviceName:'500kV 滨海线 #076', prov:'江苏省', element:'雨量', time:'10-23 16:00', duration:'缺测 12 时次', tag:'缺失', type:'missing', reason:'传感器远传光端机失电' },
  { id:'LK-M-02', stationId:'SC-GZ-028', stationName:'甘孜康定站', deviceName:'500kV 甘康线 #128', prov:'四川省', element:'风速', time:'10-23 15:42', duration:'缺测 4 时次', tag:'缺失', type:'missing', reason:'高寒覆冰导致信号衰减' },
  { id:'LK-M-03', stationId:'HN-CS-041', stationName:'长沙望城站', deviceName:'500kV 望城变', prov:'湖南省', element:'相对湿度', time:'10-23 14:35', duration:'缺测 3 时次', tag:'缺失', type:'missing', reason:'前置通信机通道丢包' },
  { id:'LK-M-04', stationId:'HB-WH-087', stationName:'武汉江夏站', deviceName:'220kV 江夏变', prov:'湖北省', element:'气温', time:'10-23 13:20', duration:'缺测 2 时次', tag:'缺失', type:'missing', reason:'规约解析超时断开' },
  { id:'LK-M-05', stationId:'ZJ-HZ-013', stationName:'杭州余杭站', deviceName:'500kV 余杭变', prov:'浙江省', element:'大气电场', time:'10-23 11:15', duration:'缺测 2 时次', tag:'缺失', type:'missing', reason:'微波专网链路切换抖动' },
  { id:'LK-M-06', stationId:'AH-HS-022', stationName:'黄山歙县站', deviceName:'220kV 歙县变', prov:'安徽省', element:'气压', time:'10-23 09:30', duration:'缺测 1 时次', tag:'缺失', type:'missing', reason:'4G通信模组偶发重连' }
 ];

 const rawDelayed = [
  { id:'LK-D-01', stationId:'HN-CS-041', stationName:'长沙望城站', deviceName:'500kV 望城变', prov:'湖南省', element:'相对湿度', time:'10-23 15:50', delayVal:'+42.6 min', level:'critical', tag:'危急延迟', reason:'市电切换网关缓存积压' },
  { id:'LK-D-02', stationId:'HA-LY-031', stationName:'洛阳栾川站', deviceName:'500kV 栾川线 #091', prov:'河南省', element:'风向', time:'10-23 15:35', delayVal:'+28.5 min', level:'severe', tag:'严重延迟', reason:'山区中继站弱场强重发' },
  { id:'LK-D-03', stationId:'SX-YC-002', stationName:'运城永济站', deviceName:'500kV 永济变', prov:'山西省', element:'大气电场', time:'10-23 14:40', delayVal:'+19.8 min', level:'severe', tag:'严重延迟', reason:'双平面路由倒换时延' },
  { id:'LK-D-04', stationId:'ZJ-HZ-013', stationName:'杭州余杭站', deviceName:'500kV 余杭变', prov:'浙江省', element:'风速', time:'10-23 15:52', delayVal:'+8.5 min', level:'mild', tag:'提醒延迟', reason:'时钟源微秒级同步漂移' },
  { id:'LK-D-05', stationId:'HB-WH-087', stationName:'武汉江夏站', deviceName:'220kV 江夏变', prov:'湖北省', element:'气压', time:'10-23 15:48', delayVal:'+6.2 min', level:'mild', tag:'提醒延迟', reason:'主站轮询采集排队等待' },
  { id:'LK-D-06', stationId:'JS-YC-066', stationName:'盐城滨海站', deviceName:'500kV 滨海线 #076', prov:'江苏省', element:'气温', time:'10-23 15:45', delayVal:'+7.1 min', level:'mild', tag:'提醒延迟', reason:'无线专网信道偶发竞争' }
 ];

 const missing = (S.scope==='全国') ? rawMissing : rawMissing.filter(m=>m.prov===S.scope);
 const delayed = (S.scope==='全国') ? rawDelayed : rawDelayed.filter(d=>d.prov===S.scope);

 return { missing, delayed, isConn:true };
}

function qcaOpenLinkItem(id){
 const { missing, delayed } = qcaLinkItems();
 const item = [...missing, ...delayed].find(x => x.id === id);
 if(!item) return;
 S.detail = null;
 const isMiss = item.type === 'missing';
 const title = (isMiss ? '数据链路缺失诊断 · ' : '数据链路延迟诊断 · ') + item.deviceName;
 const infoPairs = [
  ['装置线路', item.deviceName],
  ['所在站址', item.stationName + ' (' + item.prov + ')'],
  ['监测要素', item.element],
  ['链路状态', item.tag],
  [isMiss ? '累计缺测' : '延迟时长', isMiss ? item.duration : item.delayVal],
  ['异常时次', item.time],
  ['根因定位', item.reason],
  ['传输规约', '电力微气象标准规约 / DL/T 860'],
  ['处置状态', '链路自愈监测中']
 ];
 coreOpenModal(title, qccInfo(infoPairs) + qccNote('系统根据数据接入时序及规约报文自动定位通信链路状态，已通知属地电力班组开展排查。'));
}

function qcaOpenAllMissingModal(){
 const { missing } = qcaLinkItems();
 S.detail = null;
 const rows = missing.map((m, idx) => [
  String(idx + 1).padStart(2, '0'),
  `<b>${esc(m.deviceName)}</b><br><small style="color:#7fb5d1">${esc(m.stationName)} (${esc(m.prov)})</small>`,
  `<span class="qca-link-tag tag-missing">${esc(m.element)}</span>`,
  `<b style="color:#6f93ba">${esc(m.duration)}</b>`,
  `<time style="font-family:var(--pg-number-font);color:#8cb4cb">${m.time}</time>`,
  `<span style="color:#a8c9dd;font-size:11px">${esc(m.reason)}</span>`,
  `<button class="ds-button" onclick="closeModal();qcaOpenLinkItem('${m.id}')">诊断</button>`
 ]);
 const summary = `<div class="qcc-info"><div><span>管理范围</span><b>${S.scope} · ${S.period}</b></div><div><span>缺失通道数</span><b style="color:#6f93ba">${missing.length} 条</b></div><div><span>传输规约</span><b>电力微气象标准规约 / DL/T 860</b></div></div>`;
 coreOpenModal('数据链路缺失清单 · 全量记录', summary + qccTable(['序号', '装置线路 / 站址', '监测要素', '累计缺测', '检出时次', '根因定位', '操作'], rows) + qccNote('缺失清单统计当前窗口未接收到有效报文的传输通道，系统正持续发起自动轮询探活与通道路由自愈。'));
}

function qcaOpenAllDelayModal(){
 const { delayed } = qcaLinkItems();
 S.detail = null;
 const rows = delayed.map((d, idx) => {
  const levelCls = d.level === 'critical' ? 'tag-critical' : (d.level === 'severe' ? 'tag-severe' : 'tag-mild');
  const valCol = d.level === 'critical' ? '#ee5a52' : (d.level === 'severe' ? '#f0ad4e' : '#36b3d9');
  return [
   String(idx + 1).padStart(2, '0'),
   `<b>${esc(d.deviceName)}</b><br><small style="color:#7fb5d1">${esc(d.stationName)} (${esc(d.prov)})</small>`,
   `<span class="qca-link-tag ${levelCls}">${esc(d.element)} · ${esc(d.tag)}</span>`,
   `<b style="color:${valCol};font-family:var(--pg-number-font)">${esc(d.delayVal)}</b>`,
   `<time style="font-family:var(--pg-number-font);color:#8cb4cb">${d.time}</time>`,
   `<span style="color:#a8c9dd;font-size:11px">${esc(d.reason)}</span>`,
   `<button class="ds-button" onclick="closeModal();qcaOpenLinkItem('${d.id}')">诊断</button>`
  ];
 });
 const summary = `<div class="qcc-info"><div><span>管理范围</span><b>${S.scope} · ${S.period}</b></div><div><span>延迟通道数</span><b style="color:#f0ad4e">${delayed.length} 条</b></div><div><span>等级分布</span><b>危急 ${delayed.filter(x=>x.level==='critical').length} / 严重 ${delayed.filter(x=>x.level==='severe').length} / 提醒 ${delayed.filter(x=>x.level==='mild').length}</b></div></div>`;
 coreOpenModal('数据链路延迟清单 · 全量记录', summary + qccTable(['序号', '装置线路 / 站址', '监测要素 / 级别', '延迟时长', '异常时次', '根因定位', '操作'], rows) + qccNote('延迟清单统计接入主站传输时延超过预警基准的采集通道，已联动属地通信专业排查中间路由与无线信道质量。'));
}

function qcaLinkListCard(){
 const { missing, delayed, isConn } = qcaLinkItems();

 if(!isConn){
  return dsCard('数据链路情况清单', dsEmpty('该省份尚未接入链路数据'), S.period, 'qca-link-list-card', 'activity');
 }

 const renderMissingItem = (item, idx) => {
  const idxStr = String(idx + 1).padStart(2, '0');
  return `
   <button type="button" class="qca-link-item is-missing" onclick="qcaOpenLinkItem('${item.id}')">
    <div class="qca-link-row1">
     <span class="qca-link-idx">${idxStr}</span>
     <span class="qca-link-tag tag-missing">${item.tag}</span>
     <strong class="qca-link-station" title="${esc(item.deviceName)}">${esc(item.deviceName)}</strong>
     <time class="qca-link-time">${item.time}</time>
    </div>
    <div class="qca-link-row2">
     <div class="qca-link-left">
      <span class="qca-link-elem">${esc(item.element)}</span>
      <span class="qca-link-prov">${esc(item.prov)}</span>
     </div>
     <b class="qca-link-val val-missing">${item.duration}</b>
    </div>
   </button>
  `;
 };

 const renderDelayedItem = (item, idx) => {
  const idxStr = String(idx + 1).padStart(2, '0');
  const levelCls = item.level === 'critical' ? 'is-critical' : (item.level === 'severe' ? 'is-severe' : 'is-mild');
  const tagCls = item.level === 'critical' ? 'tag-critical' : (item.level === 'severe' ? 'tag-severe' : 'tag-mild');
  const valCls = item.level === 'critical' ? 'val-critical' : (item.level === 'severe' ? 'val-severe' : 'val-mild');
  return `
   <button type="button" class="qca-link-item ${levelCls}" onclick="qcaOpenLinkItem('${item.id}')">
    <div class="qca-link-row1">
     <span class="qca-link-idx">${idxStr}</span>
     <span class="qca-link-tag ${tagCls}">${item.tag}</span>
     <strong class="qca-link-station" title="${esc(item.deviceName)}">${esc(item.deviceName)}</strong>
     <time class="qca-link-time">${item.time}</time>
    </div>
    <div class="qca-link-row2">
     <div class="qca-link-left">
      <span class="qca-link-elem">${esc(item.element)}</span>
      <span class="qca-link-prov">${esc(item.prov)}</span>
     </div>
     <b class="qca-link-val ${valCls}">${item.delayVal}</b>
    </div>
   </button>
  `;
 };

 const missItemsHtml = missing.map(renderMissingItem).join('');
 const delayItemsHtml = delayed.map(renderDelayedItem).join('');

 const missHtml = missing.length 
  ? `<div class="qca-link-sublist qca-missing-scroll" tabindex="0" role="region" aria-label="数据链路缺失清单"><div class="qca-link-track track-1">${missItemsHtml}</div><div class="qca-link-track track-2" aria-hidden="true">${missItemsHtml}</div></div>`
  : dsEmpty('当前无通道缺失');

 const delayHtml = delayed.length
  ? `<div class="qca-link-sublist qca-delay-scroll" tabindex="0" role="region" aria-label="数据链路延迟清单"><div class="qca-link-track track-1">${delayItemsHtml}</div><div class="qca-link-track track-2" aria-hidden="true">${delayItemsHtml}</div></div>`
  : dsEmpty('当前无数据延迟');

 const bodyHtml = `
  <div class="qca-link-two-cols">
   <div class="qca-link-col">
    <div class="qca-col-head">
     <div class="qca-col-title"><i class="dot-missing"></i>缺失清单</div>
    </div>
    ${missHtml}
    <div class="qco-problem-foot">
     <button type="button" class="qco-prob-all-btn" onclick="qcaOpenAllMissingModal()">全部${icon('chevron')}</button>
    </div>
   </div>
   <div class="qca-link-col">
    <div class="qca-col-head">
     <div class="qca-col-title"><i class="dot-delay"></i>延迟清单</div>
    </div>
    ${delayHtml}
    <div class="qco-problem-foot">
     <button type="button" class="qco-prob-all-btn" onclick="qcaOpenAllDelayModal()">全部${icon('chevron')}</button>
    </div>
   </div>
  </div>
 `;

 return dsCard('数据链路情况清单', bodyHtml, '', 'qca-link-list-card', 'activity');
}
