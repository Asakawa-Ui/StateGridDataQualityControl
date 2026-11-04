'use strict';

// 新六模块复用平台站网、事件、范围和时段；附件提供方法、标识及评估维度。
const QCC_FLAG = Object.fromEntries(QC_REFERENCE.FLAGS.map(f=>[f.k,f]));
const QCC_METHOD = Object.fromEntries(QC_REFERENCE.METHODS.map(m=>[m.id,m]));
const QCC_ELEMENT = Object.fromEntries(QC_REFERENCE.ELS.map(e=>[e.k,e]));
const QCC_EVENT_METHOD={'空间一致性异常':'space','持续性异常':'persist','时间一致性异常':'time','多要素协同异常':'internal','缺测':'missing','界限值异常':'range','变化速率异常':'rate'};
const QCC_STAGE_METHODS={rapid:['missing','range','rate','climate'],province:['time','space','internal','persist','complex']};
const qccIsResultsView=()=>['results'].includes(S.tab);
const qccResultStage=method=>QCC_STAGE_METHODS.province.includes(method)?'province':'rapid';
const qccVisibleMethods=()=>QC_REFERENCE.METHODS.filter(m=>!QCC_STAGE_METHODS[S.tab]||QCC_STAGE_METHODS[S.tab].includes(m.id));
const QCC_COLORS=['#80ddeb','#83b4e7','#8de2c4','#e6dc8b','#b7a3e9','#9ab5cc'];
const qccHash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const qccValue=(v,d=2)=>v==null?'—':Number(v).toFixed(d).replace(/\.00$/,'');
const qccClock=()=>new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',dateStyle:'short',timeStyle:'medium',hour12:false}).format(new Date());
const qccLoad=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==='object'?value:fallback;}catch{return fallback;}};
let qccJournal=qccLoad('meteo-qcc-corrections-v2',{});
let qccAlgorithms=qccLoad('meteo-qcc-algorithms-v2',null);
if(!Array.isArray(qccAlgorithms)||!qccAlgorithms.every(a=>typeof a.id==='string'&&typeof a.n==='string'))qccAlgorithms=QC_REFERENCE.ALGOS.map(a=>({...a,method:QC_REFERENCE.METHODS.find(m=>m.n===a.n)?.id||'complex'}));
let qccDeviceEdits=qccLoad('meteo-qcc-devices-v2',{});
let qccRevision=0,qccMemoKey='',qccMemoRows=[];
Object.assign(S,{qccMethod:'all',qccFlag:'all',qccResult:null,qccPage:0,qccSearch:'',qccDistribution:'flags',qccFixFilter:'全部',qccIssue:null,qccEval:'model',qccCase:0,qccSystem:'algo',qccAlgo:qccAlgorithms[1]?.id,qccDevice:stations[0].id,qccVoltage:'全部'});

const QCC_OBSERVATIONS=(()=>{
 const rows=[];
 for(let day=0;day<30;day++)for(const st of stations)for(const el of QC_REFERENCE.ELS)for(let hour=0;hour<=24;hour++){
  const seed=qccHash(`${st.id}|${el.k}|${hour}|${day}`),event=originalEvents.find(e=>e.station===st.id&&e.type&&station(e.station).element===el.n);
  const active=event&&day===event.day&&hour>=Math.min(16,Number(event.time.slice(0,2)));
  let value=el.base+Math.sin((hour+seed%7)/3)*el.step*3+((seed%100)/100-.5)*el.step*2,flag=seed%131===0?0:1;
  if(el.k==='rain')value=(seed%41)/10;
  if(el.k==='rad')value=Math.max(0,el.base*Math.sin(Math.PI*(hour-6)/12));
  if(el.k==='wdir')value=((value%360)+360)%360;
  if(active){flag=event.type==='缺测'?4:event.type==='界限值异常'?3:2;value=flag===4?null:flag===3?132.6:Number(event.value);}
  value=value==null?null:Number(value.toFixed(el.k==='wdir'?0:2));
  let methods=flag===0?[]:['complex'];
  if(active){methods.push(QCC_EVENT_METHOD[event.type]||'complex');if(flag===2){methods.push(['climate','rate','time'][hour%3]);if(hour%5===0)methods.push('internal');}}
  const date=new Date(Date.UTC(2026,9,23-day,hour)),label=`${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')} ${String(hour).padStart(2,'0')}:00`;
  rows.push({id:`QR-${day}-${st.id}-${el.k}-${hour}`,station:st.id,province:st.p,element:el.k,day,hour,time:label,value,flag,methods:[...new Set(methods)],eventId:active?event.id:null});
 }
 return rows;
})();

