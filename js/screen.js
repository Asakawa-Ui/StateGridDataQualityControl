'use strict';

// 随窗口自适应的大屏主架构与路由
const primaryMenus=[
  ['planning','站网规划'],
  ['testing','检验监测'],
  ['qc','数据质控'],
  ['maintenance','建设运维'],
  ['validation','试验验证'],
  ['standard','装置规范']
];

const qualityMenus=[
  ['summary','质控驾驶舱','grid'],
  ['connect','S1数据链路','link'],
  ['rapid','S2快速质控','activity'],
  ['province','S3综合质控','layers'],
  ['correction','S4数据订正','tool'],
  ['evaluation','S5数据评估','chart']
];

const qualityUtilityMenus=[['system','系统管理','settings']];
const qcMenuExists=id=>[...qualityMenus,...qualityUtilityMenus].some(m=>m[0]===id);
const qcMenuName=id=>[...qualityMenus,...qualityUtilityMenus].find(m=>m[0]===id)?.[1]||'质控驾驶舱';

const qualityCatalog={
  "summary": { "caption": "规模与质量态势", "stage": "全网数据与问题总览", "features": ["设备规模","省级装置分布","全国质控态势","历史质控问题","问题排行"] },
  "connect": { "caption": "采集接入与传输", "stage": "链路通道 · 采集到传输", "features": ["全量到报量与到报率","全网27家省级单位到报目录","原始要素通道缺测监测","省级接入排名","站点到时序"] },
  "rapid": { "caption": "缺测界限与突变", "stage": "快速质控 · 基础规则检查", "features": ["缺测检查","界限值检查","变化速率检查","气候学界限检查","质量标识与结果明细"] },
  "province": { "caption": "时空多要素关联", "stage": "省级质控 · 关联分析", "features": ["时间一致性","空间一致性","内部一致性","持续性检查","复杂综合分析","异常证据与专业复核"] },
  "correction": { "caption": "人机协同闭环", "stage": "数据订正 · 异常修复与留痕", "features": ["订正数量/率统计", "订正清单", "人机协同闭环", "订正率趋势", "地图订正点位分色"] },
  "evaluation": { "caption": "模式比对回溯", "stage": "数据可用性与业务评估", "features": ["观测-模式评估","气象部门比对","预警业务支撑","强天气过程回溯","评估指标","可用性分布","评估报告"] },
  "system": { "caption": "算法设备台账", "stage": "运行配置与资产管理", "features": ["算法管理","算法清单","执行频率与启停","算法配置与版本","样本验证","执行日志","电网设备台账","设备详情"] }
};

function dsQualityNavigation(){
 const button=([id,n,i],support=false)=>`<button class="${S.tab===id?'active':''} ${support?'qc-support-item':''}" ${S.tab===id?'aria-current="page"':''} onclick="changeTab('${id}')">${icon(i)}<span class="ds-subnav-copy"><span>${n}</span><small aria-hidden="true">${qualityCatalog[id]?.caption||''}</small></span></button>`;
 return `<nav class="ds-subnav qc-workflow-nav" aria-label="数据质控二级导航">${button(qualityMenus[0])}<div class="qc-flow-menu">${qualityMenus.slice(1).map(m=>button(m)).join('')}</div><div class="ds-subnav-foot"><div class="qc-nav-label">协同与配置</div>${qualityUtilityMenus.map(m=>button(m,true)).join('')}</div></nav>`;
}

Object.assign(S,{module:'qc',tab:'summary',period:'今日',mapMode:'quality',mapZoom:1,selectedStation:null,selectedEvent:'QC-1023-042',reportType:'summary',ruleCategory:'全部',alarmLevel:'全部',scope:'全国'});

const coreCloseModal=window.closeModal||(typeof closeModal==='function'?closeModal:()=>{});
const coreOpenModal=window.openModal||(typeof openModal==='function'?openModal:()=>{});
const coreOpenStation=window.openStation||(typeof openStation==='function'?openStation:()=>{});
let screenModalRefresh=false;

