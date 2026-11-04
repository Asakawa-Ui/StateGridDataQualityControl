'use strict';

// 核心通用数据、状态机与基础弹窗体系
const icons={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15m6-12v15"/>',
 book:'<path d="M12 5C8 2 4 3 3 4v15c3-2 6-2 9 0 3-2 6-2 9 0V4c-3-2-6-1-9 1Z"/><path d="M12 5v14"/>',
 shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
 tool:'<path d="m14 7 3 3 4-4a6 6 0 0 1-8 8l-7 7-3-3 7-7a6 6 0 0 1 8-8Z"/>',
 activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
 flask:'<path d="M9 3h6m-5 0v6L4 19c-1 2 1 2 2 2h12c2 0 3-1 2-3L14 9V3M7 14h10"/>',
 database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
 settings:'<path d="m10 3 4 0 1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3Z"/><circle cx="12" cy="12" r="3"/>',
 bell:'<path d="M6 9a6 6 0 0 1 12 0c0 7 3 7 3 8H3c0-1 3-1 3-8m4 12h4"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',
 down:'<path d="m6 9 6 6 6-6"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 8a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 alert:'<path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3h.01"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 file:'<path d="M14 3H5v18h14V8ZM14 3v5h5M8 12h8m-8 4h6"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
 layers:'<path d="m12 3 10 6-10 6L2 9Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
 chart:'<path d="M4 3v17h17M8 15v-4m5 4V7m5 8v-6"/>',
 link:'<path d="m10 8 3-3a4 4 0 0 1 6 6l-3 3m-2 2-3 3a4 4 0 0 1-6-6l3-3m0 6 8-8"/>',
 eye:'<path d="M2 12c5-9 15-9 20 0-5 9-15 9-20 0Z"/><circle cx="12" cy="12" r="3"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 building:'<path d="M5 21V3h14v18M2 21h20M9 7h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1m-4 6v-3h2v3"/>'
};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name]||icons.grid}</svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=Number(v);if(!Number.isFinite(n))return String(v??'—');const sign=n<0?'-':'',abs=Math.abs(n);if(abs<10000){if(Number.isInteger(n))return String(n);const intLen=Math.floor(abs).toString().length,dec=Math.min(2,Math.max(0,4-intLen)),res=abs.toFixed(dec).replace(/\.?0+$/,'');return res==='10000'?'1w':sign+res;}if(abs<99995000){const w=abs/10000;let s=w<100?w.toFixed(2):w<1000?w.toFixed(1):Math.round(w).toString();s=s.replace(/\.?0+$/,'');return sign+s+'w';}const yi=abs/100000000;let s=yi<100?yi.toFixed(2):yi<1000?yi.toFixed(1):Math.round(yi).toString();s=s.replace(/\.?0+$/,'');return sign+s+'亿';};
const pct=(a,b)=>b?(100*a/b).toFixed(2):'—';

const provinces=[
 {n:'浙江省',short:'浙江',stations:184,online:181,expected:184000,complete:.9951,valid:.9954,timely:.9921,cover:96.8},
 {n:'江苏省',short:'江苏',stations:178,online:174,expected:178000,complete:.9945,valid:.9962,timely:.9905,cover:97.2},
 {n:'四川省',short:'四川',stations:196,online:189,expected:196000,complete:.9878,valid:.9898,timely:.9840,cover:92.4},
 {n:'湖南省',short:'湖南',stations:164,online:158,expected:164000,complete:.9892,valid:.9915,timely:.9860,cover:94.7},
 {n:'安徽省',short:'安徽',stations:148,online:145,expected:148000,complete:.9946,valid:.9949,timely:.9926,cover:95.6},
 {n:'湖北省',short:'湖北',stations:156,online:151,expected:156000,complete:.9914,valid:.9927,timely:.9882,cover:94.2},
 {n:'河南省',short:'河南',stations:132,online:129,expected:132000,complete:.9932,valid:.9940,timely:.9894,cover:95.3},
 {n:'山西省',short:'山西',stations:122,online:119,expected:122000,complete:.9929,valid:.9937,timely:.9887,cover:94.9}
];