function qccRows(){
 const curM=S.currentMinute??((S.currentHour!=null?S.currentHour*60:1440));
 const key=[S.scope,S.period,S.element||'综合',S.period==='当前'?curM:'',qccRevision].join('|');if(key===qccMemoKey)return qccMemoRows;
 let filtered; if(S.period==='当前'){ const h=Math.min(24,Math.floor(curM/60)),min=curM%60; filtered=QCC_OBSERVATIONS.filter(r=>r.day===0&&r.hour===h&&(S.scope==='全国'||r.province===S.scope)).map(r=>{const mmStr=String(min).padStart(2,'0'),timeLabel=r.time.replace(/:\d{2}$/,`:${mmStr}`);let v=r.value;if(v!=null&&typeof v==='number')v=Number((v+Math.sin((min/10)+h)*0.06).toFixed(2));return {...r,time:timeLabel,value:v};}); } else { const days=S.period==='今日'?0:S.period==='近3日'?2:6; filtered=QCC_OBSERVATIONS.filter(r=>r.day<=days&&(S.scope==='全国'||r.province===S.scope)); }
 if(S.element&&S.element!=='综合')filtered=filtered.filter(r=>matchElement(r.element));
 qccMemoRows=filtered.map(r=>{
  const edit=r.eventId&&qccJournal[r.eventId];
  return edit?{...r,flag:edit.flag,corrected:edit.value,correction:edit}:r;
 });qccMemoKey=key;return qccMemoRows;
}
function qccFlags(rows=qccRows()){const counts={0:0,1:0,2:0,3:0,4:0,5:0};rows.forEach(r=>counts[r.flag]++);return counts;}
function qccMethodRows(id=S.qccMethod,withFlag=true){return qccRows().filter(r=>(id==='all'||r.methods.includes(id))&&(!withFlag||S.qccFlag==='all'||r.flag===Number(S.qccFlag))&&(!S.qccSearch||`${station(r.station).n}${r.id}${QCC_ELEMENT[r.element].n}`.includes(S.qccSearch)));}
function qccIssueStatus(e){if(qccJournal[e.id])return qccJournal[e.id].status;return e.status==='已闭环'?'已关闭':['处理中','待复验'].includes(e.status)?'复核中':'待处置';}
function qccIssues(){return filteredEvents().filter(e=>S.qccFixFilter==='全部'||qccIssueStatus(e)===S.qccFixFilter);}
function qcPendingCount(){return filteredEvents().filter(e=>['待处置','复核中'].includes(qccIssueStatus(e))).length;}
function qccIssue(){return filteredEvents().find(e=>e.id===S.qccIssue)||qccIssues()[0]||filteredEvents()[0];}
function qccIssueObservation(e){if(!e)return null;return qccRows().find(r=>r.id===S.qccResult&&r.eventId===e.id)||qccRows().filter(r=>r.eventId===e.id).sort((a,b)=>a.day-b.day||b.hour-a.hour)[0]||null;}
const qccFlag=(flag)=>{const f=QCC_FLAG[flag]||QCC_FLAG[0];return `<span class="qcc-flag flag-${f.k}"><i style="background:${f.hex}"></i>${f.n}</span>`;};
const qccInfo=items=>`<div class="qcc-info">${items.map(([a,b])=>`<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
const qccNote=text=>`<p class="qcc-note">${text}</p>`;
const qccAction=(name,action,primary=false)=>`<button class="ds-button ${primary?'primary':''}" onclick="${action}">${name}</button>`;
const qccSegments=(items,value,fn)=>`<div class="qcc-segments">${items.map(([id,name])=>`<button class="${String(id)===String(value)?'active':''}" aria-pressed="${String(id)===String(value)}" onclick="${fn}('${id}')">${name}</button>`).join('')}</div>`;
function qccTable(headers,rows){return rows.length?`<div class="qcc-table-wrap"><table class="qcc-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:dsEmpty('当前筛选没有数据样本');}
function qccRank(rows,max=100){return `<div class="qcc-ranking">${rows.map(([name,v,action])=>`<${action?'button':'div'} class="qcc-rank" ${action?`onclick="${action}"`:''}><span>${esc(name)}</span><i><b style="width:${Math.max(0,Math.min(100,v/max*100))}%"></b></i><em>${qccValue(v,1)}${max===100?'%':''}</em></${action?'button':'div'}>`).join('')}</div>`;}
function qccChart({series,labels,min,max,unit='',bars=false,height=184,width=640}){
 const values=series.flatMap(s=>s.values).filter(Number.isFinite);if(!values.length)return dsEmpty();
 min=min??Math.min(...values);max=max??Math.max(...values);if(max===min){min-=1;max+=1;}
 const w=width,h=height,l=44,r=18,t=18,b=27,x=i=>l+i*(w-l-r)/Math.max(1,labels.length-1),y=v=>t+(max-v)/(max-min)*(h-t-b);
 return `<svg class="ds-trend qcc-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(series.map(s=>s.name).join('、'))}；单位${esc(unit)}"><text x="${l}" y="11">${esc(unit)}</text>${[0,.5,1].map(p=>{const v=min+(max-min)*p;return `<line class="ds-gridline" x1="${l}" x2="${w-r}" y1="${y(v)}" y2="${y(v)}"/><text x="${l-7}" y="${y(v)+4}" text-anchor="end">${qccValue(v,max-min>10?0:1)}</text>`;}).join('')}${series.map((s,si)=>bars&&si===0?s.values.map((v,i)=>`<rect x="${x(i)-7}" y="${y(v)}" width="14" height="${h-b-y(v)}" fill="${s.color}" opacity=".8"><title>${esc(labels[i])} ${esc(s.name)} ${qccValue(v)}${esc(unit)}</title></rect>`).join(''):`<polyline fill="none" stroke="${s.color}" stroke-width="2" ${s.dash?'stroke-dasharray="5 4"':''} points="${s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}"/>${s.values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="2" fill="${s.color}"><title>${esc(labels[i])} ${esc(s.name)} ${qccValue(v)}${esc(unit)}</title></circle>`).join('')}`).join('')}${labels.map((label,i)=>i===0||i===labels.length-1||i%Math.max(1,Math.ceil(labels.length/6))===0?`<text x="${x(i)}" y="${h-7}" text-anchor="middle">${esc(label)}</text>`:'').join('')}</svg>`;
}
const qccLegend=series=>`<div class="qcc-chart-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>`;
function qccConnectKpis(r){
 const exp=r.expected,rec=r.received,missing=Math.max(0,exp-rec);
 const arrPct=exp?(rec/exp*100).toFixed(2):'100.00';
 const misPct=exp?(missing/exp*100).toFixed(2):'0.00';
 const timelyN=r.timely,timelyPct=exp?(timelyN/exp*100).toFixed(2):'98.88';
 const delayTotal=Math.max(0,rec-timelyN);
 const remindN=Math.round(delayTotal*0.62);
 const severeN=Math.round(delayTotal*0.27);
 const criticalN=Math.max(0,delayTotal-remindN-severeN);
 const remindPct=exp?(remindN/exp*100).toFixed(2):'0.00';
 const severePct=exp?(severeN/exp*100).toFixed(2):'0.00';
 const criticalPct=exp?(criticalN/exp*100).toFixed(2):'0.00';
 const C=238.76;
 const safeRec=Math.max(1,rec);
 const w1=Number(((timelyN/safeRec)*C).toFixed(2));
 const w2=Number(((remindN/safeRec)*C).toFixed(2));
 const w3=Number(((severeN/safeRec)*C).toFixed(2));
 const w4=Math.max(0,Number((C-w1-w2-w3).toFixed(2)));
 const off1=0,off2=-w1,off3=-(w1+w2),off4=-(w1+w2+w3);
 const leftCards=[
  {label:'应到',val:num(exp),unit:'条',rateLabel:'全网应采',rateVal:'',rateCls:''},
  {label:'实到',val:num(rec),unit:'条',rateLabel:'完整率',rateVal:arrPct+'%',rateCls:'good'},
  {label:'缺失',val:num(missing),unit:'条',rateLabel:'缺失率',rateVal:misPct+'%',rateCls:'warn'}
 ].map((c,i)=>`<div class="ds-kpi ds-kpi-connect metric-${i}"><div class="ds-kpi-label">${c.label}<button aria-label="查看${c.label}口径" onclick="qccShowScope()">${icon('info')}</button></div><div class="ds-kpi-value ${String(c.val).length>6?'qcc-kpi-compact':''}">${c.val}<em>${c.unit}</em></div><div class="ds-kpi-note">${c.rateVal?`<span class="qca-rate-label">${c.rateLabel}</span><b class="qca-rate-badge ${c.rateCls}">${c.rateVal}</b>`:`<span class="qca-rate-desc">${c.rateLabel}</span>`}</div></div>`).join('');
 const donutSvg=`<div class="qca-donut-chart"><svg viewBox="0 0 100 100" class="qca-donut-svg"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(80,150,180,0.22)" stroke-dasharray="3 3"/><circle cx="50" cy="50" r="32" fill="rgba(8,24,38,0.75)" stroke="rgba(40,80,110,0.3)"/><g transform="rotate(-90 50 50)"><circle cx="50" cy="50" r="38" fill="none" stroke="#1fc79a" stroke-width="8.5" stroke-dasharray="${w1} ${C-w1}" stroke-dashoffset="${off1}"/><circle cx="50" cy="50" r="38" fill="none" stroke="#36b3d9" stroke-width="8.5" stroke-dasharray="${w2} ${C-w2}" stroke-dashoffset="${off2}"/><circle cx="50" cy="50" r="38" fill="none" stroke="#f0ad4e" stroke-width="8.5" stroke-dasharray="${w3} ${C-w3}" stroke-dashoffset="${off3}"/><circle cx="50" cy="50" r="38" fill="none" stroke="#ee5a52" stroke-width="8.5" stroke-dasharray="${w4} ${C-w4}" stroke-dashoffset="${off4}"/></g><text x="50" y="44" text-anchor="middle" class="qca-donut-sub">实到</text><text x="50" y="61" text-anchor="middle" class="qca-donut-core">${num(rec)}<tspan font-size="9" font-family="var(--pg-font)" font-weight="normal" fill="#8eb3c7">条</tspan></text></svg></div>`;
 const legendItems=[
  {label:'及时',color:'#1fc79a',val:num(timelyN),pct:timelyPct},
  {label:'提醒延迟',color:'#36b3d9',val:num(remindN),pct:remindPct},
  {label:'严重延迟',color:'#f0ad4e',val:num(severeN),pct:severePct},
  {label:'危急延迟',color:'#ee5a52',val:num(criticalN),pct:criticalPct}
 ].map(item=>`<div class="qca-donut-row" title="${item.label} ${item.val}条 (${item.pct}%)"><span class="qca-dot" style="background:${item.color};box-shadow:0 0 6px ${item.color}88"></span><span class="qca-d-label">${item.label}</span><span class="qca-d-val">${item.val}<em>条</em></span></div>`).join('');
 const rightPanel=`<div class="ds-kpi ds-kpi-connect qca-donut-panel">${donutSvg}<div class="qca-donut-legend">${legendItems}</div></div>`;
 return `<div class="ds-kpis ds-connect-kpis"><div class="qca-kpi-row-top">${leftCards}</div>${rightPanel}</div>`;
}
function qccRapidKpis(r){
 const s2Data=(typeof qcoStageBadgesData==='function')?qcoStageBadgesData():null;
 const s2In=s2Data?s2Data.s2In:r.received;
 const formatOk=s2Data?s2Data.formatOk:Math.round(s2In*.9994);
 const completeOk=s2Data?s2Data.completeOk:Math.round(s2In*.9971);
 const overLimit=s2Data?s2Data.overLimit:Math.round(s2In*.0037);
 const s2Pass=s2Data?s2Data.s2Pass:Math.max(0,completeOk-overLimit);
 const missingElem=Math.max(0, s2In - completeOk);

 const fmtRate=s2In?(formatOk/s2In*100).toFixed(2):'99.94';
 const compRate=s2In?(completeOk/s2In*100).toFixed(2):'99.71';
 const passRate=s2In?(s2Pass/s2In*100).toFixed(2):'99.34';
 const missRate=s2In?(missingElem/s2In*100).toFixed(2):'0.29';
 const overRate=s2In?(overLimit/s2In*100).toFixed(2):'0.37';

 const steps = [
  { step:'1', title:'格式正确', val:num(formatOk), unit:'条', rate:fmtRate+'%', color:'#36b3d9', fill:fmtRate },
  { step:'2', title:'要素完整', val:num(completeOk), unit:'条', rate:compRate+'%', color:'#8e9dfa', fill:compRate },
  { step:'3', title:'S2质控通过', val:num(s2Pass), unit:'条', rate:passRate+'%', color:'#1fc79a', fill:passRate }
 ];

 const alertCards = `
  <div class="qcr-top-alerts">
   <div class="ds-kpi ds-kpi-rapid qcr-alert-kpi warn">
    <div class="ds-kpi-label">
     <span>要素缺测</span>
     <button aria-label="查看要素缺测口径" onclick="qccShowScope()">${icon('info')}</button>
    </div>
    <div class="ds-kpi-value qcc-kpi-compact" style="color:#f0ad4e">${num(missingElem)}<em>条</em></div>
    <div class="ds-kpi-note">
     <span class="qca-rate-label">缺测率</span>
     <b class="qca-rate-badge warn">${missRate}%</b>
    </div>
    <div class="qcr-alert-bar"><i style="width:${Math.min(100, Math.max(10, Number(missRate) * 20))}%;background:#f0ad4e;box-shadow:0 0 6px #f0ad4e88"></i></div>
   </div>
   <div class="ds-kpi ds-kpi-rapid qcr-alert-kpi danger">
    <div class="ds-kpi-label">
     <span>超限</span>
     <button aria-label="查看超限口径" onclick="qccShowScope()">${icon('info')}</button>
    </div>
    <div class="ds-kpi-value qcc-kpi-compact" style="color:#ee5a52">${num(overLimit)}<em>条</em></div>
    <div class="ds-kpi-note">
     <span class="qca-rate-label">超限率</span>
     <b class="qca-rate-badge danger">${overRate}%</b>
    </div>
    <div class="qcr-alert-bar"><i style="width:${Math.min(100, Math.max(10, Number(overRate) * 20))}%;background:#ee5a52;box-shadow:0 0 6px #ee5a5288"></i></div>
   </div>
  </div>
 `;

 const flowHtml = `
  <div class="qcr-flow-container-v">
   ${steps.map((st, i) => `
    <div class="qcr-flow-step-v step-${st.step}">
     <div class="qcr-step-v-head">
      <span class="qcr-step-title"><i class="qcr-step-num">${st.step}</i>${st.title}</span>
      <div class="qcr-step-v-meta">
       <span class="qcr-step-val" style="color:${st.color}">${st.val}<em>${st.unit}</em></span>
       <b class="qcr-step-rate" style="color:${st.color}">${st.rate}</b>
      </div>
     </div>
     <div class="qcr-step-bar">
      <i style="width:${st.fill}%;background:${st.color};box-shadow:0 0 6px ${st.color}88"></i>
     </div>
    </div>
    ${i < steps.length - 1 ? `<div class="qcr-flow-arrow-v" aria-hidden="true"><svg viewBox="0 0 24 10"><path d="M5 2 L12 8 L19 2" fill="none" stroke="rgba(125,230,250,0.6)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>` : ''}
   `).join('')}
  </div>
 `;

 return `<div class="ds-rapid-kpis">${alertCards}${flowHtml}</div>`;
}
function qccKpis(){
 if(S.tab==='province'||S.tab==='correction')return '';
 const r=stats();
 if(S.tab==='connect')return qccConnectKpis(r);if(S.tab==='rapid')return qccRapidKpis(r);if(S.tab==='evaluation')return qceEvalStatsKpis();
 const c=networkCounts(),rows=qccRows(),f=qccFlags(rows),correct=rows.length?pct(f[1]+f[5],rows.length):'0.00';
 const connection=qccConnection(),s2Data=(typeof qcoStageBadgesData==='function')?qcoStageBadgesData():null,s2In=s2Data?s2Data.s2In:r.received,formatOk=s2Data?s2Data.formatOk:Math.round(s2In*.9994),completeOk=s2Data?s2Data.completeOk:Math.round(s2In*.9976),s2Pass=s2Data?s2Data.s2Pass:Math.round(s2In*.9961),fmtRate=s2In?(formatOk/s2In*100).toFixed(2):'100.00',compRate=s2In?(completeOk/s2In*100).toFixed(2):'100.00',passRate=s2In?(s2Pass/s2In*100).toFixed(2):'100.00';
 const values=S.tab==='connect'?[['应到',num(r.expected),'条','全网计划应采总量'],['实到',num(r.received),'条','完整率 '+(r.expected?(r.received/r.expected*100).toFixed(2):'0.00')+'%'],['缺失',num(Math.max(0,r.expected-r.received)),'条','缺失率 '+(r.expected?(Math.max(0,r.expected-r.received)/r.expected*100).toFixed(2):'0.00')+'%'],['及时',num(r.timely),'条','及时率 '+(r.expected?(r.timely/r.expected*100).toFixed(2):'0.00')+'%'],['提醒延迟',num(Math.round(Math.max(0,r.received-r.timely)*.62)),'条','占比 '+(r.expected?(Math.round(Math.max(0,r.received-r.timely)*.62)/r.expected*100).toFixed(2):'0.00')+'%'],['严重延迟',num(Math.round(Math.max(0,r.received-r.timely)*.27)),'条','占比 '+(r.expected?(Math.round(Math.max(0,r.received-r.timely)*.27)/r.expected*100).toFixed(2):'0.00')+'%'],['危急延迟',num(Math.max(0,Math.max(0,r.received-r.timely)-Math.round(Math.max(0,r.received-r.timely)*.62)-Math.round(Math.max(0,r.received-r.timely)*.27))),'条','占比 '+(r.expected?(Math.max(0,Math.max(0,r.received-r.timely)-Math.round(Math.max(0,r.received-r.timely)*.62)-Math.round(Math.max(0,r.received-r.timely)*.27))/r.expected*100).toFixed(2):'0.00')+'%']]:
 S.tab==='rapid'?[['格式正确',num(formatOk),'条','正确率 '+fmtRate+'%'],['要素完整',num(completeOk),'条','完整率 '+compRate+'%'],['S2质控通过',num(s2Pass),'条','通过率 '+passRate+'%']]:
 qccIsResultsView()?[['质控样本',num(rows.length),'条','重点站点要素时序'],['样本正确率',correct,'%','正确及订正 / 样本'],['异常标识',num(f[2]+f[3]+f[4]),'条','可疑 / 错误 / 缺失'],['待处置问题',qcPendingCount(),'项','原值与订正分别留存']]:
 S.tab==='events'?[['待处置',filteredEvents().filter(e=>qccIssueStatus(e)==='待处置').length,'项','当前范围与时段'],['复核中',filteredEvents().filter(e=>qccIssueStatus(e)==='复核中').length,'项','专业复核与协同'],['已订正',filteredEvents().filter(e=>qccIssueStatus(e)==='已订正').length,'项','独立保存订正记录'],['已关闭',filteredEvents().filter(e=>qccIssueStatus(e)==='已关闭').length,'项','保留完整处置轨迹']]:
 S.tab==='system'?[['已注册算法',qccAlgorithms.length,'个','附件算法与本机配置'],['运行中算法',qccAlgorithms.filter(a=>a.st==='运行中').length,'个','演示配置状态'],['设备站点',num(c.all),'座','同一站网数据源'],['重点档案',dsScopedStations().length,'份','证书与事件关联']]:
 S.tab==='validation'?[['关联任务',qccValidationStatus().all,'项','按责任范围筛选'],['验证中',qccValidationStatus().running,'项','既有验证任务状态'],['采样中',qccValidationStatus().sampling,'项','装置与外场样本采集'],['待评审',qccValidationStatus().review,'项','尚待结论评审']]:
 S.tab==='evaluation'?[['评估样本',num(rows.length),'条','当前范围及时段'],['监测要素',QC_REFERENCE.ELS.length,'类','独立单位分别比较'],['评估维度','4','类','模式 / 气象 / 业务 / 过程'],['样本可用率',correct,'%','本机演示判定']]:
 [['监测站点',num(c.all),'座','在线 / 异常 / 离线互斥'],['装置在线率',pct(c.online+c.abnormal,c.all),'%','正常及异常 / 全部'],['样本正确率',correct,'%','重点站点要素样本'],['待处置问题',qcPendingCount(),'项','范围及时段内问题']];
 return `<div class="ds-kpis ${S.tab==='connect'?'ds-connect-kpis':(S.tab==='rapid'?'ds-rapid-kpis':'')}">${values.map(([label,value,unit,note],i)=>`<div class="ds-kpi ${S.tab==='connect'?'ds-kpi-connect':(S.tab==='rapid'?'ds-kpi-rapid':'')} metric-${i} ${label.includes('严重')||label.includes('缺失')?'amber':label.includes('危急')?'red':''}"><div class="ds-kpi-label">${label}<button aria-label="查看${label}口径" onclick="${S.tab==='validation'?'qccValidationHelp()':'qccShowScope()'}">${icon('info')}</button></div><div class="ds-kpi-value ${String(value).length>6?'qcc-kpi-compact':''}">${value}<em>${unit}</em></div><div class="ds-kpi-note">${note}</div></div>`).join('')}</div>`;
}
function qccConnection(){const r=stats();if(S.period==='当前'){const due=r.stations;return{due,got:r.received,timelyN:r.timely,arr:due?r.received/due*100:100,timely:due?r.timely/due*100:100};}const days=S.period==='今日'?1:S.period==='近3日'?3:7,due=r.stations*24*days;return{due,got:Math.round(due*r.received/r.expected),timelyN:Math.round(due*r.timely/r.expected),arr:r.received/r.expected*100,timely:r.timely/r.expected*100};}
function qccFlagBreakdown(rows=qccRows()){
 const counts=qccFlags(rows),total=rows.length;
 return `<div class="qcc-flag-summary">${[1,2,3,4,5,0].map(k=>`<div>${qccFlag(k)}<span>${num(counts[k])}</span><small>${total?pct(counts[k],total):'0.00'}%</small></div>`).join('')}</div>`;
}
function qccOverview(){
 const c=networkCounts(),rows=qccRows(),flags=qccFlags(rows),p=rows.length?Number(pct(flags[1]+flags[5],rows.length)):0;
 const provinceRows=scopeRows().map(prov=>{const local=rows.filter(r=>r.province===prov.n),f=qccFlags(local);return [prov.short,local.length?(f[1]+f[5])/local.length*100:0,`changeScope('${prov.n}')`];});
 const voltage=['1000kV','±800kV','500kV','220kV','110kV','35kV及以下'],net=networkScope(),v=voltage.map(n=>[n,net.filter(st=>qccVoltage(st)===n).length]);
 return dsColumns(
  dsCard('设备规模',dsMiniStats([[num(c.all),'监测站点','cyan'],[num(c.online+c.abnormal),'在线设备','cyan'],[num(c.offline),'离线设备','amber']])+qccNote('空间分布沿用全网模拟站点；质控明细取8个重点站点的8类要素。'),`${scopeRows().length} 省`,'','database')+
  dsCard('电压等级分布',qccRank(v,Math.max(1,...v.map(x=>x[1])))+qccNote('电压等级为站点演示属性，六档互斥汇总。'),'全网站点口径','','chart')+
  dsCard('数据业务闭环',`<div class="qcc-workflow">${[['connect','数据获取','到报 / 及时 / 完整'],['results','质量控制','方法 / 标识 / 结果'],['events','问题诊断','证据 / 订正 / 留痕'],['evaluation','数据评估','模式 / 比对 / 回溯']].map(([id,n,d])=>`<button onclick="changeTab('${id}')">${icon('chevron')}<span><b>${n}</b><small>${d}</small></span></button>`).join('')}</div>`,'按附件四环节组织','','link'),
  dsCard('全国数据质控',`<div class="qcc-quality-number"><b>${p.toFixed(2)}<small>%</small></b><span>重点站点样本正确率</span></div>`+qccFlagBreakdown(rows),dsMore('结果',"onclick=\"changeTab('results')\""),'','shield')+
  dsCard('历史质控问题清单',qccProblemList(filteredEvents()),dsMore('订正处置',"onclick=\"changeTab('events')\""),'','bell')+
  dsCard('各省质控正确率',qccRank(provinceRows)+qccNote('样本正确率与数据可用率的分母不同。'),'重点站点样本','','chart'),
  dsCard('样本正确率趋势',qccChart({series:[{name:'正确率',color:'#8ae5f0',values:Array.from({length:7},(_,i)=>Math.max(0,p-(6-i)*.21))}],labels:['10-17','10-18','10-19','10-20','10-21','10-22','10-23'],min:Math.max(0,p-3),max:100,unit:'%'}),'当前快照终值 · 演示趋势')
 );
}
function qccConnect(){
 const con=qccConnection(),names=scopeRows(),sample=networkScope().filter(st=>st.core).concat(networkScope().filter(st=>!st.core)).slice(0,10);
 const labels=Array.from({length:24},(_,i)=>String(i).padStart(2,'0'));
 const arrivals=labels.map((_,i)=>Math.max(90,Math.min(100,con.arr+Math.sin(i/3)*.35))),timely=labels.map((_,i)=>Math.max(88,Math.min(arrivals[i],con.timely+Math.cos(i/4)*.3)));
 return dsColumns(
  
  qcaLinkListCard(),
  qcaProvinceArrivals(),
  dsCard('数据链路情况趋势',`<div class="qco-trend-chart dashboard-echart" data-dashboard-chart="channel-trend" role="img" aria-label="${S.scope} ${S.period} 接收状态5层堆叠趋势"></div><div class="qcc-chart-legend qca-5legend"><span><i style="background:#1fc79a"></i>及时</span><span><i style="background:#36b3d9"></i>提醒延迟</span><span><i style="background:#f0ad4e"></i>严重延迟</span><span><i style="background:#ee5a52"></i>危急延迟</span><span><i style="background:#6f93ba"></i>缺失</span></div>`,S.period,'qco-trend-card qca-trend-card','chart')


 );
}
function qccProblemList(list){return list.length?`<div class="qcc-problem-list">${list.map(e=>`<button class="${qccIssue()?.id===e.id?'selected':''}" onclick="qccSelectIssue('${e.id}')"><span><b>${station(e.station).n}</b><small>${e.id} · ${e.type}</small><em>${e.time} · ${qccIssueStatus(e)}</em></span><i>${qccJournal[e.id]?qccFlag(qccJournal[e.id].flag):dsTag(e.level,dsEventColor(e))}</i></button>`).join('')}</div>`:dsEmpty('当前窗口没有质量问题');}
// S2 快速质控数据管理：分要素缺测与分要素超限
function qcrIssueData() {
 const rawMissing = [
  { id:'QR-M-01', stationId:'JS-YC-066', stationName:'盐城滨海站', deviceName:'500kV 滨海线 #076', prov:'江苏省', element:'雨量', elemKey:'rain', time:'10-23 16:00', duration:'缺测 12 时次', tag:'缺测', type:'missing', reason:'传感器远传光端机失电' },
  { id:'QR-M-02', stationId:'SC-GZ-028', stationName:'甘孜康定站', deviceName:'500kV 甘康线 #128', prov:'四川省', element:'风速', elemKey:'wspd', time:'10-23 15:42', duration:'缺测 4 时次', tag:'缺测', type:'missing', reason:'高寒覆冰导致信号衰减' },
  { id:'QR-M-03', stationId:'HN-CS-041', stationName:'长沙望城站', deviceName:'500kV 望城变', prov:'湖南省', element:'相对湿度', elemKey:'rh', time:'10-23 14:35', duration:'缺测 3 时次', tag:'缺测', type:'missing', reason:'前置通信机通道丢包' },
  { id:'QR-M-04', stationId:'HB-WH-087', stationName:'武汉江夏站', deviceName:'220kV 江夏变', prov:'湖北省', element:'气温', elemKey:'temp', time:'10-23 13:20', duration:'缺测 2 时次', tag:'缺测', type:'missing', reason:'规约解析超时断开' },
  { id:'QR-M-05', stationId:'ZJ-HZ-013', stationName:'杭州余杭站', deviceName:'500kV 余杭变', prov:'浙江省', element:'大气电场', elemKey:'efld', time:'10-23 11:15', duration:'缺测 2 时次', tag:'缺测', type:'missing', reason:'微波专网链路切换抖动' },
  { id:'QR-M-06', stationId:'AH-HS-022', stationName:'黄山歙县站', deviceName:'220kV 歙县变', prov:'安徽省', element:'气压', elemKey:'pres', time:'10-23 09:30', duration:'缺测 1 时次', tag:'缺测', type:'missing', reason:'4G通信模组偶发重连' },
  { id:'QR-M-07', stationId:'HA-LY-031', stationName:'洛阳栾川站', deviceName:'500kV 栾川线 #091', prov:'河南省', element:'总辐射', elemKey:'rad', time:'10-23 08:10', duration:'缺测 1 时次', tag:'缺测', type:'missing', reason:'光敏探头积灰遮蔽' },
  { id:'QR-M-08', stationId:'SX-YC-002', stationName:'运城永济站', deviceName:'500kV 永济变', prov:'山西省', element:'风向', elemKey:'wdir', time:'10-23 07:20', duration:'缺测 1 时次', tag:'缺测', type:'missing', reason:'机械风向标卡滞无更新' }
 ];

 const rawOverlimit = [
  { id:'QR-O-01', stationId:'SC-GZ-028', stationName:'甘孜康定站', deviceName:'500kV 甘康线 #128', prov:'四川省', element:'风速', elemKey:'wspd', time:'10-23 15:42', val:'42.8 m/s', limit:'[0, 35] m/s', diff:'+7.8 m/s', tag:'超限', type:'overlimit', reason:'瞬时峡谷阵风突破安全上限' },
  { id:'QR-O-02', stationId:'ZJ-HZ-013', stationName:'杭州余杭站', deviceName:'500kV 余杭变', prov:'浙江省', element:'大气电场', elemKey:'efld', time:'10-23 15:20', val:'62.4 kV/m', limit:'[-50, 50] kV/m', diff:'+12.4 kV/m', tag:'超限', type:'overlimit', reason:'强雷暴单体过境诱发畸变强场' },
  { id:'QR-O-03', stationId:'HB-WH-087', stationName:'武汉江夏站', deviceName:'220kV 江夏变', prov:'湖北省', element:'气温', elemKey:'temp', time:'10-23 14:15', val:'44.5 ℃', limit:'[-50, 42] ℃', diff:'+2.5 ℃', tag:'超限', type:'overlimit', reason:'变电区金属地表局地热岛突增' },
  { id:'QR-O-04', stationId:'HN-CS-041', stationName:'长沙望城站', deviceName:'500kV 望城变', prov:'湖南省', element:'相对湿度', elemKey:'rh', time:'10-23 13:50', val:'103.5 %', limit:'[0, 100] %', diff:'+3.5 %', tag:'超限', type:'overlimit', reason:'高湿环境湿敏电容凝结短路' },
  { id:'QR-O-05', stationId:'AH-HS-022', stationName:'黄山歙县站', deviceName:'220kV 歙县变', prov:'安徽省', element:'气压', elemKey:'pres', time:'10-23 11:30', val:'1125.2 hPa', limit:'[300, 1100] hPa', diff:'+25.2 hPa', tag:'超限', type:'overlimit', reason:'压阻传感器零点漂移超出量程' },
  { id:'QR-O-06', stationId:'JS-YC-066', stationName:'盐城滨海站', deviceName:'500kV 滨海线 #076', prov:'江苏省', element:'雨量', elemKey:'rain', time:'10-23 10:40', val:'278.4 mm', limit:'[0, 250] mm', diff:'+28.4 mm', tag:'超限', type:'overlimit', reason:'翻斗脉冲计数异常倍频跳变' },
  { id:'QR-O-07', stationId:'HA-LY-031', stationName:'洛阳栾川站', deviceName:'500kV 栾川线 #091', prov:'河南省', element:'总辐射', elemKey:'rad', time:'10-23 09:15', val:'1420 W/m²', limit:'[0, 1400] W/m²', diff:'+20 W/m²', tag:'超限', type:'overlimit', reason:'强直射高倍云隙聚焦瞬时突破阈值' },
  { id:'QR-O-08', stationId:'SX-YC-002', stationName:'运城永济站', deviceName:'500kV 永济变', prov:'山西省', element:'风向', elemKey:'wdir', time:'10-23 08:05', val:'372 °', limit:'[0, 360] °', diff:'+12 °', tag:'超限', type:'overlimit', reason:'编码器原点滑移导致方位角越界' }
 ];

 const scopeMissing = (S.scope==='全国') ? rawMissing : rawMissing.filter(m=>m.prov===S.scope);
 const scopeOverlimit = (S.scope==='全国') ? rawOverlimit : rawOverlimit.filter(o=>o.prov===S.scope);

 return { missing:scopeMissing, overlimit:scopeOverlimit, allMissing:scopeMissing, allOverlimit:scopeOverlimit };
}