const dsTag=(text,color='')=>`<span class="ds-tag ${color}">${esc(text)}</span>`;
const dsButton=(text,action,primary=false,i='')=>`<button class="ds-button ${primary?'primary':''}" ${action}>${i?icon(i):''}${text}</button>`;
const dsMore=(text,action)=>`<button class="ds-more" ${action}>${text}${icon('chevron')}</button>`;
const dsProgress=(value,color='')=>`<div class="ds-progress ${color}"><i style="width:${Math.max(0,Math.min(100,value))}%"></i></div>`;
function dsCard(title,body,extra='',classes='',i=''){return `<section class="ds-card ${classes}"><header class="ds-card-head"><h3>${i?icon(i):''}${title}</h3><div class="ds-card-extra">${extra}</div></header><div class="ds-card-body">${body}</div></section>`;}
function dsEmpty(text='当前筛选范围没有记录'){return `<div class="ds-no-data">${text}<br>请调整区域、时段或筛选条件</div>`;}
function dsMiniStats(items){return `<div class="ds-mini-stats">${items.map(([v,t,c])=>`<div class="ds-mini-stat"><b class="${c||''}">${v}</b><span>${t}</span></div>`).join('')}</div>`;}
function dsEventColor(e){return e.status==='已闭环'?'green':e.level==='严重'?'red':e.level==='重要'?'amber':'blue';}
function dsStatusColor(status){return status==='已闭环'?'green':status==='待复验'?'purple':status==='处理中'?'blue':'amber';}
function dsScopedStations(){return stations.filter(s=>S.scope==='全国'||s.p===S.scope);}
function dsSelectedStation(){return dsScopedStations().find(s=>s.id===S.selectedStation)||dsScopedStations()[0];}

const SCREEN_SESSION={name:'演示用户',role:'总部质控'};
function screenClockParts(now=new Date()){
 const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now).replaceAll('/','-');
 const weekday=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',weekday:'short'}).format(now);
 const time=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(now);
 return {date:date+' '+weekday,time};
}

function dsSessionInfo(){
 const clock=screenClockParts();
 return `<div class="ds-session"><button class="ds-user" aria-label="当前登录用户：${SCREEN_SESSION.name}" onclick="openScreenUser()"><span class="ds-user-avatar"><svg class="icon" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3"/><path d="M5 20v-2a7 7 0 0 1 14 0v2"/></svg></span><span><b>${SCREEN_SESSION.name}</b><small>${SCREEN_SESSION.role}</small></span>${icon('down')}</button><div class="ds-clock" aria-label="北京时间"><time id="screen-clock-time">${clock.time}</time><span id="screen-clock-date">${clock.date}</span></div></div>`;
}

function openScreenUser(){
 S.detail=null;
 coreOpenModal('用户信息',`<div class="ds-user-profile"><b>${SCREEN_SESSION.name}</b><span>${SCREEN_SESSION.role} · 演示身份</span></div><p class="page-desc">当前为原型演示账号。</p><div class="ds-user-actions">${dsButton('全屏展示','onclick="closeModal();toggleFullscreen()"',false,'eye')}${dsButton('演示设置','onclick="screenDemoSettings()"',false,'settings')}</div>`);
}

function currentModuleName(){
 return primaryMenus.find(m=>m[0]===S.module)?.[1]||'六统一平台';
}

function showScopeContext(){
 S.detail=null;
 const r=stats(),starts={'当前':'2026-10-23','今日':'2026-10-23','近3日':'2026-10-21','近7日':'2026-10-17'},tStr=(typeof formatTimelineTime==='function'?formatTimelineTime():'24:00'),windowStr=S.period==='当前'?`2026-10-23 ${tStr} 单时刻断面（10分钟分辨率）`:`${starts[S.period]||'2026-10-23'} 00:00 — 2026-10-23 24:00`;
 coreOpenModal('筛选范围与统计口径',`<div class="ds-info-list"><div><span>统计窗口 / 断面</span><b>${windowStr}</b></div><div><span>监测要素切片</span><b>${esc(S.element||'综合')}</b></div><div><span>接入省份</span><b>${scopeRows().length} 省</b></div><div><span>已到报 / 应采</span><b>${num(r.received)} / ${num(r.expected)} 条</b></div><div><span>未闭环事件</span><b>${pending().length} 项</b></div></div><div class="evidence-note"><strong>要素与时段联动</strong>已按【${esc(S.element||'综合')}】要素切片，全网指标、地图站点及结果分布均联动生效。</div>`);
}