const stations=[
 {id:'ZJ-HZ-013',n:'杭州余杭站',p:'浙江省',line:'500kV 余杭变',element:'大气电场',unit:'kV/m',quality:94.82,online:true,model:'综合气象监测装置',device:'PM-ZJ-013',cal:'2027-04-15',ref:'ZJ-CAL-2026-0415'},
 {id:'SC-GZ-028',n:'甘孜康定站',p:'四川省',line:'500kV 甘康线 #128',element:'风速',unit:'m/s',quality:95.38,online:true,model:'线路型监测装置',device:'PM-SC-028',cal:'2027-06-02',ref:'SC-CAL-2026-0602'},
 {id:'HB-WH-087',n:'武汉江夏站',p:'湖北省',line:'220kV 江夏变',element:'气温',unit:'℃',quality:96.41,online:true,model:'综合气象监测装置',device:'PM-HB-087',cal:'2027-03-21',ref:'HB-CAL-2026-0321'},
 {id:'HN-CS-041',n:'长沙望城站',p:'湖南省',line:'500kV 望城变',element:'相对湿度',unit:'%RH',quality:97.12,online:true,model:'综合气象监测装置',device:'PM-HN-041',cal:'2027-05-09',ref:'HN-CAL-2026-0509'},
 {id:'JS-YC-066',n:'盐城滨海站',p:'江苏省',line:'500kV 滨海线 #076',element:'雨量',unit:'mm',quality:97.86,online:true,model:'线路型监测装置',device:'PM-JS-066',cal:'2027-07-18',ref:'JS-CAL-2026-0718'},
 {id:'AH-HS-022',n:'黄山歙县站',p:'安徽省',line:'220kV 歙县变',element:'气压',unit:'hPa',quality:98.24,online:true,model:'综合气象监测装置',device:'PM-AH-022',cal:'2027-01-12',ref:'AH-CAL-2026-0112'},
 {id:'HA-LY-031',n:'洛阳栾川站',p:'河南省',line:'500kV 栾川线 #091',element:'风速',unit:'m/s',quality:99.14,online:true,model:'线路型监测装置',device:'PM-HA-031',cal:'2027-08-20',ref:'HA-CAL-2026-0820'},
 {id:'SX-DT-019',n:'大同浑源站',p:'山西省',line:'500kV 浑源变',element:'气温',unit:'℃',quality:99.32,online:true,model:'综合气象监测装置',device:'PM-SX-019',cal:'2027-09-10',ref:'SX-CAL-2026-0910'}
];

const originalEvents=[
 {id:'QC-1023-042',station:'ZJ-HZ-013',type:'空间一致性异常',level:'严重',status:'待复核',time:'16:08',ago:'32分钟',day:0,rule:'QC-EF-SP-017',value:'4.82',reference:'5.43',bias:'-11.2%',cause:'观测值持续低于参考区间，建议核查传感器漂移与现场干扰。'},
 {id:'QC-1023-038',station:'SC-GZ-028',type:'持续性异常',level:'重要',status:'待派单',time:'15:42',ago:'58分钟',day:0,rule:'QC-WS-TM-006',value:'8.30',reference:'12.10',bias:'-31.4%',cause:'连续6个时次观测值不变，已复核为传感器疑似卡滞，待现场核查。'},
 {id:'QC-1023-031',station:'HB-WH-087',type:'时间一致性异常',level:'重要',status:'待复核',time:'15:26',ago:'1小时14分',day:0,rule:'QC-TE-TM-003',value:'31.20',reference:'24.60',bias:'+6.6℃',cause:'10分钟温升超过示例规则阈值，需结合邻站、辐射条件核验。'},
 {id:'QC-1023-025',station:'HN-CS-041',type:'多要素协同异常',level:'一般',status:'处理中',time:'14:35',ago:'2小时05分',day:0,rule:'QC-RH-IN-008',value:'98.00',reference:'76.00',bias:'+22.0%RH',cause:'相对湿度与温度协同关系异常，现场检查任务正在执行。',work:'WO-1023-015'},
 {id:'QC-1023-018',station:'JS-YC-066',type:'缺测',level:'一般',status:'待复核',time:'13:50',ago:'2小时50分',day:0,rule:'QC-RA-MS-002',value:'—',reference:'0.20',bias:'缺测',cause:'雨量通道连续3个时次未到报；站点在线，其余要素正常。'},
 {id:'QC-1023-011',station:'AH-HS-022',type:'界限值异常',level:'一般',status:'待复验',time:'11:10',ago:'5小时30分',day:0,rule:'QC-PR-RG-001',value:'1002.10',reference:'1002.30',bias:'-0.2hPa',cause:'现场已完成接插件检查与比对，近6个时次偏差稳定，等待质量复验。',work:'WO-1023-009'},
 {id:'QC-1022-007',station:'HA-LY-031',type:'变化速率异常',level:'一般',status:'已闭环',time:'10:30',ago:'昨日',day:1,rule:'QC-WS-RT-005',value:'5.60',reference:'5.70',bias:'-0.1m/s',cause:'经复核确认为真实阵风过程，保留原始观测并完成误判反馈。',result:'真实天气'},
 {id:'QC-1021-003',station:'SX-DT-019',type:'时间一致性异常',level:'一般',status:'已闭环',time:'09:10',ago:'前日',day:2,rule:'QC-TE-TM-003',value:'12.80',reference:'12.90',bias:'-0.1℃',cause:'现场复位后数据恢复，经质量复验关闭。',work:'WO-1021-002'}
];