function qcrOpenIssueModal(id){
 const { allMissing, allOverlimit } = qcrIssueData();
 const item = [...allMissing, ...allOverlimit].find(x => x.id === id);
 if(!item) return;
 S.detail = null;
 const isMiss = item.type === 'missing';
 const title = (isMiss ? '要素缺测诊断 · ' : '分要素超限诊断 · ') + item.deviceName;
 const infoPairs = [
  ['装置线路', item.deviceName],
  ['所在站址', item.stationName + ' (' + item.prov + ')'],
  ['监测要素', item.element],
  ['异常类型', item.tag],
  [isMiss ? '缺测时次' : '实测值', isMiss ? item.duration : item.val],
  [isMiss ? '通信通道' : '合理界限区间', isMiss ? '光纤专网 / B接口' : item.limit],
  [isMiss ? '上一次有效时次' : '超上限偏差', isMiss ? '10-23 04:00' : item.diff],
  ['检出时次', item.time],
  ['根因分析', item.reason],
  ['快速质控判据', isMiss ? '样本连续缺测阈值超限' : '电力气象地面观测极值范围规范']
 ];
 coreOpenModal(title, qccInfo(infoPairs) + qccNote('S2快速质控基于格式解析与分要素物理阈值规则自动检出，异常数据已被阻断流向S3综合质控，并同步进入事件消缺流程。'));
}

// 查看全部：要素缺测全量清单弹窗
function qcrOpenAllMissingModal(){
 const { allMissing } = qcrIssueData();
 S.detail = null;
 const rows = allMissing.map((m, idx) => [
  String(idx + 1).padStart(2, '0'),
  `<b>${esc(m.deviceName)}</b><br><small style="color:#7fb5d1">${esc(m.stationName)} (${esc(m.prov)})</small>`,
  `<span class="qcr-elem-badge badge-missing">${esc(m.element)}</span>`,
  `<b style="color:#f0ad4e">${esc(m.duration)}</b>`,
  `<time style="font-family:var(--pg-number-font);color:#8cb4cb">${m.time}</time>`,
  `<span style="color:#a8c9dd;font-size:11px">${esc(m.reason)}</span>`,
  `<button class="ds-button" onclick="closeModal();qcrOpenIssueModal('${m.id}')">诊断</button>`
 ]);
 const summary = `<div class="qcc-info"><div><span>管理范围</span><b>${S.scope} · ${S.period}</b></div><div><span>缺测总数</span><b style="color:#f0ad4e">${allMissing.length} 站次</b></div><div><span>涉及要素</span><b>${[...new Set(allMissing.map(x=>x.element))].join('、')}</b></div></div>`;
 coreOpenModal('要素缺测清单 · 全量记录', summary + qccTable(['序号', '装置线路 / 站址', '监测要素', '缺测时次', '检出时次', '根因分析', '操作'], rows) + qccNote('要素缺测系地面气象传感器数据未上传或报文段为空，已触发快速质控阻断与通道自愈排查。'));
}

// 查看全部：要素超限全量清单弹窗
function qcrOpenAllOverlimitModal(){
 const { allOverlimit } = qcrIssueData();
 S.detail = null;
 const rows = allOverlimit.map((o, idx) => [
  String(idx + 1).padStart(2, '0'),
  `<b>${esc(o.deviceName)}</b><br><small style="color:#7fb5d1">${esc(o.stationName)} (${esc(o.prov)})</small>`,
  `<span class="qcr-elem-badge badge-overlimit">${esc(o.element)}</span>`,
  `<b style="color:#ee5a52;font-family:var(--pg-number-font)">${esc(o.val)}</b>`,
  `<span style="color:#8bb3c9;font-family:var(--pg-number-font)">${esc(o.limit)}</span>`,
  `<b style="color:#ee5a52;font-family:var(--pg-number-font)">${esc(o.diff)}</b>`,
  `<time style="font-family:var(--pg-number-font);color:#8cb4cb">${o.time}</time>`,
  `<span style="color:#a8c9dd;font-size:11px">${esc(o.reason)}</span>`,
  `<button class="ds-button" onclick="closeModal();qcrOpenIssueModal('${o.id}')">诊断</button>`
 ]);
 const summary = `<div class="qcc-info"><div><span>管理范围</span><b>${S.scope} · ${S.period}</b></div><div><span>超限总数</span><b style="color:#ee5a52">${allOverlimit.length} 站次</b></div><div><span>涉及要素</span><b>${[...new Set(allOverlimit.map(x=>x.element))].join('、')}</b></div></div>`;
 coreOpenModal('要素超限清单 · 全量记录', summary + qccTable(['序号', '装置线路 / 站址', '监测要素', '实测值', '阈值界限', '超限偏差', '检出时次', '根因分析', '操作'], rows) + qccNote('要素超限系实时采集数值突破国家标准或电力行业气象要素物理极值区间，已标记不可用并阻断入库。'));
}

// 1. 右上方：【界限值标准】（清晰展示各要素合理上下界）
function qcrThresholdCard(){
 const elems = QC_REFERENCE.ELS;
 const colHead = `
  <div class="qcr-bounds-colhead">
   <span class="th-elem">监测要素</span>
   <span class="th-bound th-lo">合理下界</span>
   <span class="th-sep" aria-hidden="true"></span>
   <span class="th-bound th-hi">合理上界</span>
  </div>
 `;
 const itemsHtml = elems.map(e => `
  <div class="qcr-bound-row">
   <div class="qcr-bound-elem">
    <strong class="qcr-bound-name">${e.n}</strong>
    <span class="qcr-bound-unit">${e.u}</span>
   </div>
   <div class="qcr-bound-num bound-lo">
    <b>${e.lo}</b>
   </div>
   <div class="qcr-bound-sep">~</div>
   <div class="qcr-bound-num bound-hi">
    <b>${e.hi}</b>
   </div>
  </div>
 `).join('');

 return dsCard(
  '界限值标准',
  `<div class="qcr-bounds-wrap">${colHead}<div class="qcr-bounds-list">${itemsHtml}</div></div>`,
  '',
  'qcr-threshold-card',
  'shield'
 );
}

// 2. 左下方独立面板 A：【要素缺测清单】（统一驾驶舱清单样式：无条数标识，全部入口置于底部）
function qcrMissingCard(){
 const { allMissing } = qcrIssueData();
 const items = allMissing;

 const renderMissingItem = (item, idx) => {
  const idxStr = String(idx + 1).padStart(2, '0');
  return `
   <button type="button" class="qcr-issue-item is-missing" onclick="qcrOpenIssueModal('${item.id}')">
    <div class="qcr-issue-row1">
     <span class="qcr-issue-idx">${idxStr}</span>
     <span class="qcr-elem-badge badge-missing">${item.element}</span>
     <strong class="qcr-issue-dev" title="${esc(item.deviceName)}">${esc(item.deviceName)}</strong>
     <time class="qcr-issue-time">${item.time}</time>
    </div>
    <div class="qcr-issue-row2">
     <div class="qcr-issue-left">
      <span class="qcr-issue-station">${esc(item.stationName)}</span>
      <span class="qcr-issue-prov">${esc(item.prov)}</span>
     </div>
     <b class="qcr-issue-val val-missing">${item.duration}</b>
    </div>
   </button>
  `;
 };

 const trackHtml = items.length 
  ? `<div class="qcr-auto-scroll-list qcr-missing-scroll" tabindex="0" role="region" aria-label="要素缺测清单"><div class="qcr-issue-track track-1">${items.map(renderMissingItem).join('')}</div><div class="qcr-issue-track track-2" aria-hidden="true">${items.map(renderMissingItem).join('')}</div></div>`
  : dsEmpty('当前范围无缺测异常');

 const footHtml = `<div class="qco-problem-foot"><button type="button" class="qco-prob-all-btn" onclick="qcrOpenAllMissingModal()">全部${icon('chevron')}</button></div>`;

 return dsCard('要素缺测清单', trackHtml + footHtml, '', 'qcr-missing-card', 'activity');
}