let layout=function(){
 const current=primaryMenus.find(m=>m[0]===S.module)||primaryMenus[2];
 const primaryEn=['NETWORK PLANNING','INSPECTION & MONITORING','DATA QUALITY CONTROL','CONSTRUCTION & O&M','TEST & VALIDATION','DEVICE STANDARDS'];
 const primaryIcons=['map','shield','activity','tool','flask','book'];

 return `<div class="ds-screen" id="display"><header class="ds-header"><div class="ds-brand"><svg class="ds-logo" viewBox="0 0 64 64" fill="none" aria-label="电力气象监测站检验标识" role="img"><rect x="2" y="2" width="60" height="60" rx="14" fill="#103249" stroke="#8CCBD9" stroke-width="1.5"/><g stroke="#A5DEE6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M27 20v34M16 54h22M27 20l-9-7m9 7 11-7m-11 7 9 8"/><circle cx="15" cy="11" r="4" fill="#174A5B"/><circle cx="41" cy="11" r="4" fill="#174A5B"/><circle cx="39" cy="31" r="4" fill="#174A5B"/><circle cx="27" cy="20" r="3" fill="#7ED9DF"/><rect x="15" y="29" width="23" height="15" rx="2.5" fill="#123C51"/><path d="M19 34h15m-15 5h15"/></g><path d="m44 34 13 5v8c0 7-6 12-13 15-7-3-13-8-13-15v-8l13-5Z" fill="#184C5D" stroke="#77D2D9" stroke-width="1.8"/><path d="m38 47 4 4 8-9" stroke="#D7F8ED" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="ds-brand-copy"><h1>电力气象监测<span>质控实验验证平台</span></h1><p><span class="ds-brand-rule" aria-hidden="true"></span>POWER METEOROLOGY <span class="ds-brand-dot" aria-hidden="true"></span> QUALITY CONTROL & VALIDATION</p></div></div><nav class="ds-primary" aria-label="系统一级导航">${primaryMenus.map(([id,n],index)=>`<button class="${S.module===id?'active':''}" ${S.module===id?'aria-current="page"':''} onclick="navigate('${id}')"><span class="ds-primary-icon">${icon(primaryIcons[index])}</span><span class="ds-primary-copy"><span class="ds-primary-label">${n}</span><span class="ds-primary-en" aria-hidden="true">${primaryEn[index]}</span></span><span class="ds-primary-corner" aria-hidden="true"></span></button>`).join('')}</nav>${dsSessionInfo()}</header>${S.module==='qc'?`<main id="main" class="ds-workspace" data-collapsed="${S.tab!=='summary'}" tabindex="-1">${typeof qcoPipelineNav==='function'?qcoPipelineNav():''}<div class="ds-scene" data-qc-view="${S.tab}"><section class="ds-map-panel" aria-label="监测站网地图">${dsMap()}</section>${dsCards()}</div></main>`:`<main id="main" class="ds-empty-page" tabindex="-1"><span class="ds-blank-corners"></span><div><h2>${current[1]}</h2><p>页面待设计</p></div></main>`}</div>`;
};

let render=function(){
 document.getElementById('app').innerHTML=layout();
 fitScreen();
 document.title=`${S.module==='qc'?qcMenuName(S.tab):currentModuleName()} · 电力气象监测质控实验验证平台`;
 if(S.detail&&!screenModalRefresh)dsEventDialog(S.detail);
};

function fitScreen(){
 const el=document.getElementById('display');if(!el)return;
 const w=document.documentElement.clientWidth,h=document.documentElement.clientHeight;
 const frameWidth=Math.max(w,1120),frameHeight=Math.max(h,630);
 const scale=Math.min(1,frameWidth/1600,frameHeight/900);
 const root=document.documentElement.style;
 root.setProperty('--frame-width',frameWidth+'px');
 root.setProperty('--frame-height',frameHeight+'px');
 root.setProperty('--layout-width',(frameWidth/scale)+'px');
 root.setProperty('--layout-height',(frameHeight/scale)+'px');
 root.setProperty('--layout-scale',String(scale));
 el.style.removeProperty('transform');
}
window.addEventListener('resize',fitScreen);
new ResizeObserver(fitScreen).observe(document.documentElement);