let events=JSON.parse(JSON.stringify(originalEvents));
try{const saved=JSON.parse(localStorage.getItem('meteo-six-demo-v1'));if(Array.isArray(saved)&&saved.length===8&&saved.every(e=>originalEvents.some(o=>o.id===e.id)&&['待复核','待派单','处理中','待复验','已闭环'].includes(e.status)))events=saved;}catch{}

const rules=[
 {id:'QC-EF-SP-017',n:'大气电场空间一致性',el:'大气电场',type:'空间一致性',v:'v2.3.1',scope:'浙江 / 江苏 / 安徽',enabled:true},
 {id:'QC-WS-TM-006',n:'风速持续性检查',el:'风速',type:'时间一致性',v:'v2.2.0',scope:'全部示例省份',enabled:true},
 {id:'QC-TE-TM-003',n:'气温突变识别',el:'气温',type:'时间一致性',v:'v2.1.4',scope:'全部示例省份',enabled:true},
 {id:'QC-RH-IN-008',n:'温湿要素协同检查',el:'相对湿度',type:'内部一致性',v:'v1.8.2',scope:'全部示例省份',enabled:true},
 {id:'QC-RA-MS-002',n:'雨量数据完整性检查',el:'雨量',type:'完整性',v:'v2.0.1',scope:'全部示例省份',enabled:true},
 {id:'QC-PR-RG-001',n:'气压物理界限检查',el:'气压',type:'界限值',v:'v1.6.0',scope:'全部示例省份',enabled:true}
];

const S={module:'qc',tab:'summary',scope:'全国',period:'今日',element:'综合',currentHour:16,currentMinute:1000,timePlay:false,mode:'常态运行',trend:'7',eventStatus:'全部',search:'',level:'全部',detail:null,analysis:'element',menu:false};
const station=id=>stations.find(s=>s.id===id);
const ELEMENT_DICT={'综合':null,'风速':{k:'wspd',n:'风速',aliases:['风速','wspd'],qFactor:0.978},'风向':{k:'wdir',n:'风向',aliases:['风向','wdir'],qFactor:0.991},'温度':{k:'temp',n:'气温',aliases:['气温','温度','temp'],qFactor:0.993},'湿度':{k:'rh',n:'相对湿度',aliases:['相对湿度','湿度','rh'],qFactor:0.991},'气压':{k:'pres',n:'气压',aliases:['气压','pres'],qFactor:0.994},'雨量':{k:'rain',n:'雨量',aliases:['雨量','rain'],qFactor:0.991},'辐照':{k:'rad',n:'总辐射',aliases:['总辐射','辐照','rad'],qFactor:0.989},'大气电场':{k:'efld',n:'大气电场',aliases:['大气电场','电场','efld'],qFactor:0.963}};