// 3. 左下方独立面板 B：【要素超限清单】（统一驾驶舱清单样式：无条数标识，全部入口置于底部）
function qcrOverlimitCard(){
 const { allOverlimit } = qcrIssueData();
 const items = allOverlimit;

 const renderOverlimitItem = (item, idx) => {
  const idxStr = String(idx + 1).padStart(2, '0');
  return `
   <button type="button" class="qcr-issue-item is-overlimit" onclick="qcrOpenIssueModal('${item.id}')">
    <div class="qcr-issue-row1">
     <span class="qcr-issue-idx">${idxStr}</span>
     <span class="qcr-elem-badge badge-overlimit">${item.element}</span>
     <strong class="qcr-issue-dev" title="${esc(item.deviceName)}">${esc(item.deviceName)}</strong>
     <time class="qcr-issue-time">${item.time}</time>
    </div>
    <div class="qcr-issue-row2">
     <div class="qcr-issue-left">
      <span class="qcr-issue-station">${esc(item.stationName)}</span>
      <span class="qcr-issue-prov">${esc(item.prov)}</span>
     </div>
     <div class="qcr-issue-right">
      <span class="qcr-issue-limit">${item.limit}</span>
      <b class="qcr-issue-val val-overlimit">${item.val}</b>
     </div>
    </div>
   </button>
  `;
 };

 const trackHtml = items.length 
  ? `<div class="qcr-auto-scroll-list qcr-overlimit-scroll" tabindex="0" role="region" aria-label="要素超限清单"><div class="qcr-issue-track track-1">${items.map(renderOverlimitItem).join('')}</div><div class="qcr-issue-track track-2" aria-hidden="true">${items.map(renderOverlimitItem).join('')}</div></div>`
  : dsEmpty('当前范围无超限异常');

 const footHtml = `<div class="qco-problem-foot"><button type="button" class="qco-prob-all-btn" onclick="qcrOpenAllOverlimitModal()">全部${icon('chevron')}</button></div>`;

 return dsCard('要素超限清单', trackHtml + footHtml, '', 'qcr-overlimit-card', 'alert');
}

// 4. 右下方：【快速质控趋势】
function qcrTrendCard(){
 return dsCard(
  '快速质控趋势',
  `<div class="qco-trend-chart dashboard-echart" data-dashboard-chart="rapid-trend" role="img" aria-label="${S.scope} ${S.period} S2快速质控趋势"></div><div class="qcc-chart-legend qcr-trend-legend"><span><i style="background:#36b3d9"></i>格式正确率</span><span><i style="background:#8e9dfa"></i>要素完整率</span><span><i style="background:#1fc79a"></i>S2质控通过率</span></div>`,
  S.period,
  'qco-trend-card qcr-trend-card',
  'chart'
 );
}

function qccResults(){
 return dsColumns(
  qcrMissingCard() + qcrOverlimitCard(),
  qcrThresholdCard(),
  qcrTrendCard()
 );
}
// legacy qccResults removed
function _dummyResults(){return '';}
function _unused_old(){ return; /*
 const rows=qccMethodRows(),all=qccRows(),methods=qccVisibleMethods(),counts=methods.map(m=>[m.n,all.filter(r=>r.methods.includes(m.id)&&[2,3,4].includes(r.flag)).length]);
 const selected=rows.find(r=>r.id===S.qccResult)||rows[0],method=QCC_METHOD[S.qccMethod];
 const city={};rows.forEach(r=>{const n=station(r.station).n.replace(/站$/,'');city[n]=(city[n]||0)+1;});const cities=Object.entries(city).sort((a,b)=>b[1]-a[1]).slice(0,8);
 const list=rows.slice(S.qccPage*12,(S.qccPage+1)*12);
 return dsColumns(
  dsCard(S.tab==='province'?'关联分析方法':'快速检查方法',`<div class="qcc-methods"><button class="${S.qccMethod==='all'?'active':''}" aria-pressed="${S.qccMethod==='all'}" onclick="qccSetMethod('all')"><span>全部样本</span><b>${num(all.length)}</b></button>${methods.map(m=>`<button class="${S.qccMethod===m.id?'active':''}" aria-pressed="${S.qccMethod===m.id}" onclick="qccSetMethod('${m.id}')"><span>${m.n}</span><b>${num(all.filter(r=>r.methods.includes(m.id)).length)}</b></button>`).join('')}</div>`+(S.tab==='province'?qccAction('关联分析逻辑','qcoProvinceLogic()'):qccAction('进入省级关联分析',"changeTab('province')")),`${methods.length}类方法 · 可交叉命中`,'','layers')+
  dsCard('标识与要素构成',qccSegments([['flags','标识构成'],['elements','要素构成'],['cities','地市排行']],S.qccDistribution,'qccSetDistribution')+(S.qccDistribution==='flags'?qccFlagBreakdown(rows):S.qccDistribution==='elements'?qccRank(QC_REFERENCE.ELS.map(e=>[e.n,rows.filter(r=>r.element===e.k).length]),Math.max(1,...QC_REFERENCE.ELS.map(e=>rows.filter(r=>r.element===e.k).length))):qccRank(cities,Math.max(1,...cities.map(x=>x[1])))),`当前结果 ${num(rows.length)} 条`,'','chart'),
  dsCard('方法详情',`<h4 class="qcc-selected-title">${method?method.n:'综合方法视图'}</h4>`+qccInfo([['方法说明',method?esc(method.ex):'按方法与质量标识交叉查询'],['规则编号',method?'QC-'+method.id.toUpperCase()+'-DEMO':'多方法'],['适用对象','8类地面要素'],['结果条数',num(rows.length)+' 条']])+(selected?`<div class="qcc-selected-record">${qccFlag(selected.flag)}<b>${station(selected.station).n} · ${QCC_ELEMENT[selected.element].n}</b><span>${selected.time} · 原值 ${qccValue(selected.value)} ${QCC_ELEMENT[selected.element].u}</span>${selected.corrected!=null?`<span>订正值 ${qccValue(selected.corrected)} ${QCC_ELEMENT[selected.element].u}</span>`:''}${qccAction('查看样本与证据',`qccOpenObservation('${selected.id}')`)}</div>`:''),'附件方法分类','','shield')+
  dsCard('质控结果明细',`<div class="qcc-inline-tools"><input class="qcc-input" aria-label="搜索质控结果" placeholder="站点 / 要素 / 记录编号，回车查询" value="${esc(S.qccSearch)}" onkeydown="if(event.key==='Enter'){event.preventDefault();qccSearchResults(this.value)}" onchange="qccSearchResults(this.value)"><button onclick="qccExportResults()">导出</button></div><div class="qcc-result-list">${list.map(r=>`<button class="${(selected?.id)===r.id?'selected':''}" onclick="qccSelectResult('${r.id}')"><span><b>${station(r.station).n}</b><small>${r.time} · ${QCC_ELEMENT[r.element].n}</small><em>${qccValue(r.value)} ${QCC_ELEMENT[r.element].u}${r.corrected!=null?' → '+qccValue(r.corrected):''}</em></span>${qccFlag(r.flag)}</button>`).join('')||dsEmpty('该方法与标识组合暂无结果')}</div><div class="qcc-pagination"><button onclick="qccResultPage(-1)" ${S.qccPage===0?'disabled':''}>上一页</button><span>${S.qccPage+1} / ${Math.max(1,Math.ceil(rows.length/12))}</span><button onclick="qccResultPage(1)" ${(S.qccPage+1)*12>=rows.length?'disabled':''}>下一页</button></div>`,`${num(rows.length)} 条 · 点击定位`,'','file')+
  dsCard('示例阈值配置',qccTable(['要素 / 单位','下限','上限'],QC_REFERENCE.ELS.map(e=>[`${e.n}<small>${e.u}</small>`,e.lo,e.hi]))+qccNote('附件演示参数，只读；投产前需业务核定。'),'附件量程','','settings'),
  dsCard('方法异常命中分布',qccChart({series:[{name:'异常命中',color:'#81d5eb',values:counts.map(x=>x[1])}],labels:methods.map(m=>m.n.replace('检查','').replace('一致性','一致')),min:0,unit:'条',bars:true}),'允许同一条样本被多个方法命中')
 );
}

*/ }

function qccFix(){
 const e=qccIssue();if(!e)return dsColumns(dsCard('待处置问题',dsEmpty()),dsCard('订正处置',dsEmpty('当前窗口无可处置问题')),dsCard('处置记录',dsEmpty()));
 const st=station(e.station),ob=qccIssueObservation(e),element=QC_REFERENCE.ELS.find(x=>x.n===st.element),edit=qccJournal[e.id],raw=ob?.value??(e.type==='缺测'?null:Number(e.value)),reference=Number(e.reference);
 const elementRows=QC_REFERENCE.ELS.map(el=>{const r=qccRows().find(r=>r.station===st.id&&r.element===el.k&&r.day===0&&r.hour===16);return[el.n,`${qccValue(r?.value)} ${el.u}`,qccFlag(r?.flag??0),r?.corrected!=null?qccValue(r.corrected):'—'];});
 const labels=Array.from({length:13},(_,i)=>`${10+Math.floor(i/2)}:${i%2?'30':'00'}`),observed=labels.map((_,i)=>raw==null?reference:(e.type==='持续性异常'?raw:reference+(raw-reference)*i/12));
 const series=[{name:'原始观测',color:'#83d8ed',values:observed},{name:'同步参考',color:'#e6d28f',values:labels.map((_,i)=>reference+Math.sin(i)*Math.max(.01,Math.abs(reference)*.003)),dash:true}];
 if(edit?.value!=null)series.push({name:'订正后',color:'#bba5ed',values:labels.map(()=>edit.value)});
 return dsColumns(
  dsCard('待处置问题',qccSegments(['全部','待处置','复核中','已订正','已关闭'].map(s=>[s,s]),S.qccFixFilter,'qccSetFixFilter')+qccProblemList(qccIssues()),`${qccIssues().length} 项`,'','tool')+
  dsCard('站点要素数据',qccTable(['要素','原始值','标识','订正值'],elementRows),st.n,'','database'),
  dsCard('当前问题与证据',`<h4 class="qcc-selected-title">${st.n} · ${st.element}</h4>`+qccInfo([['问题编号',e.id],['当前状态',qccIssueStatus(e)],['命中方法',e.type],['原始观测',qccValue(raw)+' '+(element?.u||st.unit)],['同步参考',e.reference+' '+st.unit],['规则依据',e.rule]])+qccNote(e.cause)+qccAction('现场协同与原事件记录',`openEvent('${e.id}')`),'原值始终保留','','shield')+
  dsCard('质控订正处置',`<form class="qcc-fix-form" onsubmit="qccSubmitCorrection(event,'${e.id}');return false"><label>质控结论${typeof dsRenderSelect === 'function' ? dsRenderSelect({id: 'qcc-fix-flag', value: String(edit ? edit.flag : 5), options: [{ value: '5', label: '订正（保留原值，另存订正值）' }, { value: '2', label: '可疑（保留原值）' }, { value: '3', label: '错误（标记不可用）' }, { value: '1', label: '正确（撤销异常标识）' }, { value: '4', label: '缺失（不输出订正数值）' }], ariaLabel: '质控结论'}) : `<select id="qcc-fix-flag"><option value="5" ${!edit||edit.flag===5?'selected':''}>订正（保留原值，另存订正值）</option><option value="2" ${edit?.flag===2?'selected':''}>可疑（保留原值）</option><option value="3" ${edit?.flag===3?'selected':''}>错误（标记不可用）</option><option value="1" ${edit?.flag===1?'selected':''}>正确（撤销异常标识）</option><option value="4" ${edit?.flag===4?'selected':''}>缺失（不输出订正数值）</option></select>`}</label><label>订正方式${typeof dsRenderSelect === 'function' ? dsRenderSelect({id: 'qcc-fix-mode', value: edit?.mode || '邻站插值', options: ['邻站插值','线性插值','实况模式替代','置为缺测','专业复核'], ariaLabel: '订正方式'}) : `<select id="qcc-fix-mode">${['邻站插值','线性插值','实况模式替代','置为缺测','专业复核'].map(n=>`<option ${edit?.mode===n?'selected':''}>${n}</option>`).join('')}</select>`}</label><label>订正值（${element?.u||st.unit}）<input id="qcc-fix-value" type="number" step="any" value="${edit?.value??(Number.isFinite(reference)?reference:'')}" aria-describedby="qcc-fix-error"></label><label>处置说明<textarea id="qcc-fix-note" rows="3" placeholder="填写证据、判断依据与处置说明">${esc(edit?.note||'')}</textarea></label><div id="qcc-fix-error" class="qcc-error" role="alert"></div><div class="qcc-preserve">原始观测保持原值；订正值、标识和版本独立留痕。</div><div class="qcc-button-row"><button class="ds-button primary" type="submit">提交订正</button><button class="ds-button" type="button" onclick="qccCloseIssue('${e.id}')">关闭问题</button></div></form>`,'本机演示记录','','tool')+
  dsCard('处置历史',qccCorrectionHistory(e),qccAction('导出记录',`qccExportCorrection('${e.id}')`),'','clock'),
  dsCard('质控证据链 · '+st.element,qccChart({series,labels,unit:element?.u||st.unit}),qccLegend(series))
 );
}
function qccCorrectionHistory(e){const history=qccJournal[e.id]?.history||[];return `<div class="qcc-history"><div><b>原始事件 ${e.time}</b><span>${esc(e.type)} · ${esc(e.rule)}</span></div>${history.map(h=>`<div><b>${esc(h.time)} · ${esc(h.action)}</b><span>${esc(h.mode||'')} ${h.value!=null?qccValue(h.value):''}</span><p>${esc(h.note||'')}</p></div>`).join('')||'<div><b>待专业复核</b><span>暂无新增订正记录。</span></div>'}</div>`;}

// ==========================================================
// S4 数据订正体系（独立专属页面：右侧单列面板、订正点位分色、订正率趋势）
// ==========================================================