let navigate=function(m){
 closeModal();
 S.module=primaryMenus.some(x=>x[0]===m)?m:'qc';
 if(S.module==='qc')S.tab='summary';
 S.detail=null;
 S.selectedStation=null;
 render();
 const hash=S.module==='qc'?`qc/${S.tab}`:S.module;
 if(location.hash.slice(1)!==hash)history.replaceState(null,'','#'+hash);
};

let changeTab=function(tab){
 closeModal();
 S.tab=qcMenuExists(tab)?tab:'summary';
 S.module='qc';
 S.search='';
 S.eventStatus='全部';
 S.alarmLevel='全部';
 S.detail=null;
 S.selectedStation=null;
 render();
 const hash=`qc/${S.tab}`;
 if(location.hash.slice(1)!==hash)history.replaceState(null,'','#'+hash);
};

let changeScope=function(scope){
 S.scope=scope;
 if(scope==='全国')S.qcoDrillProvince=null;
 S.selectedStation=null;
 S.detail=null;
 S.selectedEvent=filteredEvents()[0]?.id||null;
 render();
};

let screenTimelineTimer=null;
function formatTimelineTime(m=S.currentMinute??1440){m=Math.max(0,Math.min(1440,Number(m)||0));return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function changeScreenPeriod(period){S.period=period;if(period==='当前'){if(S.currentMinute==null)S.currentMinute=1440;S.currentHour=Math.floor(S.currentMinute/60);}else{stopTimelinePlay();}S.selectedEvent=filteredEvents()[0]?.id||null;render();}
function changeScreenElement(element){S.element=element||'综合';S.selectedEvent=filteredEvents()[0]?.id||null;render();}
function setTimelineMinute(m){m=Math.round((Number(m)||0)/10)*10;m=Math.max(0,Math.min(1440,m));S.currentMinute=m;S.currentHour=Math.floor(m/60);if(S.period!=='当前')S.period='当前';S.selectedEvent=filteredEvents()[0]?.id||null;render();}
function setTimelineHour(h){setTimelineMinute((Number(h)||0)*60);}
function stepTimeline(deltaStep){const cur=S.currentMinute??1440;let next=cur+deltaStep*10;if(next<0)next=1440;if(next>1440)next=0;setTimelineMinute(next);}
function toggleTimelinePlay(){if(S.timePlay){stopTimelinePlay();}else{startTimelinePlay();}}
function startTimelinePlay(){if(S.period!=='当前')S.period='当前';S.timePlay=true;if(screenTimelineTimer)clearInterval(screenTimelineTimer);screenTimelineTimer=setInterval(()=>{const cur=S.currentMinute??1440;const next=cur>=1440?0:cur+10;S.currentMinute=next;S.currentHour=Math.floor(next/60);S.selectedEvent=filteredEvents()[0]?.id||null;render();},1200);render();}
function stopTimelinePlay(){S.timePlay=false;if(screenTimelineTimer){clearInterval(screenTimelineTimer);screenTimelineTimer=null;}render();}

let isTimelineDragging=false;
let timelinePendingMinute=null;

function handleTimelineInput(val,el){
 const m=Math.round((Number(val)||0)/10)*10,clamped=Math.max(0,Math.min(1440,m));
 isTimelineDragging=true;
 timelinePendingMinute=clamped;

 const pct=(clamped/1440)*100,tStr=formatTimelineTime(clamped);
 const container=el?.closest('.timeline-track-container');
 if(container){
  container.style.setProperty('--track-pct',pct+'%');
  container.style.setProperty('--track-ratio',clamped/1440);
  const badgeText=container.querySelector('.timeline-thumb-badge-text');
  if(badgeText)badgeText.textContent=tStr;
  container.querySelectorAll('.timeline-tick').forEach(tick=>{
   const tickM=Number(tick.getAttribute('data-minute'));
   tick.classList.toggle('active',Math.abs(tickM-clamped)<10);
  });
 }
}

function handleTimelineChange(val){
 const targetMinute=(timelinePendingMinute!=null)?timelinePendingMinute:(Number(val)||0);
 isTimelineDragging=false;
 timelinePendingMinute=null;
 setTimelineMinute(targetMinute);
}

window.addEventListener('pointerup', ()=>{
 if(timelinePendingMinute!=null){
  const target=timelinePendingMinute;
  timelinePendingMinute=null;
  isTimelineDragging=false;
  setTimelineMinute(target);
 }
});

let openEvents=function(status='全部'){closeModal();S.module='qc';S.tab='province';render();};
let openEvent=function(id){if(!events.some(e=>e.id===id))return;S.detail=id;S.selectedEvent=id;S.selectedStation=events.find(e=>e.id===id).station;dsEventDialog(id);};
window.closeModal=function(){S.detail=null;coreCloseModal();};
window.openStation=function(id){S.detail=null;coreOpenStation(id);};

function dsEventDialog(id){
 const e=events.find(e=>e.id===id);if(!e)return;
 S.detail=id;screenModalRefresh=true;
 coreOpenModal('质量事件专业处置',detailPage());
 document.querySelector('#overlay .modal')?.classList.add('ds-event-dialog');
 screenModalRefresh=false;
}

function selectScreenEvent(id){S.selectedEvent=id;const e=events.find(x=>x.id===id);if(e)S.selectedStation=e.station;render();}
function selectScreenStation(id){S.selectedStation=id;const e=filteredEvents().find(e=>e.station===id);if(e)S.selectedEvent=e.id;render();}
function selectScreenProvince(n){const exists=(typeof findChinaDivision==='function'&&findChinaDivision(n))||provinces.some(p=>p.n===n);if(!exists){toast(n+'暂无数据');return;}changeScope(S.scope===n?'全国':n);}
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('可在本机浏览器中使用 F11 全屏展示。');}}