function matchElement(itemElement,target=S.element||'综合'){if(!target||target==='综合')return true;const cfg=ELEMENT_DICT[target];if(!cfg)return true;return cfg.aliases.includes(itemElement)||itemElement===cfg.k||itemElement===cfg.n;}
function filteredEvents(){
 let list;if(S.period==='当前'){
  const curM=S.currentMinute??((S.currentHour!=null?S.currentHour*60:1000));
  list=events.filter(e=>{if(S.scope!=='全国'&&station(e.station).p!==S.scope)return false;if(e.day!==0)return false;const p=e.time.split(':');return (Number(p[0])*60+Number(p[1]||0))<=curM;});
 }
  else{const days=S.period==='今日'?0:S.period==='近3日'?2:6;
 list=events.filter(e=>(S.scope==='全国'||station(e.station).p===S.scope)&&e.day<=days);}
 if(S.element&&S.element!=='综合')list=list.filter(e=>matchElement(station(e.station).element));
 return list;
}
function pending(){return filteredEvents().filter(e=>e.status!=='已闭环');}
function scopeRows(){return provinces.filter(p=>S.scope==='全国'||p.n===S.scope);}
function stats(){
 const rows=scopeRows(),cfg=ELEMENT_DICT[S.element||'综合'];
 if(S.period==='当前'){
  const r={stations:0,online:0,expected:0,received:0,valid:0,timely:0};
  for(const p of rows){
   r.stations+=p.stations;r.online+=p.online;
   r.expected+=p.stations;
   const a=Math.round(p.stations*p.complete);
   r.received+=a;r.valid+=Math.round(a*(cfg?cfg.qFactor:p.valid));
   r.timely+=Math.round(p.stations*p.timely);
  }
  return r;
 }
 const factor=S.period==='今日'?1:S.period==='近3日'?3:7;
 const r={stations:0,online:0,expected:0,received:0,valid:0,timely:0};
 for(const p of rows){
  r.stations+=p.stations;r.online+=p.online;
  r.expected+=p.stations*24*factor;
  const a=Math.round(p.stations*24*factor*p.complete);
  r.received+=a;r.valid+=Math.round(a*(cfg?cfg.qFactor:p.valid));
  r.timely+=Math.round(p.stations*24*factor*p.timely);
 }
 return r;
}

const tag=(text,color)=>`<span class="tag ${color||''}">${esc(text)}</span>`;
const levelTag=x=>tag(x,x==='严重'?'red':x==='重要'?'orange':'blue');
const statusTag=x=>tag(x,x==='已闭环'?'green':x==='待复验'?'purple':x==='处理中'?'blue':'orange');
const btn=(text,action,primary=false,i='')=>`<button class="btn ${primary?'primary':''}" ${action}>${i?icon(i):''}${text}</button>`;
const textBtn=(text,action,i='arrow')=>`<button class="text-btn" ${action}>${text}${i?icon(i):''}</button>`;
const panelHead=(title,sub='',right='')=>`<div class="panel-head"><div><div class="panel-title">${title}</div>${sub?`<div class="panel-sub">${sub}</div>`:''}</div>${right}</div>`;
function empty(text='当前范围没有对应记录',sub='可切换省份、时间范围或筛选条件查看其他数据。'){return `<div class="empty">${icon('search')}<strong>${text}</strong><p>${sub}</p></div>`;}
function save(){try{localStorage.setItem('meteo-six-demo-v1',JSON.stringify(events));}catch{toast('当前浏览器不支持本地保存，操作在本次打开期间有效');}}
function toast(msg){const el=document.getElementById('toast');if(!el)return;el.textContent=msg;el.classList.add('show');clearTimeout(window.toastTimeout);window.toastTimeout=setTimeout(()=>el.classList.remove('show'),3200);}

function openModal(title,body,drawer=false){
 const root=document.getElementById('overlay');if(!root)return;
 window.modalTrigger=document.activeElement;
 root.innerHTML=`<div class="modal-mask ${drawer?'drawer-mask':''}" onclick="if(event.target===this)closeModal()"><section class="modal ${drawer?'drawer':''}" role="dialog" aria-modal="true" aria-label="${esc(title)}" tabindex="-1"><div class="panel-head"><div class="panel-title">${title}</div><button class="icon-btn" aria-label="关闭弹窗" onclick="closeModal()">${icon('close')}</button></div><div class="panel-body">${body}</div></section></div>`;
 root.querySelector('.modal')?.focus();
}
function closeModal(){
 if(window.qcoDetailChartInstance){
  try{window.qcoDetailChartInstance.dispose();}catch(e){}
  window.qcoDetailChartInstance=null;
 }
 const root=document.getElementById('overlay');if(root)root.innerHTML='';window.modalTrigger?.focus?.();
}
window.openModal=openModal;
window.closeModal=closeModal;
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();}});