function qccCorrectionListData() {
 const rawList = [
  { id: 'CORR-01', stationId: 'AH-HS-022', stationName: '黄山歙县站', deviceName: '220kV 歙县变', prov: '安徽省', element: '气压', elemKey: 'pres', time: '10-23 11:30', rawVal: '1125.2 hPa', corrVal: '1008.4 hPa', mode: '邻站插值', status: '已订正', operator: '算法自动', diff: '-116.8 hPa', reason: '压阻传感器漂移超上限，选用绩溪变与休宁变插值修复' },
  { id: 'CORR-02', stationId: 'SC-GZ-028', stationName: '甘孜康定站', deviceName: '500kV 甘康线 #128', prov: '四川省', element: '风速', elemKey: 'wspd', time: '10-23 15:42', rawVal: '42.8 m/s', corrVal: '28.6 m/s', mode: '模式替代', status: '已订正', operator: '人工复核', diff: '-14.2 m/s', reason: '峡谷突发畸变尖峰超限，调取高精电网数值模式风场进行平滑替代' },
  { id: 'CORR-03', stationId: 'HN-CS-041', stationName: '长沙望城站', deviceName: '500kV 望城变', prov: '湖南省', element: '相对湿度', elemKey: 'rh', time: '10-23 13:50', rawVal: '103.5 %', corrVal: '92.0 %', mode: '物理限幅', status: '已订正', operator: '算法自动', diff: '-11.5 %', reason: '湿敏电容凝露短路溢出，结合干球温度饱和露点约束反推限幅' },
  { id: 'CORR-04', stationId: 'HB-WH-087', stationName: '武汉江夏站', deviceName: '220kV 江夏变', prov: '湖北省', element: '气温', elemKey: 'temp', time: '10-23 14:15', rawVal: '44.5 ℃', corrVal: '36.8 ℃', mode: '时序平滑', status: '已订正', operator: '人工复核', diff: '-7.7 ℃', reason: '变电区地表局地热辐射畸变，采用前后连续三时次三次样条滤波' },
  { id: 'CORR-05', stationId: 'JS-YC-066', stationName: '盐城滨海站', deviceName: '500kV 滨海线 #076', prov: '江苏省', element: '雨量', elemKey: 'rain', time: '10-23 10:40', rawVal: '278.4 mm', corrVal: '64.8 mm', mode: '雷达反演', status: '已订正', operator: '算法自动', diff: '-213.6 mm', reason: '翻斗脉冲计数偶发倍频，结合双偏振多普勒雷达定量降水估算校正' },
  { id: 'CORR-06', stationId: 'ZJ-HZ-013', stationName: '杭州余杭站', deviceName: '500kV 余杭变', prov: '浙江省', element: '大气电场', elemKey: 'efld', time: '10-23 15:20', rawVal: '62.4 kV/m', corrVal: '38.5 kV/m', mode: '多源融合', status: '已订正', operator: '算法自动', diff: '-23.9 kV/m', reason: '地网工频电场干扰，扣除背景底噪与参考站协同去噪' },
  { id: 'CORR-07', stationId: 'HA-LY-031', stationName: '洛阳栾川站', deviceName: '500kV 栾川线 #091', prov: '河南省', element: '总辐射', elemKey: 'rad', time: '10-23 09:15', rawVal: '1420 W/m²', corrVal: '980 W/m²', mode: '晴空衰减', status: '已订正', operator: '人工复核', diff: '-440 W/m²', reason: '强云隙聚焦瞬态尖峰，引入天文太阳高度角晴空包络线修正' },
  { id: 'CORR-08', stationId: 'SX-YC-002', stationName: '运城永济站', deviceName: '500kV 永济变', prov: '山西省', element: '风向', elemKey: 'wdir', time: '10-23 08:05', rawVal: '372 °', corrVal: '12 °', mode: '角度规约', status: '已订正', operator: '算法自动', diff: '-360 °', reason: '编码器方位零点越界，根据圆周周期模约束进行角度规约' }
 ];
 if (S.scope !== '全国') {
  return rawList.filter(item => item.prov === S.scope);
 }
 return rawList;
}

// 1. 订正数量/率卡片（2*2 紧凑精致网格）
function qccCorrectionKpisCard() {
 const r = stats();
 const s4Data = (typeof qcoStageBadgesData === 'function') ? qcoStageBadgesData() : null;
 const s4In = s4Data ? s4Data.s4In : 30300;
 const s4Corr = s4Data ? s4Data.s4Corrected : 30100;
 const s4Rate = s4Data ? s4Data.s4Rate : '99.28';

 return `
  <section class="ds-card qcc-correction-kpis-card">
   <header class="ds-card-head">
    <h3>${icon('tool')}订正指标概览</h3>
    <div class="ds-card-extra">${S.scope} · ${S.period}</div>
   </header>
   <div class="ds-card-body">
    <div class="qcc-corr-kpis-grid">
     <div class="qcc-corr-kpi">
      <div class="qcc-corr-kpi-head"><span>接入数据</span></div>
      <div class="qcc-corr-kpi-val" style="color:#7ee6fa">${(s4In/10000).toFixed(2)}<em>万条</em></div>
      <div class="qcc-corr-kpi-sub">基准总量 ${num(s4In)}</div>
      <div class="qcc-corr-kpi-bar"><i style="width:100%;background:#36b3d9"></i></div>
     </div>
     <div class="qcc-corr-kpi">
      <div class="qcc-corr-kpi-head"><span>已订正数</span></div>
      <div class="qcc-corr-kpi-val" style="color:#1fc79a">${(s4Corr/10000).toFixed(2)}<em>万条</em></div>
      <div class="qcc-corr-kpi-sub">闭环执行 ${num(s4Corr)}</div>
      <div class="qcc-corr-kpi-bar"><i style="width:${s4Rate}%;background:#1fc79a"></i></div>
     </div>
     <div class="qcc-corr-kpi is-highlight">
      <div class="qcc-corr-kpi-head"><span style="color:#1fc79a">● 订正率</span><b class="qcc-corr-badge">${s4Rate}%</b></div>
      <div class="qcc-corr-kpi-val" style="color:#1fc79a">${s4Rate}<em>%</em></div>
      <div class="qcc-corr-kpi-sub">闭环达标率 100%</div>
      <div class="qcc-corr-kpi-bar"><i style="width:${s4Rate}%;background:#1fc79a;box-shadow:0 0 6px #1fc79a88"></i></div>
     </div>
     <div class="qcc-corr-kpi">
      <div class="qcc-corr-kpi-head"><span style="color:#f0ad4e">◆ 人机协同</span></div>
      <div class="qcc-corr-kpi-val" style="color:#f0ad4e">28<em>条</em></div>
      <div class="qcc-corr-kpi-sub">待处置复核 0 项</div>
      <div class="qcc-corr-kpi-bar"><i style="width:92%;background:#f0ad4e"></i></div>
     </div>
    </div>
   </div>
  </section>
 `;
}

// 2. 订正清单（与驾驶舱、S2/S3一致：无条数标识，底部全部入口，自动无缝滚动）
function qccCorrectionListCard() {
 const items = qccCorrectionListData();
 const renderItem = (item, idx) => {
  const idxStr = String(idx + 1).padStart(2, '0');
  return `
   <button type="button" class="qcr-issue-item is-corrected" onclick="qccOpenCorrectionModal('${item.id}')">
    <div class="qcr-issue-row1">
     <span class="qcr-issue-idx">${idxStr}</span>
     <span class="qcr-elem-badge badge-corrected" style="background:#133c3a;color:#5de4bf;border:1px solid #1fc79a55">${item.element}</span>
     <strong class="qcr-issue-dev" title="${esc(item.deviceName)}">${esc(item.deviceName)}</strong>
     <time class="qcr-issue-time">${item.time}</time>
    </div>
    <div class="qcr-issue-row2">
     <div class="qcr-issue-left">
      <span class="qcr-issue-station">${esc(item.stationName)}</span>
      <span class="qcr-issue-prov">${esc(item.prov)}</span>
     </div>
     <div class="qcr-issue-right">
      <span class="qcr-issue-limit" style="color:#8bb4cb">${item.mode}</span>
      <b class="qcr-issue-val" style="color:#1fc79a">${item.rawVal} → ${item.corrVal}</b>
     </div>
    </div>
   </button>
  `;
 };

 const trackHtml = items.length
  ? `<div class="qcr-auto-scroll-list qcc-corr-scroll" tabindex="0" role="region" aria-label="数据订正清单"><div class="qcr-issue-track track-1">${items.map(renderItem).join('')}</div><div class="qcr-issue-track track-2" aria-hidden="true">${items.map(renderItem).join('')}</div></div>`
  : dsEmpty('当前范围暂无订正记录');

 const footHtml = `<div class="qco-problem-foot"><button type="button" class="qco-prob-all-btn" onclick="qccOpenAllCorrectionsModal()">全部${icon('chevron')}</button></div>`;

 return dsCard('数据订正清单', trackHtml + footHtml, '', 'qcc-correction-list-card', 'check-circle');
}

// 3. 订正率趋势图卡片
function qccCorrectionTrendCard() {
 return dsCard(
  '数据订正率趋势',
  `<div class="qco-trend-chart dashboard-echart" data-dashboard-chart="correction-trend" role="img" aria-label="${S.scope} ${S.period} 数据订正率趋势"></div><div class="qcc-chart-legend qcc-corr-legend"><span><i style="background:#1fc79a"></i>订正率</span><span><i style="background:#36b3d9"></i>接入量</span></div>`,
  S.period,
  'qco-trend-card qcc-correction-trend-card',
  'chart'
 );
}

// 4. 订正弹窗与留痕详情
function qccOpenCorrectionModal(id) {
 const item = qccCorrectionListData().find(x => x.id === id);
 if (!item) return;
 S.detail = null;
 const title = `数据订正留痕 · ${item.deviceName}`;
 const infoPairs = [
  ['装置线路', item.deviceName],
  ['所在站址', `${item.stationName} (${item.prov})`],
  ['监测要素', item.element],
  ['订正时次', item.time],
  ['原始观测值', item.rawVal],
  ['最终订正值', item.corrVal],
  ['数值偏差校正', item.diff],
  ['订正方式', item.mode],
  ['执行主体', item.operator],
  ['状态标识', '已闭环（原值始终归档保留）'],
  ['算法逻辑与依据', item.reason]
 ];
 coreOpenModal(title, qccInfo(infoPairs) + qccNote('电力气象数据订正执行《电网微气象观测数据订正与修复规范》，原始观测记录完好存档，订正数值与算法参数独立版本留痕。'));
}

function qccOpenAllCorrectionsModal() {
 S.detail = null;
 const items = qccCorrectionListData();
 const rows = items.map(item => [
  item.time,
  `${item.stationName}<br><small style="color:#7fb5cc">${item.deviceName}</small>`,
  `<span class="ds-tag" style="background:#1b4a45;color:#67e3bb">${item.element}</span>`,
  `<s style="color:#ee5a52">${item.rawVal}</s> → <b style="color:#1fc79a">${item.corrVal}</b>`,
  item.mode,
  item.operator,
  `<span class="ds-tag green">${item.status}</span>`
 ]);
 coreOpenModal(
  `全量数据订正清单 · ${S.scope} (${S.period})`,
  qccTable(['订正时次', '站点/线路', '要素', '原始值 → 订正值', '订正方式', '执行人', '状态'], rows) +
  qccNote('全量订正记录由S4数据订正管道自动汇聚，支持逐条追溯原始报文与关联算法执行快照。')
 );
}

// 5. S4 数据订正整页渲染函数
function qccCorrectionPage() {
 return `
  <div class="ds-correction-panel">
   ${qccCorrectionKpisCard()}
   ${qccCorrectionListCard()}
   ${qccCorrectionTrendCard()}
  </div>
 `;
}

function qccEvalData(){
 const seed=qccHash(S.scope),labels=Array.from({length:14},(_,i)=>`10-${String(i+10).padStart(2,'0')}`);
 const obs=labels.map((_,i)=>1004+Math.sin(i/2.7)*2.4+((seed+i*17)%13)/30),model=obs.map((v,i)=>v+.32+Math.cos(i*.8)*.44);
 const bias=obs.reduce((a,v,i)=>a+v-model[i],0)/obs.length,rmse=Math.sqrt(obs.reduce((a,v,i)=>a+(v-model[i])**2,0)/obs.length);
 return{labels,obs,model,bias,rmse};
}
// ==========================================================
// S4 评估体系核心四大面板（严格匹配用户截图与优中差等级统计）
// ==========================================================

// 1. 顶部：优中差评估统计 KPI
function qceEvalStatsKpis(){
 const c = (typeof networkEvalCounts === 'function') ? networkEvalCounts() : { all: 650, excellent: 520, medium: 98, poor: 32 };
 const all = c.all || 650;
 const pExc = (c.excellent / all * 100).toFixed(1);
 const pMed = (c.medium / all * 100).toFixed(1);
 const pPoor = (c.poor / all * 100).toFixed(1);

 return `
  <div class="ds-kpis ds-eval-kpis">
   <div class="ds-kpi ds-kpi-eval is-score">
    <div class="ds-kpi-label">综合评分<button aria-label="查看评分口径" onclick="qccShowScope()">${icon('info')}</button></div>
    <div class="ds-kpi-value" style="color:#7ee6fa">92.7<em>分</em></div>
    <div class="ds-kpi-note"><span class="qca-rate-label">评估等级</span><b class="qca-rate-badge good">优良</b></div>
   </div>
   <div class="ds-kpi ds-kpi-eval is-exc" onclick="filterNetwork('excellent')" title="点击过滤【优】等级站点">
    <div class="ds-kpi-label"><span style="color:#1fc79a">● 优 (>=95%)</span><span class="qce-kpi-pct">${pExc}%</span></div>
    <div class="ds-kpi-value" style="color:#1fc79a">${num(c.excellent)}<em>台</em></div>
    <div class="qcr-step-bar"><i style="width:${pExc}%;background:#1fc79a;box-shadow:0 0 6px #1fc79a88"></i></div>
   </div>
   <div class="ds-kpi ds-kpi-eval is-med" onclick="filterNetwork('medium')" title="点击过滤【中】等级站点">
    <div class="ds-kpi-label"><span style="color:#f0ad4e">◆ 中 (90~95%)</span><span class="qce-kpi-pct">${pMed}%</span></div>
    <div class="ds-kpi-value" style="color:#f0ad4e">${num(c.medium)}<em>台</em></div>
    <div class="qcr-step-bar"><i style="width:${pMed}%;background:#f0ad4e;box-shadow:0 0 6px #f0ad4e88"></i></div>
   </div>
   <div class="ds-kpi ds-kpi-eval is-poor" onclick="filterNetwork('poor')" title="点击过滤【差】等级站点">
    <div class="ds-kpi-label"><span style="color:#ee5a52">▲ 差 (<90%)</span><span class="qce-kpi-pct">${pPoor}%</span></div>
    <div class="ds-kpi-value" style="color:#ee5a52">${num(c.poor)}<em>台</em></div>
    <div class="qcr-step-bar"><i style="width:${pPoor}%;background:#ee5a52;box-shadow:0 0 6px #ee5a5288"></i></div>
   </div>
  </div>
 `;
}

// 2. 面板 1：评估指标面板（单列雅致指标列表）
function qceMetricsCard(){
 const scopeName = S.scope === '全国' ? '安徽省' : S.scope;
 const curElem = S.element || '气压';
 const elemUnit = curElem === '气压' ? 'hPa' : (curElem === '温度' ? '℃' : (curElem === '湿度' ? '%' : (curElem === '风速' ? 'm/s' : (curElem === '雨量' ? 'mm' : (curElem === '辐照' ? 'W/m²' : (curElem === '大气电场' ? 'kV/m' : ''))))));
 const metrics = [
  { label: '评估装置', val: '650', unit: '台', color: '#daf0fa' },
  { label: '评估样本', val: '12.86', unit: '万条', color: '#daf0fa' },
  { label: '数据可用率', val: '96.4%', unit: '', color: '#1fc79a' },
  { label: '观测-模式偏差', val: '0.42', unit: elemUnit, color: '#f0ad4e' },
  { label: '相关系数', val: '0.982', unit: '', color: '#7ee6fa' },
  { label: '综合评分', val: '92.7', unit: '', color: '#1fc79a', isTotal: true }
 ];

 const rowsHtml = metrics.map(m => `
  <div class="qce-metric-row ${m.isTotal ? 'is-total' : ''}">
   <span class="qce-row-lbl">${m.label}</span>
   <div class="qce-row-val" style="color:${m.color}">
    <b>${m.val}</b>
    ${m.unit ? `<em>${m.unit}</em>` : ''}
   </div>
  </div>
 `).join('');

 return dsCard(
  '评估指标',
  `<div class="qce-metrics-list">${rowsHtml}</div>`,
  scopeName,
  'qce-metrics-card',
  'chart'
 );
}