// 下游模块装饰器与子页面依赖的基础布局及钩子桩
let dsKpis=function(){return '';};
let dsAccessBody=function(){return '';};
let dsGovernanceBody=function(){return '';};
let dsAlertList=function(){return '';};
let dsTypeBody=function(){return '';};
let zoomMap=function(){};
let resetMap=function(){};
let showQcFunctionCatalog=function(){};
function openQcCategory(id){closeModal();changeTab(id);}
function dsStageCounts(){return ['待复核','待派单','处理中','待复验','已闭环'].map(s=>[s,filteredEvents().filter(e=>e.status===s).length]);}
function dsColumns(left,right,bottom){return `<div class="ds-side-deck">${dsKpis()}<div class="ds-side-cards" data-page="${S.tab}">${right}</div></div><div class="ds-lower-deck"><div class="ds-lower-cards" data-page="${S.tab}">${left}</div><div class="ds-lower-trend">${bottom}</div></div>`;}
if(typeof window.moduleData==='undefined'){window.moduleData={validation:{rows:[]}};}

// dsMap 在 atlas.js 中被完整重写为 WebGL MapLibre 交互底图，此处提供安全桩
let dsMap=function(){return `<div class="atlas-screen-container" id="atlas-screen-container"></div>`;};

// dsCards 在 qc-overview.js 中被 qccOverview 驱动
let dsCards=function(){return typeof qccOverview==='function'?qccOverview():'';};

// 基础站点列表工具，供地图联动组件调用
let dsStationList=function(limit=3){
 return dsScopedStations().slice(0,limit).map(s=>`<button class="ds-station-row" onclick="selectScreenStation('${s.id}')"><span><strong>${s.n}</strong><small>${s.id} / ${s.element}</small></span><b class="${s.quality<98?'amber':''}">${s.quality.toFixed(2)}%</b></button>`).join('');
};

function screenDemoSettings(){
 S.detail=null;
 coreOpenModal('演示设置',`<p>当前为模拟站点，坐标与观测用于原型展示。数据快照：2026-10-23 16:40。</p><p>异常处置记录保存在当前浏览器，可以重置初始样例。</p><div class="form-actions">${btn('保留当前记录','onclick="closeModal()"')}${btn('恢复初始样例','onclick="resetDemo()"',true,'refresh')}</div>`);
}

function dsRoute(){
 const parts=location.hash.slice(1).split('/');
 if(primaryMenus.some(m=>m[0]===parts[0]))S.module=parts[0];
 else S.module='qc';
 if(S.module==='qc'&&qcMenuExists(parts[1]))S.tab=parts[1];
 else if(S.module==='qc')S.tab='summary';
 if(parts[1]==='event'&&events.some(e=>e.id===parts[2]))S.detail=parts[2];
 render();
}
window.addEventListener('hashchange',()=>{if(S.detail)return;dsRoute();});
dsRoute();