function openStation(id){
 const s=station(id),list=events.filter(e=>e.station===id);
 if(!s)return;
 openModal('站点全生命周期档案',`<div class="eyebrow">STATION PROFILE / ${s.id}</div><h2>${s.n}</h2>${tag('装置在线','green')} ${tag(s.p)}<div class="dl"><div><span>关联电力设施</span>${s.line}</div><div><span>装置编号</span>${s.device}</div><div><span>装置类型</span>${s.model}</div><div><span>校准有效期</span>${s.cal}</div><div><span>监测要素</span>${s.element}</div><div><span>维护责任</span>${s.p.replace('省','')}属地运维班组</div></div><div class="station-live"><small>质控合格率</small><br><strong>${s.quality.toFixed(2)}%</strong></div><div class="panel-title" style="margin:22px 0 12px">关联质量事件</div>${list.map(e=>`<button class="todo-item" onclick="closeModal();openEvent('${e.id}')"><span class="todo-copy"><strong>${e.type}</strong><small>${e.id}</small></span>${statusTag(e.status)}</button>`).join('')||'<div class="ds-empty">暂无未闭环事件</div>'}`,true);
}
window.openStation=openStation;

function showMetric(k){
 const r=stats();
 const meta={
  available:['数据可用率','通过质控检查并可供业务使用的数据条数 / 统计窗口应采数据条数 × 100%',r.valid,r.expected],
  complete:['数据完整率','统计窗口已接收数据条数 / 统计窗口应采数据条数 × 100%',r.received,r.expected],
  timely:['数据及时率','时效要求内到报的数据条数 / 统计窗口应采数据条数 × 100%',r.timely,r.expected],
  online:['装置在线率','在线站点数 / 统计范围全部站点数 × 100%',r.online,r.stations],
  events:['待处理质量事件','当前范围内处理状态不是已闭环的质量事件数量',pending().length,filteredEvents().length]
 };
 const m=meta[k]||meta.available;
 openModal(m[0]+' · 计算口径',`<div class="banner-line">${icon('info')}当前管理范围：${S.scope} / ${S.period}</div><p style="font-size:13px;line-height:1.8">${m[1]}</p><div class="metric-explain"><div><small>${k==='events'?'未闭环事件':'有效数据/分子'}</small><b>${num(m[2])}</b></div><div><small>${k==='events'?'事件总数':'应采基数/分母'}</small><b>${num(m[3])}</b></div></div>`);
}

function showEvidence(id,type){
 const e=events.find(e=>e.id===id),s=e?station(e.station):null;
 if(!e||!s)return;
 const data={
  raw:['原始观测样本',`<div class="evidence-kpis"><div class="evidence-kpi"><span>站点</span><b style="font-size:14px">${s.id}</b></div><div class="evidence-kpi"><span>观测</span><b>${e.value}<small>${s.unit}</small></b></div><div class="evidence-kpi"><span>记录状态</span><b style="font-size:16px">原始值保留</b></div></div><p>关联事件 ${e.id}，监测要素 ${s.element}。订正值与服务值独立存储，原始观测永久留痕。</p>`],
  rule:['规则命中记录',`<p>规则编号：${e.rule}</p><p>异常类型：${e.type}</p><p>判定依据：${e.cause}</p>`],
  cal:['校准证书摘要',`<p>证书编号：${s.ref}</p><p>关联装置：${s.device}</p><p>有效期：${s.cal}</p>`],
  work:['关联现场工单',`<p>工单编号：${e.work||'暂未派单'}</p><p>当前阶段：${e.status}</p><p>责任班组：${esc(e.team||s.p.replace('省','')+'属地运维班组')}</p>`]
 };
 openModal(data[type][0],data[type][1]);
}

function showRule(i){
 const r=rules[i];if(!r)return;
 openModal(r.n,`<div class="eyebrow">${r.id}</div><div class="dl" style="display:grid;gap:12px"><div>版本：${r.v}</div><div>要素：${r.el}</div><div>范围：${r.scope}</div><div>状态：${r.enabled?'运行中':'已停用'}</div></div><div class="evidence-note"><strong>输入与输出</strong>输入为原始观测与站点元数据；输出为质量标识与规则版本。识别异常后进入专业复核。</div>`);
}