// 3. 面板 3（截图 1）：实况—模式偏差时序
function qceObsModelTrendCard(){
 const curElem = S.element || '气压';
 const elemUnit = curElem === '气压' ? 'hPa' : (curElem === '温度' ? '℃' : (curElem === '湿度' ? '%' : (curElem === '风速' ? 'm/s' : (curElem === '雨量' ? 'mm' : (curElem === '辐照' ? 'W/m²' : (curElem === '大气电场' ? 'kV/m' : ''))))));
 return dsCard(
  '实况—模式偏差时序',
  `<div class="dashboard-echart qce-echart" data-dashboard-chart="obs-model-trend" role="img" aria-label="${curElem}实况—模式偏差时序"></div><div class="qce-chart-subnote">${curElem} ${elemUnit ? elemUnit + ' · ' : ''}日均值序列（实线为观测、虚线为模式）</div>`,
  curElem,
  'qce-trend-card qce-obsmodel-card',
  'activity'
 );
}

// 4. 面板 4（截图 2）：偏差绝对值
function qceBiasBarCard(){
 return dsCard(
  '偏差绝对值',
  `<div class="dashboard-echart qce-echart" data-dashboard-chart="bias-bar-trend" role="img" aria-label="偏差绝对值柱状图"></div><div class="qce-chart-subnote">偏差绝对值 · 虚线为标准线 1.2 hPa</div>`,
  '标准线 1.2 hPa',
  'qce-trend-card qce-biasbar-card',
  'chart'
 );
}

function qccEvaluation(){
 return dsColumns(
  qceObsModelTrendCard(),
  qceMetricsCard(),
  qceBiasBarCard()
 );
}
function _old_qccEvaluation(){ return; /*
 const data=qccEvalData(),mode=S.qccEval,rows=qccRows(),flags=qccFlags(rows),score=rows.length?(flags[1]+flags[5])/rows.length*100:0;
 const evalRows=QC_REFERENCE.ELS.map((el,i)=>{const scale={pres:.6,temp:.8,rh:2.1,wdir:6.4,wspd:.9,rain:.4,rad:12,efld:1.2}[el.k],bias=((qccHash(S.scope+el.k)%101)/100-.5)*scale,rmse=Math.abs(bias)+scale*.4,cor=.986-i*.006;return{el,bias,rmse,cor};});
 const warnings=[['大风预警',286,264],['覆冰预警',124,119],['舞动预警',86,72],['暴雨预警',198,186],['雷电预警',342,318]];
 const cases=QC_REFERENCE.WEATHER_CASES.map((c,i)=>({...c,n:['沿海台风过程（演示）','江淮强对流过程（演示）','苏北暴雨过程（演示）','皖南覆冰过程（演示）','豫北舞动过程（演示）'][i]})).filter(c=>S.scope==='全国'||c.provs.some(p=>S.scope.startsWith(p))),selected=cases[S.qccCase]||cases[0];
 let detail,metrics,conclusion,chartSeries,chartLabels=data.labels,unit='hPa',title;
 if(mode==='model'){
  metrics=[['比对样本',num(rows.length)+' 条'],['平均偏差',qccValue(data.bias)+' hPa'],['均方根误差',qccValue(data.rmse)+' hPa'],['相关系数','0.982（演示）']];
  detail=qccTable(['时次','观测 / hPa','模式 / hPa','偏差'],data.labels.map((l,i)=>[l,qccValue(data.obs[i]),qccValue(data.model[i]),qccValue(data.obs[i]-data.model[i])]));
  conclusion='根据本机示例序列计算偏差与RMSE。正式可用性判定需业务审核，不自动替代实测数据。';title='实况—模式偏差时序';chartSeries=[{name:'观测',color:'#83d9ee',values:data.obs},{name:'模式',color:'#dfd08d',values:data.model,dash:true}];
 }else if(mode==='meteo'){
  metrics=[['评估要素','8 类'],['比对一致',evalRows.filter(r=>r.cor>=.95).length+' 类（演示）'],['基准来源','同期参考观测样本'],['样本范围',S.scope]];
  detail=qccTable(['要素 / 单位','偏差','RMSE','相关系数','结论'],evalRows.map(r=>[r.el.n+`<small>${r.el.u}</small>`,qccValue(r.bias),qccValue(r.rmse),r.cor.toFixed(3),dsTag(r.cor>=.95?'可参考':'继续比对',r.cor>=.95?'green':'amber')]));
  conclusion='逐要素比较偏差、RMSE与相关性；不同要素保持独立量纲。当前数据为演示样本。';title='气象部门观测比对 · 相关性';chartLabels=evalRows.map(r=>r.el.n);unit='相关系数';chartSeries=[{name:'相关系数',color:'#8dd4ed',values:evalRows.map(r=>r.cor)}];
 }else if(mode==='warn'){
  const total=warnings.reduce((a,r)=>a+r[1],0),hit=warnings.reduce((a,r)=>a+r[2],0);
  metrics=[['预警触发',num(total)+' 次'],['观测印证',num(hit)+' 次'],['预警命中率',pct(hit,total)+'%'],['平均提前量','47 min（演示）']];
  detail=qccTable(['预警类型','触发','印证','命中率'],warnings.map(r=>[r[0],r[1],r[2],pct(r[2],r[1])+'%']));conclusion='大风、覆冰和暴雨的演示印证率较高，舞动场景需补充观测密度；不代表实际预警绩效。';title='电网气象预警支撑效果';unit='%';chartLabels=warnings.map(r=>r[0].replace('预警',''));chartSeries=[{name:'命中率',color:'#8ddcc4',values:warnings.map(r=>r[2]/r[1]*100)}];
 }else{
  metrics=selected?[['过程类型',selected.type],['涉及装置',selected.dev+' 台（演示）'],['告警样本',selected.alarm+' 条'],['捕获率',selected.cap.toFixed(1)+'%']]:[['当前范围',S.scope],['过程样本','暂无'],['涉及装置','—'],['捕获率','—']];
  detail=cases.length?`<div class="qcc-case-list">${cases.map((c,i)=>`<button class="${i===S.qccCase?'active':''}" onclick="qccSelectCase(${i})"><span><b>${c.n}</b><small>${c.t} · ${c.provs.join('、')}</small></span><em>${c.cap}%</em></button>`).join('')}</div>`:dsEmpty('当前范围暂无附件天气过程样本');
  conclusion='附件天气案例以演示过程呈现，可比较装置捕获率与观测缺口，案例名称和数值不作为实际天气事件认定。';title=(selected?.type||'天气')+'过程捕获情况（演示）';unit='%';chartLabels=cases.map(c=>c.type);chartSeries=[{name:'捕获率',color:'#b3a4e9',values:cases.map(c=>c.cap)}];
 }
 S.qccEvalMetrics=metrics;
 return dsColumns(
  dsCard('数据评估维度',qccSegments(QC_REFERENCE.EVAL_TABS.map(t=>[t.id,t.n]),mode,'qccSetEval')+qccNote('按照附件四类评估场景组织。范围、时段与当前站点样本保持联动。')+qccAction('预览评估报告','qccPreviewEvaluation()',true),'四类评估','','chart')+
  dsCard(mode==='weather'?'强天气过程回溯':'评估数据明细',detail,'附件场景 · 本机演示','','file'),
  dsCard('评估指标',`<h4 class="qcc-selected-title">${QC_REFERENCE.EVAL_TABS.find(t=>t.id===mode).n}</h4>`+qccInfo(metrics)+qccNote(conclusion),'当前范围 '+S.scope,'','shield')+
  dsCard('可用性与评估结论',qccFlagBreakdown(rows)+qccInfo([['样本正确及订正占比',score.toFixed(2)+'%'],['数据可用率',pct(stats().valid,stats().expected)+'%'],['判定依据','样本 / 参考 / 业务审核']])+qccAction('下载评估摘要','qccExportEvaluation()')+qccNote('样本标识占比与全量数据可用率分别统计，禁止直接混用。'),'分母与量纲独立','','book'),
  dsCard(title,qccChart({series:chartSeries,labels:chartLabels,unit,min:mode==='meteo'?.9:undefined,max:mode==='meteo'?1:undefined}),qccLegend(chartSeries))
 );
}

*/ }

function qccSystem(){return S.qccSystem==='ledger'?qccDeviceLedger():qccAlgorithmPage();}
function qccSystemNav(){return qccSegments([['algo','算法管理'],['ledger','电网设备台账']],S.qccSystem,'qccSetSystem')+qccNote('系统配置作用于本机演示，历史观测与已发布快照不被重算。');}
function qccAlgorithmPage(){
 const current=qccAlgorithms.find(a=>a.id===S.qccAlgo)||qccAlgorithms[0],filter=qccAlgorithms.filter(a=>!S.qccSearch||(a.n+a.id).includes(S.qccSearch));
 const counts=Array.from({length:7},(_,i)=>qccRows().filter(r=>r.day===6-i&&r.methods.includes(current.method)).length);
 return dsColumns(
  dsCard('系统管理分类',qccSystemNav()+qccInfo([['注册算法',qccAlgorithms.length+' 个'],['运行中',qccAlgorithms.filter(a=>a.st==='运行中').length+' 个'],['配置保存','当前浏览器']]),'算法 / 台账','','settings')+
  dsCard('执行日志与版本',`<div class="qcc-history"><div><b>快照 2026-10-23 16:40</b><span>方法结果按附件规则类别关联展示。</span></div>${(current.logs||[]).map(l=>`<div><b>${esc(l.time)}</b><span>${esc(l.text)}</span></div>`).join('')||'<div><b>待运行配置</b><span>尚无本机配置变更记录。</span></div>'}</div>`+qccInfo([['当前版本','v'+esc(current.ver)],['部署位置',esc(current.cat)],['研发单位',esc(current.own)]])+qccAction('样本验证',`qccTrialAlgorithm('${current.id}')`),'本机变更留痕','','clock'),
  dsCard('算法清单',`<div class="qcc-inline-tools"><input class="qcc-input" aria-label="搜索算法" placeholder="算法名称 / 编号，回车查询" value="${esc(S.qccSearch)}" onkeydown="if(event.key==='Enter'){event.preventDefault();qccSystemSearch(this.value)}" onchange="qccSystemSearch(this.value)"><button onclick="qccRegisterAlgorithm()">注册算法</button></div><div class="qcc-algo-list">${filter.map(a=>`<button class="${a.id===current.id?'selected':''}" onclick="qccSelectAlgorithm('${a.id}')"><span><b>${esc(a.n)}</b><small>${esc(a.id)} · v${esc(a.ver)}</small><em>${esc(a.freq)} · ${esc(a.cat)}</em></span>${dsTag(a.st,a.st==='运行中'?'green':'')}</button>`).join('')||dsEmpty('没有匹配算法')}</div>`,`${filter.length} 个`,'','layers')+
  dsCard('算法配置',`<h4 class="qcc-selected-title">${esc(current.n)}</h4>`+qccInfo([['算法编号',esc(current.id)],['当前状态',dsTag(current.st,current.st==='运行中'?'green':'')]])+`<form class="qcc-form" onsubmit="qccSaveAlgorithm(event,'${current.id}');return false"><label>执行频率${typeof dsRenderSelect === 'function' ? dsRenderSelect({id: 'qcc-algo-frequency', value: current.freq || '10 分钟', options: ['5 分钟','10 分钟','30 分钟','1 小时','6 小时','每日'], ariaLabel: '执行频率'}) : `<select id="qcc-algo-frequency">${['5 分钟','10 分钟','30 分钟','1 小时','6 小时','每日'].map(f=>`<option ${current.freq===f?'selected':''}>${f}</option>`).join('')}</select>`}</label><label>版本号<input id="qcc-algo-version" value="${esc(current.ver)}" required maxlength="30"></label><label>适用方法${typeof dsRenderSelect === 'function' ? dsRenderSelect({id: 'qcc-algo-method', value: current.method || 'range', options: QC_REFERENCE.METHODS.map(m=>({value:m.id, label:m.n})), ariaLabel: '适用方法'}) : `<select id="qcc-algo-method">${QC_REFERENCE.METHODS.map(m=>`<option value="${m.id}" ${m.id===current.method?'selected':''}>${m.n}</option>`).join('')}</select>`}</label><div id="qcc-algo-error" class="qcc-error" role="alert"></div><div class="qcc-button-row"><button class="ds-button primary" type="submit">保存配置</button><button class="ds-button" type="button" onclick="qccToggleAlgorithm('${current.id}')">${current.st==='运行中'?'停用':'启用'}</button></div></form>`+qccNote('演示配置不会执行外部算法包；样本验证仅核对本机结果集。'),'频率 / 版本 / 状态','','settings'),
  dsCard('算法执行量 · 样本结果',qccChart({series:[{name:'方法结果量',color:'#83d2ed',values:counts}],labels:['10-17','10-18','10-19','10-20','10-21','10-22','10-23'],min:0,unit:'条',bars:true}),esc(current.n))
 );
}
const qccVoltage=st=>stations.find(s=>s.id===st.id)?.line.match(/1000kV|±800kV|500kV|220kV|110kV/)?.[0]||['1000kV','±800kV','500kV','220kV','110kV','35kV及以下'][qccHash(st.id)%6];
function qccDeviceLedger(){
 const all=networkScope(),rows=all.filter(st=>(S.qccVoltage==='全部'||qccVoltage(st)===S.qccVoltage)&&(!S.qccSearch||(st.name+st.id).includes(S.qccSearch))),current=rows.find(st=>st.id===S.qccDevice)||rows[0],core=current&&stations.find(s=>s.id===current.id),edit=current&&qccDeviceEdits[current.id]||{};
 const list=rows.slice(S.qccPage*16,(S.qccPage+1)*16);
 return dsColumns(
  dsCard('系统管理分类',qccSystemNav()+`<label class="qcc-field">电压等级${typeof dsRenderSelect === 'function' ? dsRenderSelect({id:'qcc-voltage-select',value:S.qccVoltage,options:['全部','1000kV','±800kV','500kV','220kV','110kV','35kV及以下'],className:'qco-filter-cs',ariaLabel:'设备电压等级',onchange:'qccSetVoltage(this.dataset.value)'}) : `<select class="ds-select" aria-label="设备电压等级" onchange="qccSetVoltage(this.value)">${['全部','1000kV','±800kV','500kV','220kV','110kV','35kV及以下'].map(v=>`<option ${v===S.qccVoltage?'selected':''}>${v}</option>`).join('')}</select>`}</label>`+qccInfo([['全范围设备',num(all.length)+' 座'],['筛选设备',num(rows.length)+' 座']]),'范围沿用顶部筛选','','settings')+
  dsCard('台账与配置记录',qccInfo([['设备信息版本',esc(edit.updated||'初始演示样本')],['型号',esc(edit.model||core?.model||'线路型监测装置（示例）')],['责任单位',esc(edit.owner||current?.province||'—')]])+qccAction('导出台账','qccExportLedger()')+qccNote('电压等级为演示属性；非重点站点未配置校准证书样本。'),'设备状态与质控标识独立','','file'),
  dsCard('电网设备台账',`<div class="qcc-inline-tools"><input class="qcc-input" aria-label="搜索设备台账" placeholder="设备编号 / 站点名称，回车查询" value="${esc(S.qccSearch)}" onkeydown="if(event.key==='Enter'){event.preventDefault();qccSystemSearch(this.value)}" onchange="qccSystemSearch(this.value)"><button onclick="qccExportLedger()">导出</button></div><div class="qcc-device-list">${list.map(st=>`<button class="${st.id===current?.id?'selected':''}" onclick="qccSelectDevice('${st.id}')"><span><b>${esc(st.name)}</b><small>${st.id} · ${st.province}</small><em>${qccVoltage(st)}</em></span>${dsTag(NETWORK_STATUS[networkStatus(st)].label,networkStatus(st)==='abnormal'?'amber':networkStatus(st)==='online'?'green':'')}</button>`).join('')||dsEmpty('没有匹配设备')}</div><div class="qcc-pagination"><button onclick="qccDevicePage(-1)" ${S.qccPage===0?'disabled':''}>上一页</button><span>${S.qccPage+1} / ${Math.max(1,Math.ceil(rows.length/16))}</span><button onclick="qccDevicePage(1)" ${(S.qccPage+1)*16>=rows.length?'disabled':''}>下一页</button></div>`,`${num(rows.length)} 座`,'','database')+
  dsCard('设备详情',current?`<h4 class="qcc-selected-title">${esc(current.name)}</h4>`+qccInfo([['设备编号',current.id],['省级单位',current.province],['电压等级',qccVoltage(current)],['在线状态',NETWORK_STATUS[networkStatus(current)].label],['校准证书',core?core.ref:'未配置样本']])+`<form class="qcc-form" onsubmit="qccSaveDevice(event,'${current.id}');return false"><label>设备型号<input id="qcc-device-model" value="${esc(edit.model||core?.model||'线路型监测装置（示例）')}" maxlength="70" required></label><label>责任单位<input id="qcc-device-owner" value="${esc(edit.owner||current.province)}" maxlength="70" required></label><button class="ds-button primary" type="submit">保存台账信息</button></form>`+qccAction('完整档案',`openNetworkStation('${current.id}')`):dsEmpty(),'选中设备','','pin'),
  dsTrendCard(current?current.name+' · 区域质量趋势':'区域质量趋势')
 );
}