function toggleRule(i){
 if(!rules[i])return;
 rules[i].enabled=!rules[i].enabled;
 if(typeof render==='function')render();
 toast(`规则【${rules[i].n}】已${rules[i].enabled?'启用':'停用'}`);
}

function showRulePolicy(){
 openModal('质控规则统一版本管理',`<p>总部维护统一定义与算法版本，各省依场景执行。规则调整需经标准数据集评测与专业审核。</p>`);
}

function createTask(){
 openModal('创建质控复核任务',`<form onsubmit="submitTask(event)"><div class="form-field"><label for="task-name">任务名称</label><input id="task-name" required maxlength="60" placeholder="例如：大气电场空间一致性专项复核"></div><div class="form-field"><label for="task-station">关联站点</label><select id="task-station">${stations.filter(s=>S.scope==='全国'||s.p===S.scope).map(s=>`<option value="${s.id}">${s.n} / ${s.id}</option>`).join('')}</select></div><div class="form-field"><label for="task-method">复核类型</label><select id="task-method"><option>空间一致性专项复核</option><option>完整性专项复核</option><option>时间一致性专项复核</option><option>多要素协同复核</option></select></div><div class="form-actions"><button class="btn" type="button" onclick="closeModal()">取消</button><button class="btn primary" type="submit">生成任务草稿</button></div></form>`);
}

function submitTask(event){
 event.preventDefault();
 const title=document.getElementById('task-name').value.trim();
 const id=document.getElementById('task-station').value;
 download('质控复核任务草稿.txt',`质控复核任务草稿\n任务名称：${title}\n关联站点：${station(id)?.n} / ${id}\n复核类型：${document.getElementById('task-method').value}\n管理范围：${S.scope}\n统计时段：${S.period}`);
 closeModal();
 toast('任务草稿已生成并下载');
}

function resetDemo(){
 events=JSON.parse(JSON.stringify(originalEvents));
 save();
 closeModal();
 S.detail=null;
 if(typeof render==='function')render();
 toast('已恢复初始样例数据');
}

function evidenceChart(e){
 const s=station(e.station),base=Number(e.reference)||5.43,isMissing=e.type==='缺测',val=Number(e.value);
 const ref=Array.from({length:13},(_,i)=>base*(1+Math.sin(i*1.4)*.012));ref[12]=base;
 const rawStatus=originalEvents.find(o=>o.id===e.id)?.status;
 const actual=ref.map((v,i)=>{
  if(rawStatus==='待复验'||rawStatus==='已闭环')return v*(.992+Math.sin(i)*.004);
  if(e.type==='持续性异常')return val;
  if(e.type==='时间一致性异常')return i<6?v:v+(val-base)*(i-5)/7;
  return v*(1-.03-i*.0065);
 });
 if(!isMissing)actual[12]=val;
 const all=[...ref,...actual];let low=Math.min(...all)*.96,high=Math.max(...all)*1.04;
 if(high-low<1){low=Math.min(...all)-.5;high=Math.max(...all)+.5;}
 const w=760,h=240,l=56,r=26,t=25,b=35;
 const x=i=>l+i*(w-l-r)/12,y=v=>t+(high-v)/(high-low)*(h-t-b);
 const points=arr=>arr.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
 return `<svg class="chart analysis-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(s.element)}观测与参考曲线"><text x="${l}" y="14" fill="#a4c2d5" font-size="11">${esc(s.unit)}</text>${[0,.5,1].map(f=>{const v=low+(high-low)*f;return `<line class="grid-line" x1="${l}" x2="${w-r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l-10}" y="${y(v)+3}" text-anchor="end">${v.toFixed(1)}</text>`;}).join('')}<polyline points="${points(ref)}" fill="none" stroke="#6c9c89" stroke-width="1.8" stroke-dasharray="5 4"/>${isMissing?`<rect x="${x(9)}" y="${t}" width="${x(12)-x(9)}" height="${h-t-b}" fill="#fcf2e822"/><text x="${x(10.5)}" y="${t+30}" text-anchor="middle" fill="#d89e63">连续缺测</text>`:`<polyline points="${points(actual)}" fill="none" stroke="#cc625b" stroke-width="2.2"/>${actual.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="2.2" fill="#fff" stroke="#cc625b" stroke-width="1.3"></circle>`).join('')}`}${['14:00','14:30','15:00','15:30','16:00'].map((v,i)=>`<text x="${x(i*3)}" y="${h-8}" text-anchor="middle">${v}</text>`).join('')}</svg>`;
}

function detailPage(){
 const e=events.find(e=>e.id===S.detail);if(!e)return empty();
 const s=station(e.station);
 const stage=['待复核','待派单','处理中','待复验','已闭环'].indexOf(e.status);
 return `<div class="detail-page-wrap"><div class="page-head"><div><div class="eyebrow">QUALITY EVENT / ${e.id}</div><div class="page-title"><h2>${s.n} · ${e.type}</h2>${levelTag(e.level)}${statusTag(e.status)}</div><div class="detail-meta"><span>关联设施：<b>${s.line}</b></span><span>监测要素：<b>${s.element}</b></span><span>发现时间：<b>10/${23-e.day} ${e.time}</b></span></div></div><div class="head-actions">${btn('站点档案',`onclick="openStation('${s.id}')"`,false,'pin')}${btn('导出记录',`onclick="exportEvent('${e.id}')"`,false,'download')}</div></div><div class="process" aria-label="事件处置进程">${['专业复核','派单处置','现场执行','恢复复验','闭环归档'].map((n,i)=>`<div class="step ${i<stage?'done':i===stage?'current':''}"><span class="step-num">${i<stage?'✓':i+1}</span><span>${n}</span></div>`).join('')}</div><div class="detail-grid"><div class="detail-stack"><section class="panel">${panelHead('异常证据与参考对比','观测数据与同步参考样本',tag('原始观测保留','green'))}<div class="panel-body"><div class="evidence-kpis"><div class="evidence-kpi"><span>最新观测值</span><b class="negative">${esc(e.value)}<small>${s.unit}</small></b></div><div class="evidence-kpi"><span>同步参考值</span><b>${esc(e.reference)}<small>${s.unit}</small></b></div><div class="evidence-kpi"><span>当前偏差</span><b class="warn">${e.bias}</b></div></div>${evidenceChart(e)}<div class="evidence-note"><strong>规则命中 ${e.rule}</strong>${e.cause}</div></div></section><section class="panel">${panelHead('关联证据与追溯')}<div class="panel-body"><div class="attachments">${[['原始观测样本','raw'],['规则命中记录','rule'],['校准证书摘要','cal']].map(([t,k])=>`<button class="attachment" onclick="showEvidence('${e.id}','${k}')">${icon('file')}${t}</button>`).join('')}${e.work?`<button class="attachment" onclick="showEvidence('${e.id}','work')">${icon('tool')}工单 ${e.work}</button>`:''}</div></div></section></div><div class="detail-stack"><section class="panel">${panelHead(e.status==='已闭环'?'闭环结论':'专业复核与处置')}<div class="panel-body">${actionForm(e)}</div></section><section class="panel">${panelHead('处置时间线')}<div class="panel-body"><div class="timeline">${timeline(e).map(([title,time,who])=>`<div class="timeline-item"><strong>${esc(title)}</strong><small>${esc(time)} · ${esc(who)}</small></div>`).join('')}</div></div></section></div></div></div>`;
}

function timeline(e){
 const history=[['规则识别质量异常',`10/${23-e.day} ${e.time}`,'质控引擎'],['原始样本与依据归档',`10/${23-e.day} ${e.time}`,'系统']];
 if(e.logs)return [...history,...e.logs];
 if(e.status!=='待复核')history.push(['已完成专业复核','历史记录','省级专业人员']);
 if(e.work)history.push([`已关联工单 ${e.work}`,'历史记录','运维协同']);
 if(['待复验','已闭环'].includes(e.status))history.push(['现场结论已回写','历史记录','属地班组']);
 if(e.status==='已闭环')history.push(['质量复核完成','历史记录','省级专业人员']);
 return history;
}

function actionForm(e){
 if(e.status==='已闭环')return `<div class="banner-line">${icon('check')}事件已完成闭环归档</div><div class="form-field"><label>最终结论</label><div class="evidence-note" style="margin-top:0">${esc(e.note||e.cause)}</div></div>${tag(e.result||'恢复确认完成','green')}`;
 const common=`<div class="form-field"><label for="action-note">处置记录</label><textarea id="action-note" placeholder="填写判断依据、现场处置内容或复验结论" required></textarea><div id="form-error" class="input-hint negative" role="alert"></div></div>`;
 if(e.status==='待复核')return `<div class="form-field"><label for="review-result">复核判断</label><select id="review-result"><option value="device">疑似设备问题，现场处置</option><option value="weather">真实天气过程，保留观测</option><option value="false">规则误判，反馈优化</option></select></div>${common}<div class="form-actions">${btn('提交专业复核',`onclick="advanceEvent('${e.id}')"`,true,'check')}</div>`;
 if(e.status==='待派单')return `<div class="form-field"><label for="team">责任班组</label><select id="team"><option>${station(e.station).p.replace('省','')}设备运维一班</option><option>${station(e.station).p.replace('省','')}计量校准专业组</option></select></div><div class="form-field"><label for="due-date">完成期限</label><input id="due-date" type="datetime-local" value="2026-10-24T18:00"></div>${common}<div class="form-actions">${btn('生成处置工单',`onclick="advanceEvent('${e.id}')"`,true,'tool')}</div>`;
 if(e.status==='处理中')return `<div class="form-field"><label>关联工单</label>${tag(e.work||'工单执行中','blue')}</div><div class="form-field"><label for="field-result">现场结果</label><select id="field-result"><option>检修与现场比对完成</option><option>传感器更换并校准</option><option>通信补传核查完成</option></select></div>${common}<div class="form-actions">${btn('回写现场结果',`onclick="advanceEvent('${e.id}')"`,true,'check')}</div>`;
 return `<div class="form-field"><label for="recheck-result">质量复验结论</label><select id="recheck-result"><option value="pass">质量恢复，确认归档</option><option value="fail">仍有异常，退回现场</option></select></div>${common}<div class="form-actions">${btn('提交复验结论',`onclick="advanceEvent('${e.id}')"`,true,'check')}</div>`;
}

function advanceEvent(id){
 const e=events.find(e=>e.id===id),note=document.getElementById('action-note')?.value?.trim()||'';
 if(note.length<3){const err=document.getElementById('form-error');if(err)err.textContent='请填写处理说明。';return;}
 const old=e.status;
 const previousLogs=e.logs||timeline(e).slice(2);
 let log='';
 if(old==='待复核'){const v=document.getElementById('review-result').value;e.result=v==='device'?'疑似设备问题':v==='weather'?'真实天气':'规则误判';e.status=v==='device'?'待派单':'已闭环';log=`专业复核：${e.result}`;}
 else if(old==='待派单'){e.status='处理中';e.work='WO-DEMO-'+e.id.slice(-3);e.team=document.getElementById('team').value;log=`工单已派发：${e.team}`;}
 else if(old==='处理中'){e.status='待复验';e.fieldResult=document.getElementById('field-result').value;log='现场结果回写：'+e.fieldResult;}
 else if(old==='待复验'){const pass=document.getElementById('recheck-result').value==='pass';e.status=pass?'已闭环':'处理中';e.result=pass?'恢复确认完成':'复验未通过';log=pass?'质量复验通过，闭环归档':'质量复验未通过，退回现场';}
 e.note=note;e.logs=previousLogs;e.logs.push([log+'；'+note,'本次操作','工作台']);
 save();if(typeof render==='function')render();toast(`已更新事件状态为【${e.status}】`);
}

function download(name,content,type='text/plain;charset=utf-8'){
 const blob=new Blob(['\ufeff',content],{type}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

function exportEvent(id){
 const e=events.find(e=>e.id===id);if(!e)return;
 download(e.id+'_处置记录.txt',`质量事件记录\n${e.id}\n站点：${station(e.station)?.n}\n异常：${e.type}\n状态：${e.status}\n观测：${e.value} ${station(e.station)?.unit}\n参考：${e.reference} ${station(e.station)?.unit}\n说明：${e.note||e.cause}\n时间线：\n`+timeline(e).map(r=>r.join(' / ')).join('\n'));
 toast('事件记录已导出');
}