function qccSetMethod(id){if(id!=='all'&&!QCC_METHOD[id])return;S.qccMethod=id;S.qccPage=0;S.qccResult=null;render();}
function qccSetFlag(flag){S.qccFlag=flag==='all'?'all':Number(flag);S.qccPage=0;S.qccResult=null;render();}
function qccSetDistribution(id){S.qccDistribution=id;render();}
function qccSearchResults(value){S.qccSearch=value.trim();S.qccPage=0;render();}
function qccSelectResult(id){const record=qccRows().find(r=>r.id===id);if(!record)return;S.qccResult=id;render();const point=networkStations.find(st=>st.id===record.station);if(point&&tileView.map)tileView.map.easeTo({center:point.coordinates,zoom:Math.max(5,tileView.map.getZoom()),duration:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:250});}
function qccResultPage(delta){const pages=Math.max(1,Math.ceil(qccMethodRows().length/12));S.qccPage=Math.max(0,Math.min(pages-1,S.qccPage+delta));render();}
function qccSetFixFilter(status){S.qccFixFilter=status;S.qccIssue=null;render();}
function qccSelectIssue(id){S.qccIssue=id;S.qccFixFilter='全部';S.selectedStation=events.find(e=>e.id===id)?.station||null;changeTab('events');}
function qccSetEval(id){if(!QC_REFERENCE.EVAL_TABS.some(t=>t.id===id))return;S.qccEval=id;render();}
function qccSelectCase(index){S.qccCase=index;render();}
function qccSetSystem(id){S.qccSystem=id;S.qccSearch='';S.qccPage=0;S.selectedStation=null;render();}
function qccSelectAlgorithm(id){S.qccAlgo=id;render();}
function qccSystemSearch(value){S.qccSearch=value.trim();S.qccPage=0;if(S.qccSystem==='ledger')S.selectedStation=null;render();}
function qccSetVoltage(value){S.qccVoltage=value;S.qccPage=0;S.selectedStation=null;render();}
function qccSelectDevice(id){S.qccDevice=id;S.selectedStation=id;render();}
function qccDevicePage(delta){const count=networkScope().filter(st=>(S.qccVoltage==='全部'||qccVoltage(st)===S.qccVoltage)&&(!S.qccSearch||(st.name+st.id).includes(S.qccSearch))).length;S.qccPage=Math.max(0,Math.min(Math.max(0,Math.ceil(count/16)-1),S.qccPage+delta));render();}
function qccPersist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('本次更改已临时保留，浏览器无法写入本地存储。');return false;}}
function qccSubmitCorrection(event,id){
 event.preventDefault();const e=events.find(e=>e.id===id);if(!e)return;
 let flag=Number(document.getElementById('qcc-fix-flag').value),mode=document.getElementById('qcc-fix-mode').value;
 const input=document.getElementById('qcc-fix-value'),note=document.getElementById('qcc-fix-note'),error=document.getElementById('qcc-fix-error'),element=QC_REFERENCE.ELS.find(el=>el.n===station(e.station).element);
 const value=input.value.trim()===''?null:Number(input.value);error.textContent='';
 if(note.value.trim().length<5){error.textContent='请填写至少5个字的处置依据。';note.focus();return;}
 if(mode==='置为缺测')flag=4;
 if(flag===5&&(value==null||!Number.isFinite(value))){error.textContent='请填写有效订正值。';input.focus();return;}
 if(flag===5&&element&&(value<element.lo||value>element.hi)){error.textContent=`订正值须位于附件示例量程 ${element.lo}—${element.hi} ${element.u} 内。`;input.focus();return;}
 const old=qccJournal[id],entry={time:qccClock(),action:flag===5?'提交订正':QCC_FLAG[flag].n+'结论',mode,value:flag===5?value:null,note:note.value.trim()};
 const sample=qccIssueObservation(e);
 qccJournal[id]={flag,mode,value:entry.value,note:entry.note,sampleId:sample?.id,rawValue:sample?sample.value:null,status:[1,4,5].includes(flag)?'已订正':'复核中',version:(old?.version||0)+1,history:[...(old?.history||[]),entry]};
 qccPersist('meteo-qcc-corrections-v2',qccJournal);qccRevision++;render();toast('已独立保存订正标识与记录，原始观测未改动。');
}
function qccCloseIssue(id){
 const edit=qccJournal[id];if(!edit||![1,4,5].includes(edit.flag)){const error=document.getElementById('qcc-fix-error');if(error)error.textContent='请先完成复核或订正，形成可归档结论。';return;}
 edit.status='已关闭';edit.history.push({time:qccClock(),action:'关闭问题并归档',note:'保留原始值、订正值与版本记录。'});
 const e=events.find(e=>e.id===id);if(e){e.status='已闭环';e.result='质控订正归档';qccPersist('meteo-six-demo-v1',events);}
 qccPersist('meteo-qcc-corrections-v2',qccJournal);qccRevision++;render();toast('问题已关闭，订正记录可追溯。');
}
function qccOpenObservation(id){
 const row=qccRows().find(r=>r.id===id);if(!row)return;const el=QCC_ELEMENT[row.element],st=station(row.station);
 S.detail=null;coreOpenModal('质控样本与证据',`<h3>${esc(st.n)} · ${el.n}</h3>`+qccInfo([['记录编号',row.id],['观测时次',row.time],['原始观测',qccValue(row.value)+' '+el.u],['当前标识',qccFlag(row.flag)],['订正值',row.corrected==null?'未另存订正值':qccValue(row.corrected)+' '+el.u],['判识方法',row.methods.map(m=>QCC_METHOD[m].n).join('、')||'未质控'],['附件示例量程',el.lo+'—'+el.hi+' '+el.u]])+qccNote('原值、质量标识和订正记录分开保存。阈值为附件示例，不代表已核定的生产规则。')+`<div class="qcc-button-row">${qccAction('站点档案',`openStation('${st.id}')`)}</div>`);
}
function qccCsvCell(value){if(value==null)return '';let text=String(value);if(typeof value==='string'&&/^[=+@\-]/.test(text)&&!/^[-+]?\d+(\.\d+)?$/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}
function qccDownload(name,headers,rows){const csv='\ufeff'+[headers,...rows].map(row=>row.map(qccCsvCell).join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function qccExportResults(){qccDownload('质控结果_'+S.scope+'_'+S.period+'.csv',['记录编号','省份','站点','要素','时间','原始值','单位','质量标识','订正值','方法'],qccMethodRows().map(r=>[r.id,r.province,station(r.station).n,QCC_ELEMENT[r.element].n,r.time,r.value,QCC_ELEMENT[r.element].u,QCC_FLAG[r.flag].n,r.corrected??'',r.methods.map(m=>QCC_METHOD[m].n).join(' / ')]));}
function qccExportCorrection(id){const e=events.find(e=>e.id===id);if(!e)return;const edit=qccJournal[id],sample=qccIssueObservation(e),raw=edit&&'rawValue'in edit?edit.rawValue:sample?.value;qccDownload('订正记录_'+id+'.csv',['问题编号','样本编号','站点','样本原始观测','原事件记录值','订正值','标识','版本','状态','时间','操作','说明'],(edit?.history||[{time:'快照 2026-10-23',action:'原始问题',note:e.cause}]).map(h=>[id,edit?.sampleId||sample?.id||'',station(e.station).n,raw,e.value,edit?.value??'',edit?QCC_FLAG[edit.flag].n:'待复核',edit?.version||0,qccIssueStatus(e),h.time,h.action,h.note]));}
function qccPreviewEvaluation(){S.detail=null;coreOpenModal('数据评估报告预览',`<h3>${QC_REFERENCE.EVAL_TABS.find(t=>t.id===S.qccEval).n}</h3><p class="page-desc">${S.scope} / ${S.period} · 快照 2026-10-23 16:40</p>`+qccInfo(S.qccEvalMetrics||[])+qccNote('基于附件评估维度与本机演示样本生成，正式结论需专业审核。')+qccAction('下载评估摘要','qccExportEvaluation()',true));}
function qccExportEvaluation(){qccDownload('数据评估_'+S.qccEval+'_'+S.scope+'.csv',['评估维度','范围','时段','指标','数值','数据性质'],(S.qccEvalMetrics||[]).map(([label,value])=>[QC_REFERENCE.EVAL_TABS.find(t=>t.id===S.qccEval).n,S.scope,S.period,label,value,'演示样本']));}
function qccSaveAlgorithm(event,id){event.preventDefault();const a=qccAlgorithms.find(a=>a.id===id);if(!a)return;const version=document.getElementById('qcc-algo-version').value.trim();if(!/^[\w.\-]{1,30}$/.test(version)){document.getElementById('qcc-algo-error').textContent='版本号请使用字母、数字、点或短横线。';return;}Object.assign(a,{ver:version,freq:document.getElementById('qcc-algo-frequency').value,method:document.getElementById('qcc-algo-method').value});a.logs=[{time:qccClock(),text:'保存版本与执行频率'},...(a.logs||[])].slice(0,8);qccPersist('meteo-qcc-algorithms-v2',qccAlgorithms);render();toast('本机算法配置已保存。');}
function qccToggleAlgorithm(id){const a=qccAlgorithms.find(a=>a.id===id);if(!a)return;a.st=a.st==='运行中'?'已停用':'运行中';a.logs=[{time:qccClock(),text:a.st},...(a.logs||[])].slice(0,8);qccPersist('meteo-qcc-algorithms-v2',qccAlgorithms);render();}
function qccTrialAlgorithm(id){const a=qccAlgorithms.find(a=>a.id===id);if(!a)return;const rows=qccRows().filter(r=>r.methods.includes(a.method));S.detail=null;coreOpenModal('附件样本验证',`<h3>${esc(a.n)}</h3>`+qccInfo([['当前范围',S.scope+' / '+S.period],['关联结果',num(rows.length)+' 条'],['质量标识',`${num(rows.filter(r=>r.flag===1).length)} 正确 / ${num(rows.filter(r=>[2,3,4].includes(r.flag)).length)} 异常`],['当前配置','v'+esc(a.ver)+' / '+esc(a.freq)]])+qccNote('仅核对本机演示结果集，不上传或执行外部算法包。'));}
function qccRegisterAlgorithm(){
  S.detail=null;
  const nodeHtml = typeof dsRenderSelect === 'function' ? dsRenderSelect({
    id: 'qcc-register-node',
    value: '中心端',
    options: ['中心端', '装置端'],
    ariaLabel: '部署位置'
  }) : '<select id="qcc-register-node"><option>中心端</option><option>装置端</option></select>';

  const methodHtml = typeof dsRenderSelect === 'function' ? dsRenderSelect({
    id: 'qcc-register-method',
    value: QC_REFERENCE.METHODS[0].id,
    options: QC_REFERENCE.METHODS.map(m=>({ value: m.id, label: m.n })),
    ariaLabel: '适用方法'
  }) : `<select id="qcc-register-method">${QC_REFERENCE.METHODS.map(m=>`<option value="${m.id}">${m.n}</option>`).join('')}</select>`;

  coreOpenModal('注册质控算法',`<form class="qcc-form" onsubmit="qccSubmitAlgorithm(event);return false"><label>算法名称<input id="qcc-register-name" maxlength="60" required placeholder="填写演示算法名称"></label><div class="form-field"><label>部署位置</label>${nodeHtml}</div><div class="form-field"><label>适用方法</label>${methodHtml}</div><label>版本号<input id="qcc-register-version" value="1.0" required maxlength="30"></label><div id="qcc-register-error" class="qcc-error" role="alert"></div><div class="qcc-preserve">登记元数据到当前浏览器，不上传或执行算法文件。</div><button class="ds-button primary" type="submit">保存注册信息</button></form>`);
}
function qccSubmitAlgorithm(event){event.preventDefault();const n=document.getElementById('qcc-register-name').value.trim(),ver=document.getElementById('qcc-register-version').value.trim();if(!n||!/^[\w.\-]{1,30}$/.test(ver)){document.getElementById('qcc-register-error').textContent='请填写算法名称和有效版本号。';return;}const a={id:'QC-DEMO-'+Date.now(),n,ver,cat:document.getElementById('qcc-register-node').value,method:document.getElementById('qcc-register-method').value,freq:'10 分钟',last:'尚未运行',st:'已停用',own:'本机演示注册',logs:[{time:qccClock(),text:'注册算法元数据'}]};qccAlgorithms.push(a);S.qccAlgo=a.id;qccPersist('meteo-qcc-algorithms-v2',qccAlgorithms);closeModal();render();}
function qccSaveDevice(event,id){event.preventDefault();const model=document.getElementById('qcc-device-model').value.trim(),owner=document.getElementById('qcc-device-owner').value.trim();if(!model||!owner)return;qccDeviceEdits[id]={model,owner,updated:qccClock()};qccPersist('meteo-qcc-devices-v2',qccDeviceEdits);render();toast('本机台账信息已保存。');}
function qccExportLedger(){const rows=networkScope().filter(st=>(S.qccVoltage==='全部'||qccVoltage(st)===S.qccVoltage)&&(!S.qccSearch||(st.name+st.id).includes(S.qccSearch)));qccDownload('电网设备台账_'+S.scope+'.csv',['设备编号','站点名称','省级单位','电压等级（演示）','在线状态','型号','责任单位'],rows.map(st=>[st.id,st.name,st.province,qccVoltage(st),NETWORK_STATUS[networkStatus(st)].label,qccDeviceEdits[st.id]?.model||stations.find(s=>s.id===st.id)?.model||'线路型监测装置（示例）',qccDeviceEdits[st.id]?.owner||st.province]));}
function qccShowScope(){const r=stats(),c=qccConnection();S.detail=null;coreOpenModal('范围与数据口径',qccInfo([['范围 / 时段',S.scope+' / '+S.period],['站网快照',num(networkCounts().all)+' 座'],['全量到报 / 应采',num(r.received)+' / '+num(r.expected)+' 条'],['接入实到 / 应到',num(c.got)+' / '+num(c.due)+' 站次'],['质控明细样本',num(qccRows().length)+' 条'],['待处置问题',qcPendingCount()+' 项']])+qccNote('全量接入快照使用现有8省站网；质控明细为8个重点站点、8类要素的模拟时序，按当前范围和时段筛选。接入站次按24时次/日的演示口径计算。样本正确率、数据可用率、设备在线率的分母分别定义。'));}

function qccValidationTasks(){return (moduleData.validation?.rows||[]).filter(row=>S.scope==='全国'||row[2]==='总部'||row[2]===S.scope);}
function qccValidationStatus(tasks=qccValidationTasks()){return {all:tasks.length,running:tasks.filter(row=>row[3]==='验证中').length,sampling:tasks.filter(row=>row[3]==='采样中').length,review:tasks.filter(row=>row[3]==='待评审').length};}
function qccValidationHelp(){S.detail=null;const d=qccValidationStatus();coreOpenModal('验证任务统计',qccInfo([['责任范围',S.scope+'；包含总部共用任务'],['关联任务',d.all+' 项'],['验证中',d.running+' 项'],['采样中',d.sampling+' 项'],['待评审',d.review+' 项']])+qccNote('按既有任务清单及其当前阶段统计，不以任务数推算试验通过率、误报率或漏报率。'));}
function qccPickValidation(id){S.qccValidationTask=id;render();}
function qccValidation(){
 const tasks=qccValidationTasks(),selected=tasks.find(row=>row[0]===S.qccValidationTask)||tasks[0],metrics=[['试验通过率','通过用例 / 已执行用例'],['误报率','误报 / 真实正常样本'],['漏报率','漏检 / 真实异常样本']];
 return dsColumns(
  dsCard('验证任务清单',tasks.length?`<div class="qcc-validation-list">${tasks.map(row=>`<button class="${row===selected?'selected':''}" onclick="qccPickValidation('${row[0]}')"><span>${row[0]}</span><b>${row[1]}</b><small>${row[2]} · ${row[3]}</small></button>`).join('')}</div>`:dsEmpty('当前范围暂无验证任务'),`${tasks.length} 项`,'','flask')+
  dsCard('试验证据要求',qccTable(['证据','用途'],[['版本化标准数据集','固定比较基准'],['正常 / 异常真值标签','识别误报与漏检'],['用例执行与判定记录','计算通过率'],['算法版本与装置信息','关联适用边界']]),'四类必要证据','','shield'),
  dsCard('任务与标准样本',selected?qccInfo([['任务编号',selected[0]],['验证内容',selected[1]],['责任范围',selected[2]],['当前阶段',selected[3]],['关联依据',selected[4]]])+qccNote('任务信息来自既有验证清单；实际执行用例、真值标签与试验结论待接入。'):dsEmpty(),'当前选择','','file')+
  dsCard('验证效果指标',`<div class="qcc-validation-metrics">${metrics.map(([n,d])=>`<div><span>${n}</span><b>—</b><small>${d}</small></div>`).join('')}</div>`+qccAction('查看指标定义','qcoValidationDefinitions()'),'待接入结果','','chart'),
  dsCard('验证流程',`<div class="qcc-validation-flow">${['标准样本','用例执行','真值比对','效果评估','结论回流'].map((n,i)=>`<div><b>${i+1}</b><span>${n}</span></div>`).join('')}</div>`+qccNote('按固定版本、相同场景进行对照；验证结论应关联规则修订、算法发布或装置适用范围。'),'五个步骤')
 );
}
function qccRouteTarget(id){const aliases={overview:'summary',qc:'summary',fix:'correction',events:'correction',correction:'correction',validation:'summary',eval:'evaluation',sys:'system',analysis:'results',alarms:'results',rules:'system',ledger:'system',reports:'evaluation'};if(id==='ledger')S.qccSystem='ledger';if(id==='rules')S.qccSystem='algo';let target=aliases[id]||id;if(target==='results')target=qccResultStage(S.qccMethod);if(QCC_STAGE_METHODS[target]){if(!QCC_STAGE_METHODS[target].includes(S.qccMethod))S.qccMethod=target==='rapid'?'missing':'space';if(S.tab!==target)S.qccFlag='all';}return target;}
const qccPreviousChangeTab=changeTab;
changeTab=function(id){const target=qccRouteTarget(id);S.qccSearch='';S.qccPage=0;if(target==='evaluation'&&(!S.element||S.element==='综合')){S.element='气压';}return qccPreviousChangeTab(target);};
dsCards=function(){
 const pages = {
  summary: qccOverview,
  connect: qccConnect,
  rapid: qccResults,
  province: typeof qcpProvincePage === 'function' ? qcpProvincePage : (typeof window !== 'undefined' && typeof window.qcpProvincePage === 'function' ? window.qcpProvincePage : qccOverview),
  correction: typeof qccCorrectionPage === 'function' ? qccCorrectionPage : (typeof window !== 'undefined' && typeof window.qccCorrectionPage === 'function' ? window.qccCorrectionPage : qccOverview),
  evaluation: qccEvaluation,
  system: qccSystem
 };
 const fn = pages[S.tab] || qccOverview;
 return typeof fn === 'function' ? fn() : '';
};
dsKpis=qccKpis;
showScopeContext=qccShowScope;
openEvents=function(){changeTab('summary');};
const qccPreviousReset=resetDemo;
resetDemo=function(){qccJournal={};qccRevision++;qccPersist('meteo-qcc-corrections-v2',qccJournal);qccPreviousReset();};
showQcFunctionCatalog=function(){S.detail=null;coreOpenModal('数据质控功能目录',`<p class="page-desc">以质控驾驶舱为直接入口，左侧质控体系按链路通道、快速质控、省级质控、数据评估四个环节组织。</p><div class="qc-catalog-chain">${qualityMenus.slice(1).map(([id,n])=>`<button onclick="openQcCategory('${id}')">${icon(qualityMenus.find(m=>m[0]===id)[2])}<span>${n}</span>${icon('chevron')}</button>`).join('')}</div><div class="qc-catalog-grid">${[...qualityMenus,...qualityUtilityMenus].map(([id,n,i])=>`<section class="qc-catalog-card"><header>${icon(i)}<strong>${n}</strong><button onclick="openQcCategory('${id}')">进入${icon('chevron')}</button></header><p>${qualityCatalog[id].stage}</p><div class="qc-catalog-features">${qualityCatalog[id].features.map(f=>`<span>${f}</span>`).join('')}</div></section>`).join('')}</div>`);document.querySelector('.modal')?.classList.add('qc-catalog-dialog');};


const qccPreviousMap=dsMap;
dsMap=function(){return qccPreviousMap()+(qccIsResultsView()?`<div class="qcc-map-flags" role="group" aria-label="质控标识筛选">${[['all','全部'],...[1,2,3,4,5,0].map(k=>[k,QCC_FLAG[k].n])].map(([k,n])=>`<button class="${String(S.qccFlag)===String(k)?'active':''}" aria-pressed="${String(S.qccFlag)===String(k)}" onclick="qccSetFlag('${k}')">${n}${k==='all'?'':`<b>${num(qccFlags(qccMethodRows(S.qccMethod,false))[k])}</b>`}</button>`).join('')}</div>`:'');};
function qccSyncMap(){
 const map=tileView.map;if(!map||!tileView.loaded)return;
 if(!map.getSource('qcc-result-source')){map.addSource('qcc-result-source',{type:'geojson',data:{type:'FeatureCollection',features:[]}});map.addLayer({id:'qcc-result-points',type:'circle',source:'qcc-result-source',paint:{'circle-radius':6,'circle-color':['match',['get','flag'],1,'#7ce3be',2,'#efcf75',3,'#f39282',4,'#9aabc0',5,'#bca2ed','#7f98af'],'circle-stroke-color':'#e1f7ff','circle-stroke-width':1.1,'circle-opacity':.95}});}
 const active=S.module==='qc'&&qccIsResultsView();
 map.setLayoutProperty('qcc-result-points','visibility',active&&tileView.showStations?'visible':'none');
 if(active){
  for(const id of ['station-halos','station-name-labels','station-octahedron-markers','station-hits']){if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none');}
  tileView.markers.forEach(m=>m.element.style.visibility='hidden');
  const latest=qccMethodRows().filter(r=>r.day===0&&r.hour===(S.period==='当前'?(S.currentHour??16):16)),byStation={};
  latest.forEach(r=>{const priority={3:6,4:5,2:4,5:3,0:2,1:1};if(!byStation[r.station]||priority[r.flag]>priority[byStation[r.station].flag])byStation[r.station]=r;});
  const features=Object.values(byStation).filter(r=>tileView.status==='all'||networkStatus(networkStations.find(s=>s.id===r.station))===tileView.status).map(r=>({type:'Feature',properties:{station:r.station,flag:r.flag},geometry:{type:'Point',coordinates:networkStations.find(s=>s.id===r.station).coordinates}}));
  map.getSource('qcc-result-source').setData({type:'FeatureCollection',features});tileView.node.dataset.qcResultStations=String(features.length);
  const health=document.getElementById('atlas-health');if(health)health.textContent=S.period==='当前'?`断面 10-23 ${String(S.currentHour??16).padStart(2,'0')}:00 · 重点站点要素质量标识`:'最新重点站点要素标识 · 明细按所选时段汇总';
 }else if(S.module==='qc'&&S.tab==='connect'){
  const expression=['match',['get','name']];provinces.forEach(p=>expression.push(p.n,p.complete>=.994?'#286e84':p.complete>=.99?'#5d7c67':'#88704b'));expression.push('#163d58');map.setPaintProperty('province-color','fill-color',expression);
 }
}
const qccPreviousSync=syncAtlas;
syncAtlas=function(...args){qccPreviousSync(...args);qccSyncMap();};

let globalAutoScrollRaf = null;
let globalAutoScrollHovered = new Set();

function initAllAutoScrolls() {
 if (globalAutoScrollRaf) {
  cancelAnimationFrame(globalAutoScrollRaf);
  globalAutoScrollRaf = null;
 }
 globalAutoScrollHovered.clear();

 const containers = document.querySelectorAll('.qcr-auto-scroll-list, .qca-link-sublist, .qco-problem-list');
 if (!containers.length) return;

 const trackGap = 5;
 const speed = 24;
 const activeItems = [];

 containers.forEach((listEl, idx) => {
  const track1 = listEl.querySelector('.track-1, .qco-prob-track-1');
  const track2 = listEl.querySelector('.track-2, .qco-prob-track-2');
  if (!track1 || !track2) return;

  const itemKey = 'scroll-' + idx;
  let scrollPos = listEl.scrollTop || 0;

  listEl.onmouseenter = () => { globalAutoScrollHovered.add(itemKey); };
  listEl.onmouseleave = () => {
   globalAutoScrollHovered.delete(itemKey);
   scrollPos = listEl.scrollTop;
  };

  listEl.addEventListener('wheel', (e) => {
   const singleHeight = (track1.offsetHeight || track1.scrollHeight || 0) + trackGap;
   if (singleHeight > listEl.clientHeight + trackGap) {
    if (e.deltaY < 0 && listEl.scrollTop <= 0) {
     listEl.scrollTop += singleHeight;
     scrollPos = listEl.scrollTop;
    }
   }
  }, { passive: true });

  listEl.addEventListener('scroll', () => {
   if (globalAutoScrollHovered.has(itemKey)) {
    const singleHeight = (track1.offsetHeight || track1.scrollHeight || 0) + trackGap;
    if (singleHeight > listEl.clientHeight + trackGap) {
     if (listEl.scrollTop >= singleHeight) {
      listEl.scrollTop -= singleHeight;
     } else if (listEl.scrollTop < 0) {
      listEl.scrollTop += singleHeight;
     }
    }
    scrollPos = listEl.scrollTop;
   }
  }, { passive: true });

  activeItems.push({ listEl, track1, track2, itemKey, getPos: () => scrollPos, setPos: (v) => { scrollPos = v; } });
 });

 if (!activeItems.length) return;

 let lastTimestamp = performance.now();

 function frame(now) {
  const anyConnected = activeItems.some(it => it.listEl.isConnected);
  if (!anyConnected) {
   globalAutoScrollRaf = null;
   return;
  }

  const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
  lastTimestamp = now;

  for (const it of activeItems) {
   if (!it.listEl.isConnected) continue;
   const singleHeight = (it.track1.offsetHeight || it.track1.scrollHeight || 0) + trackGap;
   if (singleHeight > it.listEl.clientHeight + trackGap) {
    it.track2.style.display = 'flex';
    if (!globalAutoScrollHovered.has(it.itemKey) && dt > 0) {
     let cur = it.getPos() + speed * dt;
     if (cur >= singleHeight) {
      cur -= singleHeight;
     }
     it.setPos(cur);
     it.listEl.scrollTop = cur;
    }
   } else {
    it.track2.style.display = 'none';
   }
  }

  globalAutoScrollRaf = requestAnimationFrame(frame);
 }

 globalAutoScrollRaf = requestAnimationFrame(frame);
}
window.initAllAutoScrolls = initAllAutoScrolls;
const qccPreviousRender=render;
render=function(){qccPreviousRender();const scene=document.querySelector('.ds-scene');if(scene)scene.dataset.qcView=S.tab;qccSyncMap();initAllAutoScrolls();};
dsRoute=function(){const parts=location.hash.slice(1).split('/');S.module=primaryMenus.some(m=>m[0]===parts[0])?parts[0]:'qc';if(S.module==='qc'){S.tab=qccRouteTarget(parts[1]||'summary');if(!qcMenuExists(S.tab))S.tab='summary';}render();if(S.module==='qc'&&parts[1]!==S.tab)history.replaceState(null,'','#qc/'+S.tab);};
dsRoute();
