'use strict';

// 参考用户提供的功能示意，复用现有样本与闭环记录；不导入图片中的独立统计值。
Object.assign(S,{qcoTrend:'30',qcoProblemTab:'all',qcoActiveStage:null});
const QCO_SYSTEM=[
 {id:'channel',code:'S1',short:'数据链路',name:'S1数据链路',icon:'link',caption:'采集接入 · 通道传输质量'},
 {id:'rapid',code:'S2',short:'快速质控',name:'S2快速质控',icon:'activity',caption:'格式 · 要素完整 · 要素超限检查'},
 {id:'province',code:'S3',short:'综合质控',name:'S3综合质控',icon:'layers',caption:'变化范围 · 内部一致性 · 时间一致性'},
 {id:'correction',code:'S4',short:'数据订正',name:'S4数据订正',icon:'check-circle',caption:'人机协同 · 闭环留痕订正'},
 {id:'evaluation',code:'S5',short:'数据评估',name:'S5数据评估',icon:'chart',caption:'优中差三级评估 · 偏差对比'}
];
const QCO_DIMS=[['complete','完整性'],['quality','合格性'],['consistent','一致性'],['usable','可用性']];
function qcoRate(a,b){return b?100*a/b:null;}
function qcoPercent(n){return n==null?'—':n.toFixed(2)+'%';}
function qcoQuality(rows){
 const n=rows.length,missing=rows.filter(r=>r.flag===4).length,unchecked=rows.filter(r=>r.flag===0).length;
 const good=rows.filter(r=>r.flag===1||r.flag===5).length;
 const inconsistent=rows.filter(r=>[2,3].includes(r.flag)&&r.methods.some(m=>['time','space','internal','persist'].includes(m))).length;
 return {n,missing,unchecked,good,inconsistent,complete:qcoRate(n-missing,n),quality:qcoRate(good,n-missing-unchecked),consistent:qcoRate(n-missing-unchecked-inconsistent,n-missing-unchecked),usable:qcoRate(good,n)};
}
function qcoClosure(){const list=filteredEvents(),count=k=>list.filter(e=>qccIssueStatus(e)===k).length;const result={all:list.length,pending:count('待处置'),review:count('复核中'),corrected:count('已订正'),closed:count('已关闭')};result.rate=qcoRate(result.closed,result.all);return result;}
function qcoAssociationData(){
 const checked=qccRows().filter(r=>r.flag!==0&&r.flag!==4),methods=['time','space','internal'];
 const anomalies=checked.filter(r=>[2,3].includes(r.flag)&&r.methods.some(m=>methods.includes(m)));
 const counts=Object.fromEntries(methods.map(id=>[id,anomalies.filter(r=>r.methods.includes(id)).length]));
 return {checked:checked.length,hits:anomalies.length,rate:qcoRate(checked.length-anomalies.length,checked.length),counts,methods};
}
function qcoStageMetrics(){
 const rows=qccRows(),checked=rows.filter(r=>r.flag!==0),r=stats(),association=qcoAssociationData();
 const rapidHits=checked.filter(r=>[2,3,4].includes(r.flag)&&r.methods.some(m=>['missing','range','rate','time'].includes(m))).length;
 const values={channel:{rate:qcoRate(r.received,r.expected)},rapid:{checked:checked.length,hits:rapidHits,rate:qcoRate(checked.length-rapidHits,checked.length)},province:association,evaluation:{rate:qcoQuality(rows).usable},validation:{rate:null,hits:null}};
 return QCO_SYSTEM.map(stage=>({...stage,...values[stage.id]}));
}
function qcoValidationTasks(){return (typeof moduleData==='object'?moduleData.validation?.rows||[]:[]).filter(row=>S.scope==='全国'||row[2]==='总部'||row[2]===S.scope);}
function qcoCalcMergedTrends(){
 if(typeof QcDatabase!=='undefined'&&typeof QcDatabase.generateTrendSeries==='function'){
  return QcDatabase.generateTrendSeries(S.scope,S.period,S.element);
 }
 const isSingleDay=['当前','今日'].includes(S.period),labels=[],usable=[],sus=[],err=[],missingSeries=[];
 const scopeSeed=qccHash(S.scope||'全国'),N=isSingleDay?25:(S.period==='近3日'?3:7);
 for(let step=0;step<N;step++){
  let label,t;
  if(isSingleDay){label=String(step).padStart(2,'0')+':00';t=step;}
  else{const dayOffset=N-1-step,d=new Date(Date.UTC(2026,9,23-dayOffset));label=`${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;t=step*(24/Math.max(1,N-1));}
  labels.push(label);
  const wUsable=69.0+7.6*Math.sin(t*Math.PI/12+1.2)-4.8*Math.cos(t*Math.PI/6)+((scopeSeed+step*7)%7-3)*0.85;
  const wSus=7.4+2.9*Math.sin((t-6)*Math.PI/6)+((scopeSeed+step*13)%5-2)*0.35;
  const wErr=6.1+2.6*Math.cos((t-14)*Math.PI/8)+((scopeSeed+step*17)%5-2)*0.35;
  const wMissing=13.0+2.2*Math.sin(t*0.5)+((scopeSeed+step*19)%5-2)*0.3;
  const weights=[Math.max(55,wUsable),Math.max(4,wSus),Math.max(3.5,wErr),Math.max(6,wMissing)];
  const sum=weights.reduce((a,b)=>a+b,0);
  const pcts=weights.map(w=>Number((w/sum*100).toFixed(2)));
  pcts[3]=Number((100.00-pcts[0]-pcts[1]-pcts[2]).toFixed(2));
  usable.push(pcts[0]);sus.push(pcts[1]);err.push(pcts[2]);missingSeries.push(pcts[3]);
 }
 return {usable,sus,err,missingSeries,labels};
}
function qcoTrendData(){return qcoCalcMergedTrends();}
function qcoStageIndicators(){
 const r=stats(),q=qcoQuality(qccRows()),stages=Object.fromEntries(qcoStageMetrics().map(s=>[s.id,s])),association=qcoAssociationData(),evalData=qccEvalData();
 const percentage=v=>v==null?'—':v.toFixed(2);
 return {
  channel:[['到报数据',num(r.received),'条','当前范围与时段的全量接入快照'],['到报率',percentage(qcoRate(r.received,r.expected)),'%','到报 / 应采'],['及时率',percentage(qcoRate(r.timely,r.expected)),'%','全量及时 / 应采']],
  rapid:[['样本完整性',percentage(q.complete),'%','(样本总数 − 缺失) / 样本总数'],['规则通过率',percentage(stages.rapid.rate),'%','已判定样本中未命中缺测、界限、速率、时间异常规则的比例'],['异常命中',num(stages.rapid.hits),'条','快速规则异常命中样本去重']],
  province:[['关联一致率',percentage(association.rate),'%','已质控非缺失样本中未命中时间、空间、内部一致性异常的比例'],['空间异常',num(association.counts.space),'条','空间一致性规则异常样本'],['多要素异常',num(association.counts.internal),'条','内部一致性规则异常样本']],
  evaluation:[['样本可用率',percentage(q.usable),'%','正确及订正 / 全部样本，随当前范围与时段筛选'],['平均偏差',qccValue(evalData.bias),'hPa','观测 − 模式；独立14期气压比对示例，与数据评估页一致'],['RMSE',qccValue(evalData.rmse),'hPa','观测与模式偏差平方均值的平方根；独立14期气压示例']],
  validation:[['试验通过率','—','','通过用例 / 已执行用例；试验执行与结论待接入'],['误报率','—','','误报数 / 真实正常样本数；需标准真值标签'],['漏报率','—','','漏报数 / 真实异常样本数；需标准真值标签']]
 };
}
function qcoMethodStats(id){const method=QCC_METHOD[id],checked=qccRows().filter(r=>r.flag!==0),matches=checked.filter(r=>[2,3,4].includes(r.flag)&&r.methods.includes(id)),sample=matches.slice().sort((a,b)=>a.day-b.day||b.hour-a.hour)[0],sampleText=sample?(sample.value==null?'缺测':qccValue(sample.value)+' '+QCC_ELEMENT[sample.element].u):'—',sampleNote=sample?station(sample.station).n+' · '+QCC_ELEMENT[sample.element].n+' · '+sample.time+'；代表异常观测，不是方法阈值':'当前窗口无该方法异常观测';return {id,name:method.n,checked:checked.length,hits:matches.length,share:qcoRate(matches.length,checked.length),sample,sampleText,sampleNote};}
function qcoMethodRows(ids){return `<div class="qco-method-head"><span>方法 / 样例观测</span><span>命中 / 占比</span></div><div class="qco-method-list">${ids.map(id=>{const m=qcoMethodStats(id);return `<button class="qco-method-row ${m.hits?'has-hit':''}" aria-label="${m.name}，查看方法结果" title="${m.sampleNote}；已判定 ${num(m.checked)} 条，方法间可交叉命中" onclick="qcoOpenMethod('${id}')"><span class="qco-method-label">${m.name.replace('检查','')}<small>${m.sampleText}</small></span><span class="qco-method-count"><b>${num(m.hits)}<em>条</em></b><small>${qcoPercent(m.share)}</small></span></button>`;}).join('')}</div>`;}
function qcoSystemValues(rows,stageId){return `<div class="qco-value-list">${rows.map(([label,value,unit,note,action])=>`<button type="button" class="qco-value-item" onclick="${action||`qcoEnterStage('${stageId}')`}"><span>${label}</span><b>${value}<em>${unit}</em></b></button>`).join('')}</div>`;}
function qcoFlowRows(items,stageId){
 return `<div class="qco-flow-list">${items.map(item=>item==='divider'?'<hr class="qco-flow-divider" aria-hidden="true">':`<button type="button" class="qco-flow-row ${item[4]||''}" onclick="${item[3]||`qcoEnterStage('${stageId}')`}"><span class="qco-flow-label">${item[0]}：</span><b class="qco-flow-count">${item[1]}</b><em class="qco-flow-pct">${item[2]||''}</em></button>`).join('')}</div>`;
}
function qcoStageBadgesData(){
 const r=stats(),rows=qccRows(),n=rows.length,quality=qcoQuality(rows);
 const due=r.expected,arrived=r.received,timely=r.timely,delayed=Math.max(0,arrived-timely);
 const mildDelay=Math.round(delayed*.62),severeDelay=Math.round(delayed*.27),criticalDelay=Math.max(0,delayed-mildDelay-severeDelay);
 const s2In=arrived,missingRatio=n?rows.filter(x=>x.methods.includes('missing')&&[2,3,4].includes(x.flag)).length/n:.0028,rangeRatio=n?rows.filter(x=>x.methods.includes('range')&&[2,3,4].includes(x.flag)).length/n:.0035;
 const formatOk=Math.round(s2In*.9994),completeOk=Math.max(0,formatOk-Math.round(s2In*missingRatio*.12)),overLimit=Math.round(s2In*rangeRatio*.12),s2Pass=Math.max(0,completeOk-overLimit);
 const s3In=s2Pass,rateRatio=n?rows.filter(x=>(x.methods.includes('rate')||x.methods.includes('space'))&&[2,3,4].includes(x.flag)).length/n:.003,internalRatio=n?rows.filter(x=>x.methods.includes('internal')&&[2,3,4].includes(x.flag)).length/n:.002,timeRatio=n?rows.filter(x=>x.methods.includes('time')&&[2,3,4].includes(x.flag)).length/n:.0025;
 const rangePass=Math.round(s3In*(1-rateRatio*.1)),internalPass=Math.round(s3In*(1-internalRatio*.1)),timePass=Math.round(s3In*(1-timeRatio*.1)),s3Pass=Math.min(r.valid,rangePass,internalPass,timePass);

 // S4 数据订正指标
 const s4In=s3Pass;
 const s4Rate='99.28';
 const s4Corrected=Math.round(s4In * 0.9928);

 // S5 数据评估指标（接入、优率、中率、差率）
 const s5In=s4Corrected;
 const cEval=(typeof networkEvalCounts==='function')?networkEvalCounts():{all:650,excellent:520,medium:98,poor:32};
 const totalEval=cEval.all||650;
 const pExc=(cEval.excellent/totalEval*100).toFixed(2);
 const pMed=(cEval.medium/totalEval*100).toFixed(2);
 const pPoor=(100-Number(pExc)-Number(pMed)).toFixed(2);
 const s5Exc=Math.round(s5In*(Number(pExc)/100));
 const s5Med=Math.round(s5In*(Number(pMed)/100));
 const s5Poor=Math.max(0,s5In-s5Exc-s5Med);

 return {
  r,rows,n,quality,due,arrived,timely,delayed,mildDelay,severeDelay,criticalDelay,
  s2In,formatOk,completeOk,overLimit,s2Pass,
  s3In,rangePass,internalPass,timePass,s3Pass,
  s4In,s4Corrected,s4Rate,
  s5In,pExc,pMed,pPoor,s5Exc,s5Med,s5Poor,
  badges:{
   channel:'实到 '+qcoPercent(qcoRate(arrived,due)),
   rapid:'通过 '+qcoPercent(qcoRate(s2Pass,s2In)),
   province:'通过 '+qcoPercent(qcoRate(s3Pass,s3In)),
   correction:'订正率 '+s4Rate+'%',
   evaluation:'优率 '+pExc+'%'
  },
  shortPcts:{
   channel:qcoPercent(qcoRate(arrived,due)),
   rapid:qcoPercent(qcoRate(s2Pass,s2In)),
   province:qcoPercent(qcoRate(s3Pass,s3In)),
   correction:s4Rate+'%',
   evaluation:pExc+'%'
  }
 };
}
function qcoPipeline(){
 const d=qcoStageBadgesData();
 const {due,arrived,timely,s2In,formatOk,completeOk,overLimit,s2Pass,s3In,rangePass,internalPass,timePass,s3Pass,s4In,s4Corrected,s4Rate,s5In,pExc,pMed,pPoor,s5Exc,s5Med,s5Poor,badges}=d;
 const missing=Math.max(0,due-arrived);
 const wCount=n=>n>=1000?(n/10000).toFixed(2)+'w条':num(n)+'条';
 const bodies={
  channel:qcoFlowRows([
   ['应到',num(due)+'条','','','head'],
   'divider',
   ['实到',num(arrived)+'条',qcoPercent(qcoRate(arrived,due))],
   ['缺失',num(missing)+'条',qcoPercent(qcoRate(missing,due)),'',missing?'warn':''],
   ['及时',num(timely)+'条',qcoPercent(qcoRate(timely,due))],
   'divider',
   ['完整率',qcoPercent(qcoRate(arrived,due)),'','','foot']
  ],'channel'),
  rapid:qcoFlowRows([
   ['接入',num(s2In)+'条','','','head'],
   'divider',
   ['格式正确',num(formatOk)+'条',qcoPercent(qcoRate(formatOk,s2In)),"qcoOpenMethod('climate')"],
   ['要素完整',num(completeOk)+'条',qcoPercent(qcoRate(completeOk,s2In)),"qcoOpenMethod('missing')"],
   ['要素超限',num(overLimit)+'条',qcoPercent(qcoRate(overLimit,s2In)),"qcoOpenMethod('range')",'warn'],
   'divider',
   ['通过',num(s2Pass)+'条',qcoPercent(qcoRate(s2Pass,s2In)),"qcoEnterStage('rapid')",'foot']
  ],'rapid'),
  province:qcoFlowRows([
   ['接入',num(s3In)+'条','','','head'],
   'divider',
   ['主要变化范围通过',num(rangePass)+'条',qcoPercent(qcoRate(rangePass,s3In)),"qcoOpenAssociation('space')"],
   ['内部一致性通过',num(internalPass)+'条',qcoPercent(qcoRate(internalPass,s3In)),"qcoOpenAssociation('internal')"],
   ['时间一致性通过',num(timePass)+'条',qcoPercent(qcoRate(timePass,s3In)),"qcoOpenAssociation('time')"],
   'divider',
   ['通过',num(s3Pass)+'条',qcoPercent(qcoRate(s3Pass,s3In)),"qcoEnterStage('province')",'foot']
  ],'province'),
  correction:qcoFlowRows([
   ['接入',num(s4In)+'条','','','head'],
   'divider',
   ['订正率',wCount(s4Corrected),s4Rate+'%',"qcoEnterStage('correction')",'foot']
  ],'correction'),
  evaluation:qcoFlowRows([
   ['接入',num(s5In)+'条','','','head'],
   'divider',
   ['优率',wCount(s5Exc),pExc+'%'],
   ['中率',wCount(s5Med),pMed+'%'],
   ['差率',wCount(s5Poor),pPoor+'%','',Number(pPoor)>0?'warn':'']
  ],'evaluation')
 };

 return `<section class="qco-pipeline" aria-label="质控体系"><div class="qco-stage-track">${QCO_SYSTEM.map((st,i)=>`<section class="qco-stage stage-${i+1}"><div class="qco-stage-header"><i class="qco-stage-node" aria-hidden="true">${icon(st.icon)}</i><button type="button" class="qco-stage-heading" onclick="qcoOpenStage('${st.id}')"><strong>${st.name}</strong><span class="qco-stage-badge">${badges[st.id]}</span>${icon('chevron')}</button></div><div class="qco-stage-card">${bodies[st.id]}</div></section>`).join('')}</div></section>`;
}

function qcoRailNav() {
 return typeof qcoPipelineNav === 'function' ? qcoPipelineNav() : '';
}

function qcoPipelineNav() {
 const isCollapsed = S.tab !== 'summary';
 const d = (typeof qcoStageBadgesData === 'function') ? qcoStageBadgesData() : null;
 const pcts = d?.shortPcts || { channel: '99.22%', rapid: '99.61%', province: '99.37%', correction: '99.28%', evaluation: '80.00%' };

 const stageNavs = [
  { id: 'connect', stageId: 'channel', code: 'S1', short: '数据链路', name: 'S1数据链路', icon: 'link', rate: pcts.channel, badge: d?.badges?.channel || '实到 99.22%', color: '#91d9d5' },
  { id: 'rapid', stageId: 'rapid', code: 'S2', short: '快速质控', name: 'S2快速质控', icon: 'activity', rate: pcts.rapid, badge: d?.badges?.rapid || '通过 99.61%', color: '#99ccef' },
  { id: 'province', stageId: 'province', code: 'S3', short: '综合质控', name: 'S3综合质控', icon: 'layers', rate: pcts.province, badge: d?.badges?.province || '通过 99.37%', color: '#a3bbef' },
  { id: 'events', stageId: 'correction', code: 'S4', short: '数据订正', name: 'S4数据订正', icon: 'check-circle', rate: pcts.correction, badge: d?.badges?.correction || '订正率 99.28%', color: '#c0afe4' },
  { id: 'evaluation', stageId: 'evaluation', code: 'S5', short: '数据评估', name: 'S5数据评估', icon: 'chart', rate: pcts.evaluation, badge: d?.badges?.evaluation || '优率 80.00%', color: '#dfcf97' }
 ];

 if (isCollapsed) {
  return `
   <nav class="qco-pipeline-nav is-collapsed" aria-label="质控体系快速导航">
    <button type="button" class="qco-rail-card qco-rail-home" onclick="changeTab('summary')" aria-label="还原驾驶舱" title="驾驶舱 · 点击还原">
     <span class="qco-rail-icon">${icon('grid')}</span>
     <span class="qco-rail-name">驾驶舱</span>
    </button>
    <div class="qco-rail-stages">
     ${stageNavs.map(st => {
       const isActive = S.tab === st.id;
       return `
        <button type="button" class="qco-rail-card qco-rail-stage stage-${st.code.toLowerCase()} ${isActive ? 'active' : ''}" onclick="changeTab('${st.id}')" aria-label="${st.code} ${st.short}，指标 ${st.rate}" title="${st.code} ${st.short} · ${st.rate}" style="--stage-color:${st.color}">
         <span class="qco-rail-node" style="color:${st.color};border-color:${st.color}">${icon(st.icon)}</span>
         <span class="qco-rail-code" style="color:${st.color}">${st.code}</span>
         <span class="qco-rail-short">${st.short}</span>
         <b class="qco-rail-pct" style="color:${st.color}">${st.rate}</b>
        </button>
       `;
     }).join('')}
    </div>
   </nav>
  `;
 }

 return `
  <nav class="qco-pipeline-nav is-expanded" aria-label="质控体系">
   ${qcoPipeline()}
  </nav>
 `;
}
function qcoQualitySummary(rows=qccRows()){
 const quality=qcoQuality(rows),flags=qccFlags(rows),byProvince=[...new Set(rows.map(r=>r.province))].map(name=>({name,short:provinces.find(p=>p.n===name)?.short||name,rate:qcoQuality(rows.filter(r=>r.province===name)).usable})).filter(p=>p.rate!=null).sort((a,b)=>b.rate-a.rate||a.name.localeCompare(b.name,'zh-CN'));
 const bands=[{id:'good',label:'正确 / 订正',count:flags[1]+flags[5],flag:'good'},{id:'suspect',label:'可疑',count:flags[2],flag:'2'},{id:'error',label:'错误',count:flags[3],flag:'3'},{id:'missing',label:'缺失',count:flags[4],flag:'4'},{id:'unchecked',label:'未质控',count:flags[0],flag:'0'}].map(item=>({...item,share:qcoRate(item.count,rows.length)}));
 return {quality,flags,bands,checked:rows.length-flags[0],stationCount:new Set(rows.map(r=>r.station)).size,elementCount:new Set(rows.map(r=>r.element)).size,byProvince};
}
function qcoResultBands(rows=qccRows()){
 const flags=qccFlags(rows),colors={1:'#7ed6ba',2:'#e1b768',3:'#ec9083',4:'#8ea3b8',5:'#b5a0d6',0:'#7194ad'};
 return [1,2,3,4,5,0].map(id=>({id,label:QCC_FLAG[id].n,count:flags[id],share:qcoRate(flags[id],rows.length),color:colors[id]}));
}
function qcoQualityCard(){
 const c = (typeof window.hasActiveEquipFilter === 'function' && window.hasActiveEquipFilter() && typeof window.networkCounts === 'function')
  ? window.networkCounts()
  : (typeof QcDatabase !== 'undefined' && typeof QcDatabase.getQualityCounts === 'function')
   ? QcDatabase.getQualityCounts(S.scope, S.period, S.element, S.currentMinute)
   : { all: 1280, usable: 832, suspect: 102, error: 70, missing: 122, corrected: 58, unchecked: 96, usablePct: 65.0, suspectPct: 8.0, errorPct: 5.5, missingPct: 9.5, correctedPct: 4.5, uncheckedPct: 7.5 };

 const bands = [
  { id: 'usable', label: '正确', count: c.usable, pct: c.usablePct, color: '#1fc79a', flag: 'usable' },
  { id: 'suspect', label: '可疑', count: c.suspect, pct: c.suspectPct, color: '#f0ad4e', flag: 'suspect' },
  { id: 'error', label: '错误', count: c.error, pct: c.errorPct, color: '#ee5a52', flag: 'error' },
  { id: 'missing', label: '缺失/离线', count: c.missing, pct: c.missingPct, color: '#6f93ba', flag: 'missing' },
  { id: 'corrected', label: '订正', count: c.corrected || 0, pct: c.correctedPct || 0, color: '#36b3d9', flag: 'corrected' },
  { id: 'unchecked', label: '未质控', count: c.unchecked || 0, pct: c.uncheckedPct || 0, color: '#50687d', flag: 'unchecked' }
 ];

 const p1 = c.usablePct;
 const p2 = p1 + c.suspectPct;
 const p3 = p2 + c.errorPct;
 const p4 = p3 + c.missingPct;
 const p5 = p4 + (c.correctedPct || 0);
 const gradient = c.all ? `conic-gradient(from -90deg, #1fc79a 0% ${p1}%, #f0ad4e ${p1}% ${p2}%, #ee5a52 ${p2}% ${p3}%, #6f93ba ${p3}% ${p4}%, #36b3d9 ${p4}% ${p5}%, #50687d ${p5}% 100%)` : '#203a4c';

 const r = typeof stats === 'function' ? stats() : { expected: 30720, received: 30481, timely: 30138 };
 const arriveRate = r.expected ? ((r.received / r.expected) * 100).toFixed(2) : '99.22';
 const timelyRate = r.expected ? ((r.timely / r.expected) * 100).toFixed(2) : '98.88';

 const goodTotal = c.usable + (c.corrected || 0);
 const goodRate = c.all ? ((goodTotal / c.all) * 100).toFixed(2) : '0.00';
 const completeRate = c.all ? (((c.all - c.missing) / c.all) * 100).toFixed(2) : '0.00';

 const scopeHtml = `<div class="qco-quality-scope"><span>${S.scope} · ${S.period}</span><button aria-label="查看统计说明" onclick="qcoOpenQualityScope()">${icon('info')}</button></div>`;
 const heroHtml = `
  <div class="qco-quality-hero-wrap">
   <div class="qco-quality-ring" style="--result-gradient:${gradient}" role="img" aria-label="质控六分类结果分布">
    <div class="qco-ring-inner">
     <b>${num(c.all)}</b>
     <span>${c.all === 0 ? '暂无样本' : '总样本'}</span>
    </div>
   </div>
   <div class="qco-quality-kpis">
    <div class="qco-kpi-item cyan">
     <span class="qco-kpi-lbl">到报率</span>
     <b class="qco-kpi-val">${arriveRate}%</b>
    </div>
    <div class="qco-kpi-item good">
     <span class="qco-kpi-lbl">及时率</span>
     <b class="qco-kpi-val">${timelyRate}%</b>
    </div>
    <div class="qco-kpi-item emerald">
     <span class="qco-kpi-lbl">可用率</span>
     <b class="qco-kpi-val">${goodRate}%</b>
    </div>
    <div class="qco-kpi-item info">
     <span class="qco-kpi-lbl">完整率</span>
     <b class="qco-kpi-val">${completeRate}%</b>
    </div>
   </div>
  </div>
 `;
 const metaHtml = `<div class="qco-quality-subbar"><span>${c.all === 0 ? '当前省份未接入' : (S.scope==='全国'?'全网 1280 座':'辖区 '+num(c.all)+' 座')}</span><i></i><span>${c.all === 0 ? '暂无实时质控样本' : '8 类监测要素 · 六类质控结果'}</span></div>`;
 const flagsGridHtml = `
  <div class="qco-flags-grid">
   ${bands.map(b => `
    <button type="button" class="qco-flag-card ${tileView.status === b.flag ? 'active' : ''}" onclick="filterNetwork('${b.flag}')" title="点击在地图上联动筛选【${b.label}】" style="--flag-col:${b.color}">
     <div class="qco-flag-head">
      <span class="qco-flag-name"><i class="qco-flag-dot" style="background:${b.color}"></i>${b.label}</span>
      <span class="qco-flag-pct">${b.pct.toFixed(2)}%</span>
     </div>
     <div class="qco-flag-body">
      <b class="qco-flag-count" style="color:${b.color}">${num(b.count)}</b>
      <span class="qco-flag-bar"><i style="width:${Math.min(100, Math.max(b.pct * 1.25, b.count ? 6 : 0))}%;background:${b.color}"></i></span>
     </div>
    </button>
   `).join('')}
  </div>
 `;

 return dsCard('质量结果分布', scopeHtml + heroHtml + metaHtml + flagsGridHtml, '', 'qco-quality-card', 'shield');
}
function qcoDrillProvince(provName){
 S.qcoDrillProvince = provName;
 changeScope(provName);
}

function qcoBackToNational(){
 S.qcoDrillProvince = null;
 changeScope('全国');
}

function qcoProvinceStats(nodes=networkScope(),statusOf=networkStatus){
 if(typeof CHINA_DIVISIONS!=='undefined'&&CHINA_DIVISIONS.length){
  return CHINA_DIVISIONS.slice().sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'zh-CN'));
 }
 const groups=new Map();
 for(const node of nodes){if(!groups.has(node.province))groups.set(node.province,{name:node.province,short:provinces.find(p=>p.n===node.province)?.short||node.province,total:0,online:0,abnormal:0,offline:0});const p=groups.get(node.province),status=statusOf(node);p.total++;if(status==='offline')p.offline++;else if(status==='abnormal')p.abnormal++;else p.online++;}
 return [...groups.values()].map(p=>({...p,rate:qcoRate(p.online+p.abnormal,p.total)})).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'zh-CN'));
}

function qcoBuildRankTip(name, total, unit, counts, isConn = true) {
 if (!isConn) {
  return JSON.stringify({
   title: name,
   total: '未接入数据',
   isConn: false
  });
 }
 const sum = total || (counts.usable + counts.suspect + counts.error + counts.missing + (counts.corrected || 0) + (counts.unchecked || 0)) || 1;
 const pctOf = v => ((v / sum) * 100).toFixed(2) + '%';
 return JSON.stringify({
  title: name,
  total: `${num(total)} ${unit}`,
  isConn: true,
  items: [
   { label: '正确', count: counts.usable, pct: pctOf(counts.usable), color: '#1fc79a' },
   { label: '可疑', count: counts.suspect, pct: pctOf(counts.suspect), color: '#f0ad4e' },
   { label: '错误', count: counts.error, pct: pctOf(counts.error), color: '#ee5a52' },
   { label: '缺失/离线', count: counts.missing, pct: pctOf(counts.missing), color: '#6f93ba' },
   { label: '订正', count: counts.corrected || 0, pct: pctOf(counts.corrected || 0), color: '#36b3d9' },
   { label: '未质控', count: counts.unchecked || 0, pct: pctOf(counts.unchecked || 0), color: '#50687d' }
  ]
 });
}

window.qcoShowRankTip = function(e, rawJson) {
 let tipEl = document.getElementById('qco-rank-tooltip');
 if (!tipEl) {
  tipEl = document.createElement('div');
  tipEl.id = 'qco-rank-tooltip';
  tipEl.className = 'qco-rank-tooltip';
  document.body.appendChild(tipEl);
 }
 try {
  const data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
  if (!data.isConn) {
   tipEl.innerHTML = `
    <div class="qco-rt-head"><strong class="qco-rt-title">${esc(data.title)}</strong><span class="qco-rt-total warn">未接入数据</span></div>
    <div class="qco-rt-empty">该省份尚未接入监测质控数据（全部为 0）</div>
   `;
  } else {
   tipEl.innerHTML = `
    <div class="qco-rt-head">
     <strong class="qco-rt-title">${esc(data.title)}</strong>
     <span class="qco-rt-total">${esc(data.total)}</span>
    </div>
    <div class="qco-rt-grid">
     ${data.items.map(it => `
      <div class="qco-rt-row">
       <span class="qco-rt-lbl"><i style="background:${it.color}"></i>${it.label}</span>
       <span class="qco-rt-nums"><b style="color:${it.color}">${num(it.count)}</b><small>${it.pct}</small></span>
      </div>
     `).join('')}
    </div>
   `;
  }
  tipEl.style.display = 'block';
  window.qcoMoveRankTip(e);
 } catch (err) {}
};

window.qcoMoveRankTip = function(e) {
 const tipEl = document.getElementById('qco-rank-tooltip');
 if (!tipEl || tipEl.style.display === 'none') return;
 const pad = 12;
 const tipWidth = tipEl.offsetWidth || 190;
 const tipHeight = tipEl.offsetHeight || 180;
 const winWidth = window.innerWidth;
 const winHeight = window.innerHeight;

 let x = e.clientX + pad;
 let y = e.clientY + pad;

 if (x + tipWidth > winWidth - 10) {
  x = e.clientX - tipWidth - pad;
 }
 if (y + tipHeight > winHeight - 10) {
  y = e.clientY - tipHeight - pad;
 }

 tipEl.style.left = Math.max(10, x) + 'px';
 tipEl.style.top = Math.max(10, y) + 'px';
};

window.qcoHideRankTip = function() {
 const tipEl = document.getElementById('qco-rank-tooltip');
 if (tipEl) tipEl.style.display = 'none';
};

function qcoSetRankTab(tab){
 S.qcoRankTab = tab === 'element' ? 'element' : 'region';
 render();
}

function qcoProvinceCard(){
 S.qcoRankTab = S.qcoRankTab || 'region';

 const drillProvName = S.qcoDrillProvince || (S.scope !== '全国' ? S.scope : null);
 const drillProv = drillProvName && typeof findChinaDivision === 'function' ? findChinaDivision(drillProvName) : null;

 const tabsHtml = `
  <div class="qco-card-tabs" role="tablist" aria-label="排名维度">
   <button type="button" class="qco-card-tab ${S.qcoRankTab === 'region' ? 'active' : ''}" onclick="qcoSetRankTab('region')">区域排名</button>
   <span class="qco-card-tab-sep">/</span>
   <button type="button" class="qco-card-tab ${S.qcoRankTab === 'element' ? 'active' : ''}" onclick="qcoSetRankTab('element')">要素排名</button>
  </div>
 `;

 const legendHtml = `<div class="qco-province-legend"><span><i style="background:#1fc79a"></i>正确</span><span><i style="background:#f0ad4e"></i>可疑</span><span><i style="background:#ee5a52"></i>错误</span><span><i style="background:#6f93ba"></i>缺失/离线</span><span><i style="background:#36b3d9"></i>订正</span><span><i style="background:#50687d"></i>未质控</span></div>`;

 // 模式 A：要素排名
 if(S.qcoRankTab === 'element'){
  const isConnected = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function')
    ? QcDatabase.isProvinceConnected(S.scope)
    : true;

  const summaryCounts = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.getQualityCounts === 'function')
    ? QcDatabase.getQualityCounts(S.scope, S.period, '综合', S.currentMinute)
    : { all: 0, usable: 0, suspect: 0, error: 0, corrected: 0, missing: 0, unchecked: 0 };
  
  const summaryGood = summaryCounts.usable + (summaryCounts.corrected || 0);
  const summaryRate = (isConnected && summaryCounts.all) ? Number((summaryGood / summaryCounts.all * 100).toFixed(2)) : 0.00;

  const elementList = QC_ALL_ELEMENTS.map(el => {
    const c = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.getQualityCounts === 'function')
      ? QcDatabase.getQualityCounts(S.scope, S.period, el.name, S.currentMinute)
      : { all: 0, usable: 0, suspect: 0, error: 0, corrected: 0, missing: 0, unchecked: 0 };
    const good = c.usable + (c.corrected || 0);
    const rate = (isConnected && c.all) ? Number((good / c.all * 100).toFixed(2)) : 0.00;
    return { ...el, ...c, correctRate: rate };
  }).sort((a, b) => b.correctRate - a.correctRate || b.all - a.all);

  const renderElemBtn = (item, isSum = false) => {
    const isSel = (S.element || '综合') === item.name;
    const barWidth = isConnected && item.all ? '100%' : '0%';
    const tipJson = esc(qcoBuildRankTip(item.name, item.all, '条', item, isConnected && Boolean(item.all)));

    return `
     <button type="button" class="qco-elem-row-btn ${isSum ? 'is-summary' : ''} ${isSel ? 'active' : ''}" aria-label="${esc(item.name)}，样本 ${num(item.all)} 条，点击切换至该要素" onclick="changeScreenElement('${esc(item.name)}')">
      <strong class="prov-name" style="${isSum ? 'color:#7ee8f5;font-weight:700' : ''}">${esc(item.name)}</strong>
      <i class="qco-province-track" data-tip="${tipJson}" onmouseenter="qcoShowRankTip(event, this.dataset.tip)" onmousemove="qcoMoveRankTip(event)" onmouseleave="qcoHideRankTip()">
       <i style="width:${barWidth}">
        <b class="usable" style="flex:${item.usable};background:#1fc79a"></b>
        <b class="suspect" style="flex:${item.suspect};background:#f0ad4e"></b>
        <b class="error" style="flex:${item.error};background:#ee5a52"></b>
        <b class="missing" style="flex:${item.missing};background:#6f93ba"></b>
        <b class="corrected" style="flex:${item.corrected || 0};background:#36b3d9"></b>
        <b class="unchecked" style="flex:${item.unchecked || 0};background:#50687d"></b>
       </i>
      </i>
      <b class="prov-count">${num(item.all)}</b>
     </button>
    `;
  };

  const sumBtnHtml = renderElemBtn({ name: '综合', ...summaryCounts, correctRate: summaryRate }, true);
  const elemBtnsHtml = elementList.map(e => renderElemBtn(e, false)).join('');

  const cols = `<div class="qco-province-columns"><span>监测要素</span><span>规模分布</span><span>样本/条</span></div>`;
  const listHtml = `<div class="qco-province-list">${sumBtnHtml}${elemBtnsHtml}</div>`;

  return dsCard(tabsHtml, cols + listHtml + legendHtml, `8 要素 · 综合`, 'qco-province-card', 'chart');
 }

 // 模式 B：区域排名（地市下钻视图）
 if(drillProv && drillProv.cities && drillProv.cities.length){
  const p = drillProv;
  const isConn = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function')
    ? QcDatabase.isProvinceConnected(p.name)
    : provinces.some(pr => pr.n === p.name || pr.short === p.short);

  const citiesWithQc = p.cities.map(c => {
    const q = (isConn && typeof QcDatabase !== 'undefined' && typeof QcDatabase.getProvinceQuality === 'function')
      ? QcDatabase.getProvinceQuality(p.name + '-' + c.name, c.total)
      : { usable: 0, suspect: 0, error: 0, missing: 0, corrected: 0, unchecked: 0, correctRate: 0.00 };
    return { ...c, ...q };
  }).sort((a, b) => b.correctRate - a.correctRate || b.total - a.total);

  const extraHtml = `${p.cities.length} 市 · ${isConn ? num(p.total) + ' 座' : '未接入数据'}`;

  const cols = `<div class="qco-province-columns"><span>地市单位</span><span>规模分布</span><span>装置/座</span></div>`;
  const listHtml = `<div class="qco-province-list">${citiesWithQc.map(c => {
   const tipJson = esc(qcoBuildRankTip(c.name, c.total, '座', c, isConn && Boolean(c.total)));
   return `
   <div class="qco-province-item qco-city-item">
    <strong class="prov-name">${esc(c.name)}</strong>
    <i class="qco-province-track" data-tip="${tipJson}" onmouseenter="qcoShowRankTip(event, this.dataset.tip)" onmousemove="qcoMoveRankTip(event)" onmouseleave="qcoHideRankTip()"><i style="width:${isConn ? '100%' : '0%'}"><b class="usable" style="flex:${c.usable};background:#1fc79a"></b><b class="suspect" style="flex:${c.suspect};background:#f0ad4e"></b><b class="error" style="flex:${c.error};background:#ee5a52"></b><b class="missing" style="flex:${c.missing};background:#6f93ba"></b><b class="corrected" style="flex:${c.corrected};background:#36b3d9"></b><b class="unchecked" style="flex:${c.unchecked};background:#50687d"></b></i></i>
    <b class="prov-count">${num(c.total)}</b>
   </div>
  `;}).join('')}</div>`;

  return dsCard(tabsHtml, cols + listHtml + legendHtml, extraHtml, 'qco-province-card qco-province-drilled', 'building');
 }

 // 模式 B：区域排名（全国 31 省视图，排除港澳台）
 const EXCLUDED_PROVINCES = ['香港特别行政区', '澳门特别行政区', '台湾省', '香港', '澳门', '台湾'];
 const rawList = ((typeof CHINA_DIVISIONS !== 'undefined' && CHINA_DIVISIONS.length)
  ? CHINA_DIVISIONS
  : qcoProvinceStats()).filter(p => !EXCLUDED_PROVINCES.includes(p.name) && !EXCLUDED_PROVINCES.includes(p.short));

 const list = rawList.map(p => {
  const isConn = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function')
    ? QcDatabase.isProvinceConnected(p.name)
    : provinces.some(pr => pr.n === p.name || pr.short === p.short);
  const q = (isConn && typeof QcDatabase !== 'undefined' && typeof QcDatabase.getProvinceQuality === 'function')
    ? QcDatabase.getProvinceQuality(p.name, p.total)
    : { usable: 0, suspect: 0, error: 0, missing: 0, corrected: 0, unchecked: 0, correctRate: 0.00 };
  return { ...p, ...q, isConn };
 }).sort((a, b) => b.correctRate - a.correctRate || b.total - a.total);

 const total = list.reduce((s, p) => s + p.total, 0);

 const cols = `<div class="qco-province-columns"><span>省级单位</span><span>规模分布</span><span>装置/座</span></div>`;
 const listHtml = `<div class="qco-province-list">${list.map(p => {
  const tipJson = esc(qcoBuildRankTip(p.name, p.total, '座', p, p.isConn && Boolean(p.total)));
  return `
  <button type="button" aria-label="${esc(p.short)}，${p.total} 座，下钻查看地市" onclick="qcoDrillProvince('${esc(p.name)}')">
   <strong class="prov-name">${esc(p.short)}</strong>
   <i class="qco-province-track" data-tip="${tipJson}" onmouseenter="qcoShowRankTip(event, this.dataset.tip)" onmousemove="qcoMoveRankTip(event)" onmouseleave="qcoHideRankTip()"><i style="width:${p.isConn ? '100%' : '0%'}"><b class="usable" style="flex:${p.usable};background:#1fc79a"></b><b class="suspect" style="flex:${p.suspect};background:#f0ad4e"></b><b class="error" style="flex:${p.error};background:#ee5a52"></b><b class="missing" style="flex:${p.missing};background:#6f93ba"></b><b class="corrected" style="flex:${p.corrected};background:#36b3d9"></b><b class="unchecked" style="flex:${p.unchecked};background:#50687d"></b></i></i>
   <b class="prov-count">${num(p.total)}</b>
  </button>
 `;}).join('')}</div>`;

 return dsCard(tabsHtml, cols + listHtml + legendHtml, `${list.length} 省 · ${num(total)} 座`, 'qco-province-card', 'building');
}
function qcoIssueRanking(rows=qccRows()){
 const groups=new Map(),suffix={missing:'缺测',range:'越界',rate:'突变',time:'时序异常',space:'空间异常',internal:'协同异常',persist:'僵值',climate:'气候异常',complex:'综合异常'};
 for(const row of rows.filter(r=>[2,3,4].includes(r.flag))){const event=originalEvents.find(e=>e.id===row.eventId),method=QCC_EVENT_METHOD[event?.type]||row.methods.find(m=>m!=='complex')||'complex',key=row.element+'|'+method;if(!groups.has(key))groups.set(key,{key,element:row.element,method,label:QCC_ELEMENT[row.element].n+(suffix[method]||'异常'),count:0,rows:[]});const item=groups.get(key);item.count++;item.rows.push(row);}
 return [...groups.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'zh-CN'));
}
function qcoIssueCard(){
 const all=qcoIssueRanking(),list=all.slice(0,5),max=Math.max(1,...list.map(item=>item.count)),total=all.reduce((sum,item)=>sum+item.count,0),other=all.slice(5).reduce((sum,item)=>sum+item.count,0);
 return dsCard('异常类型排行',list.length?`<div class="qco-rank-summary"><span>${S.period} · 异常样本</span><b>${num(total)}<small> 条</small></b></div><div class="qco-issue-ranking">${list.map((item,i)=>`<button onclick="qcoOpenIssueRank('${item.key}')" aria-label="${item.label}，${item.count} 条，查看样本"><small>${String(i+1).padStart(2,'0')}</small><span>${item.label}</span><i><b style="width:${item.count/max*100}%"></b></i><em>${num(item.count)}<small> 条</small></em></button>`).join('')}</div><div class="qco-rank-note"><span>按要素与主因归类 · 样本去重</span>${other?`<button onclick="qcoOpenIssueRank()">其余 ${num(other)} 条${icon('chevron')}</button>`:''}</div>`:dsEmpty('当前窗口无异常样本'),dsMore('前 5 类','onclick="qcoOpenIssueRank()"'),'qco-rank-card','alert');
}
const QC_ALL_ELEMENTS = [
 { name: '气压', isSummary: false },
 { name: '气温', isSummary: false },
 { name: '相对湿度', isSummary: false },
 { name: '风向', isSummary: false },
 { name: '风速', isSummary: false },
 { name: '雨量', isSummary: false },
 { name: '总辐射', isSummary: false },
 { name: '大气电场', isSummary: false }
];

function qcoElementRankHtml() {
 const isConnected = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function')
   ? QcDatabase.isProvinceConnected(S.scope)
   : true;

 const summaryCounts = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.getQualityCounts === 'function')
   ? QcDatabase.getQualityCounts(S.scope, S.period, '综合', S.currentMinute)
   : { all: 0, usable: 0, suspect: 0, error: 0, corrected: 0, missing: 0, unchecked: 0 };
 
 const summaryGood = summaryCounts.usable + (summaryCounts.corrected || 0);
 const summaryRate = (isConnected && summaryCounts.all) ? Number((summaryGood / summaryCounts.all * 100).toFixed(2)) : 0.00;

 const elementList = QC_ALL_ELEMENTS.map(el => {
   const c = (typeof QcDatabase !== 'undefined' && typeof QcDatabase.getQualityCounts === 'function')
     ? QcDatabase.getQualityCounts(S.scope, S.period, el.name, S.currentMinute)
     : { all: 0, usable: 0, suspect: 0, error: 0, corrected: 0, missing: 0, unchecked: 0 };
   const good = c.usable + (c.corrected || 0);
   const rate = (isConnected && c.all) ? Number((good / c.all * 100).toFixed(2)) : 0.00;
   return { ...el, ...c, correctRate: rate };
 }).sort((a, b) => b.correctRate - a.correctRate || b.all - a.all);

 const renderRow = (item, rankStr = '') => {
   const isSel = (S.element || '综合') === item.name;
   const barWidth = isConnected && item.all ? '100%' : '0%';

   const titleTip = `${esc(item.name)}：${isConnected && item.all ? `正确 ${item.usable} / 可疑 ${item.suspect} / 错误 ${item.error} / 缺失/离线 ${item.missing} / 订正 ${item.corrected || 0} / 未质控 ${item.unchecked || 0}；正确率 ${item.correctRate.toFixed(2)}%` : '未接入数据'}；点击切换至该要素`;

   return `
    <button type="button" class="qco-elem-item ${item.isSummary ? 'is-summary' : ''} ${isSel ? 'is-selected' : ''}" onclick="qcoSelectElementFromRank('${item.name}')" aria-label="${esc(item.name)}，样本 ${num(item.all)} 条，点击切换至该要素">
      <span class="qco-elem-meta">
        ${rankStr ? `<span class="qco-elem-rank">${rankStr}</span>` : `<span class="qco-elem-rank" style="color:#7ee6f5">★</span>`}
        <strong class="qco-elem-name">${esc(item.name)}</strong>
      </span>
      <i class="qco-province-track" data-tip="${esc(qcoBuildRankTip(item.name, item.all, '条', item, isConnected && Boolean(item.all)))}" onmouseenter="qcoShowRankTip(event, this.dataset.tip)" onmousemove="qcoMoveRankTip(event)" onmouseleave="qcoHideRankTip()">
        <i style="width:${barWidth}">
          <b class="usable" style="flex:${item.usable};background:#1fc79a"></b>
          <b class="suspect" style="flex:${item.suspect};background:#f0ad4e"></b>
          <b class="error" style="flex:${item.error};background:#ee5a52"></b>
          <b class="missing" style="flex:${item.missing};background:#6f93ba"></b>
          <b class="corrected" style="flex:${item.corrected || 0};background:#36b3d9"></b>
          <b class="unchecked" style="flex:${item.unchecked || 0};background:#50687d"></b>
        </i>
      </i>
      <b class="qco-elem-count">${num(item.all)}</b>

    </button>
   `;
 };

 const summaryRow = renderRow({ name: '综合', isSummary: true, ...summaryCounts, correctRate: summaryRate });
 const listRows = elementList.map((item, idx) => renderRow(item, String(idx + 1).padStart(2, '0'))).join('');

 const cols = `<div class="qco-elem-columns"><span>监测要素</span><span>质量分布</span><span>样本/条</span></div>`;
 const legend = `<div class="qco-elem-legend"><span><i style="background:#1fc79a"></i>正确</span><span><i style="background:#f0ad4e"></i>可疑</span><span><i style="background:#ee5a52"></i>错误</span><span><i style="background:#6f93ba"></i>缺失/离线</span><span><i style="background:#36b3d9"></i>订正</span><span><i style="background:#50687d"></i>未质控</span></div>`;

 return `
  <div class="qco-elem-rank-wrap" role="region" aria-label="监测要素质量排行">
    ${cols}
    <div class="qco-elem-list">
      ${summaryRow}
      ${listRows}
    </div>
    ${legend}
  </div>
 `;
}

function qcoSelectElementFromRank(elemName) {
 closeModal();
 changeScreenElement(elemName);
}

function qcoHeatmap() {
 return qcoElementRankHtml();
}
function qcoTrendCard(){
 return dsCard('质控结果趋势',`<div class="qco-trend-chart dashboard-echart" data-dashboard-chart="quality-trend" role="img" aria-label="${S.scope} ${S.period} 质量状态堆叠趋势"></div><div class="qcc-chart-legend qco-4legend"><span><i style="background:#1fc79a"></i>正确&订正</span><span><i style="background:#f0ad4e"></i>可疑</span><span><i style="background:#ee5a52"></i>错误</span><span><i style="background:#6f93ba"></i>缺失/离线/未质控</span></div>`,'','qco-trend-card','chart');
}

function qcoProblemItems(category = S.qcoProblemTab || 'all') {
 const rows = qccRows().filter(r => {
  if (category === '3') return r.flag === 3;
  if (category === '2') return r.flag === 2;
  return r.flag === 2 || r.flag === 3;
 });
 return rows.slice().sort((a, b) => a.day - b.day || b.hour - a.hour || b.id.localeCompare(a.id)).map(r => {
  const st = station(r.station) || { n: r.station, id: r.station };
  const el = QCC_ELEMENT[r.element] || { n: r.element, u: '' };
  const ev = r.eventId ? originalEvents.find(e => e.id === r.eventId) : null;
  const isErr = r.flag === 3;
  const flagLabel = isErr ? '错误' : '可疑';
  const valStr = (r.value != null ? qccValue(r.value) : '—') + (el.u ? ' ' + el.u : '');
  
  let cause = ev?.cause || '';
  if (!cause) {
   const mId = r.methods.find(m => m !== 'complex') || r.methods[0] || 'range';
   const meta = QC_REFERENCE.METHODS.find(m => m.id === mId);
   cause = meta ? `${meta.n.replace('检查','')}：${meta.ex}` : '质控规则识别异常';
  }
  const timeStr = (ev && r.day === 0) ? `10-23 ${ev.time}` : r.time;

  let dateStr = '2026-10-23';
  let timeOnly = timeStr;
  if (timeStr.includes(' ')) {
   const parts = timeStr.split(' ');
   dateStr = parts[0].length === 5 ? `2026-${parts[0]}` : parts[0];
   timeOnly = parts[1];
  }

  const deviceName = st.line || st.n;
  const deviceType = (st.line?.includes('变') || st.model?.includes('综合')) ? '变电气象站' : '输电气象站';

  const specificMethods = r.methods.filter(m => m !== 'complex');
  if (specificMethods.length === 0) {
   specificMethods.push(r.methods[0] || (isErr ? 'range' : 'space'));
  }
  const stageNames = specificMethods.map(m => QCC_METHOD[m]?.n || m);

  let evidence = cause;
  if (ev && ev.reference && ev.bias) {
   evidence = `参考 ${ev.reference}${el.u ? ' ' + el.u : ''} (偏差 ${ev.bias})，${cause}`;
  }

  return {
   id: r.id,
   stationId: r.station,
   stationName: st.n,
   stationLine: deviceName,
   deviceName,
   deviceType,
   element: r.element,
   elementName: el.n,
   unit: el.u,
   time: timeStr,
   date: dateStr,
   timeOnly,
   flag: r.flag,
   flagLabel,
   value: valStr,
   stageNames,
   evidence,
   cause
  };
 });
}

function qcoSetProblemTab(tab) {
 S.qcoProblemTab = tab;
 render();
}

function qcoProblemCard() {
 const allList = qcoProblemItems('all');
 const top10 = allList.slice(0, 10);

 const renderItems = items => items.map((item, idx) => {
  const indexStr = String(idx + 1).padStart(2, '0');
  const isErr = item.flag === 3;
  const flagTag = `<span class="qco-prob-flag ${isErr ? 'flag-err' : 'flag-sus'}">${item.flagLabel}</span>`;
  const stageBadges = (item.stageNames || []).map(s => `<span class="qco-prob-stage-pill" title="${esc(s)}">${esc(s.replace('检查', ''))}</span>`).join('');
  return `
  <button type="button" class="qco-prob-item ${isErr ? 'is-err' : 'is-sus'}" onclick="qcoOpenProblemDetail('${item.id}')">
   <div class="qco-prob-row1">
    <span class="qco-prob-idx">${indexStr}</span>
    ${flagTag}
    <strong class="qco-prob-station" title="${esc(item.deviceName)}">${esc(item.deviceName)}</strong>
    <time class="qco-prob-time">${item.time}</time>
   </div>
   <div class="qco-prob-row2">
    <div class="qco-prob-row2-left">
     <span class="qco-prob-elem">${esc(item.elementName)}</span>
     ${stageBadges ? `<div class="qco-prob-stages" title="${esc((item.stageNames || []).join('、'))}">${stageBadges}</div>` : ''}
    </div>
    <b class="qco-prob-val ${isErr ? 'val-err' : 'val-sus'}">${item.value}</b>
   </div>
  </button>
 `;
 }).join('');

 const listHtml = top10.length ? `<div class="qco-problem-list" tabindex="0" role="region" aria-label="质控结果清单"><div class="qco-prob-track qco-prob-track-1">${renderItems(top10)}</div><div class="qco-prob-track qco-prob-track-2" aria-hidden="true">${renderItems(top10)}</div></div>` : dsEmpty('当前筛选无异常问题');

 const footHtml = `<div class="qco-problem-foot"><button type="button" class="qco-prob-all-btn" onclick="qcoOpenAllProblems()">全部${icon('chevron')}</button></div>`;

 return dsCard('质控结果清单', listHtml + footHtml, '', 'qco-problem-card', 'alert');
}

let qcoProblemRaf = null;
let qcoProblemHovered = false;

function qcoInitProblemScroll() {
 if (qcoProblemRaf) {
  cancelAnimationFrame(qcoProblemRaf);
  qcoProblemRaf = null;
 }
 qcoProblemHovered = false;

 const listEl = document.querySelector('.qco-problem-list');
 if (!listEl) return;
 const track1 = listEl.querySelector('.qco-prob-track-1');
 const track2 = listEl.querySelector('.qco-prob-track-2');
 if (!track1 || !track2) return;

 const trackGap = 4;
 let scrollPos = listEl.scrollTop || 0;
 let lastTimestamp = performance.now();
 const speed = 24; // 24px/s 平滑垂直滚动速率

 listEl.onmouseenter = () => {
  qcoProblemHovered = true;
 };
 listEl.onmouseleave = () => {
  qcoProblemHovered = false;
  scrollPos = listEl.scrollTop;
  lastTimestamp = performance.now();
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
  if (qcoProblemHovered) {
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

 function frame(now) {
  if (!listEl.isConnected) {
   qcoProblemRaf = null;
   return;
  }

  const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
  lastTimestamp = now;

  const singleHeight = (track1.offsetHeight || track1.scrollHeight || 0) + trackGap;

  if (singleHeight > listEl.clientHeight + trackGap) {
   track2.style.display = 'flex';

   if (!qcoProblemHovered && dt > 0) {
    scrollPos += speed * dt;
    if (scrollPos >= singleHeight) {
     scrollPos -= singleHeight;
    }
    listEl.scrollTop = scrollPos;
   }
  } else {
   track2.style.display = 'none';
  }

  qcoProblemRaf = requestAnimationFrame(frame);
 }

 qcoProblemRaf = requestAnimationFrame(frame);
}

const QCO_RESULT_TYPES = ['全部', '正确', '错误', '可疑', '缺测', '缺失', '订正', '未质控'];

const QCO_STAGE_RULE_MAP = {
 '错误': ['界限值检查'],
 '可疑': ['主要变化范围', '内部一致性', '时间一致性'],
 '缺失': ['数据缺失'],
 '缺测': ['要素缺测'],
 '未质控': ['数据格式错误', '其他原因'],
 '正确': ['—'],
 '订正': ['自适应订正']
};

const QCO_RESULT_STYLE = {
 '正确': { flagClass: 'flag-usable', flagColor: '#1fc79a', valColor: '#7ed6ba' },
 '错误': { flagClass: 'flag-error', flagColor: '#ee5a52', valColor: '#ee5a52' },
 '可疑': { flagClass: 'flag-suspect', flagColor: '#f0ad4e', valColor: '#f0ad4e' },
 '缺测': { flagClass: 'flag-unobserved', flagColor: '#8a99ad', valColor: '#8a99ad' },
 '缺失': { flagClass: 'flag-missing', flagColor: '#6f93ba', valColor: '#6f93ba' },
 '订正': { flagClass: 'flag-corrected', flagColor: '#36b3d9', valColor: '#36b3d9' },
 '未质控': { flagClass: 'flag-unchecked', flagColor: '#50687d', valColor: '#7e9eb4' }
};

function qcoGetProblemPool(selectedDate = qcoModalFilter.date || '2026-10-23') {
 const dateStr = selectedDate || '2026-10-23';
 const pool = [];

 // 1. 核心8大重点站事件代表记录
 const coreEventItems = [
  {
   id: 'QC-1023-042', stationId: 'ZJ-HZ-013', stationName: '杭州余杭站', province: '浙江省', city: '杭州市',
   deviceName: '500kV 余杭变', deviceType: '变电气象站', element: 'efld', elementName: '大气电场', unit: 'kV/m',
   date: dateStr, timeOnly: '16:10', flagLabel: '可疑', stageName: '主要变化范围', value: '4.82 kV/m',
   evidence: '参考 5.43 kV/m (偏差 -11.2%)，观测值持续低于参考区间，建议核查传感器漂移与现场干扰。',
   equipType: '变电站', voltage: '500kV', equipName: '500kV 余杭变电站', ownerUnit: '国网杭州供电公司'
  },
  {
   id: 'QC-1023-038', stationId: 'SC-GZ-028', stationName: '甘孜康定站', province: '四川省', city: '甘孜州',
   deviceName: '500kV 甘康线 #128', deviceType: '输电气象站', element: 'wspd', elementName: '风速', unit: 'm/s',
   date: dateStr, timeOnly: '15:40', flagLabel: '可疑', stageName: '时间一致性', value: '8.30 m/s',
   evidence: '连续6个时次观测值不变，已复核为传感器疑似卡滞，待现场核查。',
   equipType: '输电线路', voltage: '500kV', equipName: '500kV 甘康线', ownerUnit: '国网甘孜供电公司'
  },
  {
   id: 'QC-1023-031', stationId: 'HB-WH-087', stationName: '武汉江夏站', province: '湖北省', city: '武汉市',
   deviceName: '220kV 江夏变', deviceType: '变电气象站', element: 'temp', elementName: '气温', unit: '℃',
   date: dateStr, timeOnly: '15:30', flagLabel: '可疑', stageName: '时间一致性', value: '31.20 ℃',
   evidence: '10分钟温升超过规则阈值，需结合邻站、辐射条件核验。',
   equipType: '变电站', voltage: '220kV', equipName: '220kV 江夏变电站', ownerUnit: '国网武汉供电公司'
  },
  {
   id: 'QC-1023-025', stationId: 'HN-CS-041', stationName: '长沙望城站', province: '湖南省', city: '长沙市',
   deviceName: '500kV 望城变', deviceType: '变电气象站', element: 'rh', elementName: '相对湿度', unit: '%RH',
   date: dateStr, timeOnly: '14:40', flagLabel: '可疑', stageName: '内部一致性', value: '98.00 %RH',
   evidence: '相对湿度与温度协同关系异常，现场检查任务正在执行。',
   equipType: '变电站', voltage: '500kV', equipName: '500kV 望城变电站', ownerUnit: '国网长沙供电公司'
  },
  {
   id: 'QC-1023-018', stationId: 'JS-YC-066', stationName: '盐城滨海站', province: '江苏省', city: '盐城市',
   deviceName: '500kV 滨海线 #076', deviceType: '输电气象站', element: 'rain', elementName: '雨量', unit: 'mm',
   date: dateStr, timeOnly: '13:50', flagLabel: '缺测', stageName: '要素缺测', value: '—',
   evidence: '雨量通道连续3个时次未到报；站点在线，其余要素正常。',
   equipType: '输电线路', voltage: '500kV', equipName: '500kV 滨海线', ownerUnit: '国网盐城供电公司'
  },
  {
   id: 'QC-1023-011', stationId: 'AH-HS-022', stationName: '黄山歙县站', province: '安徽省', city: '黄山市',
   deviceName: '220kV 歙县变', deviceType: '变电气象站', element: 'pres', elementName: '气压', unit: 'hPa',
   date: dateStr, timeOnly: '11:10', flagLabel: '错误', stageName: '界限值检查', value: '132.60 hPa',
   evidence: '气压界限值超限，当前值 132.60 hPa 严重脱离地表气压合理范围（参考 1002.30 hPa）。',
   equipType: '变电站', voltage: '220kV', equipName: '220kV 歙县变电站', ownerUnit: '国网黄山供电公司'
  },
  {
   id: 'QC-1023-007', stationId: 'HA-LY-031', stationName: '洛阳栾川站', province: '河南省', city: '洛阳市',
   deviceName: '500kV 栾川线 #091', deviceType: '输电气象站', element: 'wspd', elementName: '风速', unit: 'm/s',
   date: dateStr, timeOnly: '10:30', flagLabel: '订正', stageName: '自适应订正', value: '5.60 m/s',
   evidence: '结合栾川山谷地形风切变动力模型与邻近参考站完成自适应订正。',
   equipType: '输电线路', voltage: '500kV', equipName: '500kV 栾川线', ownerUnit: '国网洛阳供电公司'
  },
  {
   id: 'QC-1023-003', stationId: 'SX-DT-019', stationName: '大同浑源站', province: '山西省', city: '大同市',
   deviceName: '500kV 浑源变', deviceType: '变电气象站', element: 'temp', elementName: '气温', unit: '℃',
   date: dateStr, timeOnly: '09:10', flagLabel: '未质控', stageName: '数据格式错误', value: '—',
   evidence: '规约帧头校验异常，出现乱码字符，待通信前置机重传解析。',
   equipType: '变电站', voltage: '500kV', equipName: '500kV 浑源变电站', ownerUnit: '国网大同供电公司'
  }
 ];

 coreEventItems.forEach(item => {
  const style = QCO_RESULT_STYLE[item.flagLabel] || QCO_RESULT_STYLE['正确'];
  pool.push({ ...item, ...style });
 });

 // 2. 丰富扩展样本（覆盖 7 大质控状态、各省、各地市、各要素、15 个字段）
 const provCityMap = {
  '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市'],
  '江苏省': ['南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '盐城市', '扬州市'],
  '四川省': ['成都市', '绵阳市', '德阳市', '宜宾市', '南充市', '泸州市', '甘孜州', '乐山市'],
  '湖南省': ['长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '郴州市'],
  '湖北省': ['武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市', '荆门市', '孝感市'],
  '安徽省': ['合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市'],
  '河南省': ['郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市'],
  '山西省': ['太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市']
 };

 const provNames = Object.keys(provCityMap);
 const elementList = QC_REFERENCE.ELS || [
  { k: 'temp', n: '气温', u: '℃', base: 18.5 },
  { k: 'pres', n: '气压', u: 'hPa', base: 1013.2 },
  { k: 'rh', n: '相对湿度', u: '%RH', base: 65 },
  { k: 'wspd', n: '风速', u: 'm/s', base: 3.6 },
  { k: 'wdir', n: '风向', u: '°', base: 135 },
  { k: 'rain', n: '雨量', u: 'mm', base: 0.0 },
  { k: 'rad', n: '总辐射', u: 'W/m²', base: 450 },
  { k: 'efld', n: '大气电场', u: 'kV/m', base: 0.12 }
 ];

 const times = [
  '16:40', '16:30', '16:20', '16:10', '16:00',
  '15:50', '15:40', '15:30', '15:20', '15:10', '15:00',
  '14:50', '14:40', '14:30', '14:20', '14:10', '14:00',
  '13:50', '13:40', '13:30', '13:20', '13:10', '13:00',
  '12:50', '12:40', '12:30', '12:20', '12:10', '12:00',
  '11:50', '11:40', '11:30', '11:20', '11:10', '11:00',
  '10:50', '10:40', '10:30', '10:20', '10:10', '10:00',
  '09:50', '09:40', '09:30', '09:20', '09:10', '09:00',
  '08:50', '08:40', '08:30', '08:20', '08:10', '08:00'
 ];

 const sampleConfigs = [
  // 仅保留少量正常样本（约 10 条）作为系统基准对照
  { count: 10, flagLabel: '正确', stages: ['—'] },
  // 重点集中在各类异常问题样本（总数 268+ 条，问题为主）
  { count: 56, flagLabel: '错误', stages: ['界限值检查'] },
  { count: 84, flagLabel: '可疑', stages: ['主要变化范围', '内部一致性', '时间一致性'] },
  { count: 36, flagLabel: '缺失', stages: ['数据缺失'] },
  { count: 32, flagLabel: '缺测', stages: ['要素缺测'] },
  { count: 32, flagLabel: '订正', stages: ['自适应订正'] },
  { count: 28, flagLabel: '未质控', stages: ['数据格式错误', '其他原因'] }
 ];

 let idx = 0;
 sampleConfigs.forEach(cfg => {
  for (let i = 0; i < cfg.count; i++) {
   idx++;
   const pName = provNames[(idx * 3 + i) % provNames.length];
   const cities = provCityMap[pName];
   const cName = cities[(idx * 5 + i) % cities.length];
   let el;
   if (cfg.flagLabel !== '正确' && (i % 3 === 0 || i % 7 === 1)) {
    el = elementList.find(e => e.k === 'temp') || elementList[0];
   } else {
    el = elementList[(idx + i) % elementList.length];
   }
   const time = times[(idx * 7 + i) % times.length];
   const isLine = (idx % 2 === 1);
   const voltList = ['500kV', '220kV', '110kV', '35kV', '1000kV', '±800kV'];
   const volt = voltList[(idx + i) % voltList.length];
   const stageName = cfg.stages[i % cfg.stages.length];
   const id = `QR-${dateStr.replace(/-/g, '')}-${String(idx).padStart(4, '0')}`;

   const cityNameClean = cName.replace(/市|州/g, '');
   let deviceName, equipName, equipType, deviceType;
   if (isLine) {
    const towerNo = String(((idx * 13 + 17) % 180) + 10).padStart(3, '0');
    deviceName = `${volt} ${cityNameClean}线 #${towerNo}`;
    equipName = `${volt} ${cityNameClean}线`;
    equipType = '输电线路';
    deviceType = '输电气象站';
   } else {
    deviceName = `${volt} ${cityNameClean}变`;
    equipName = `${volt} ${cityNameClean}变电站`;
    equipType = '变电站';
    deviceType = '变电气象站';
   }
   const ownerUnit = `国网${cityNameClean}供电公司`;

   let valStr = '—';
   let evidence = '';

   if (cfg.flagLabel === '正确') {
    let rawVal = el.base + Math.sin(idx) * 1.5;
    if (el.k === 'pres') rawVal = 1012.0 + Math.sin(idx) * 8.0;
    if (el.k === 'rain') rawVal = Math.max(0, (idx % 5 === 0 ? 0.8 : 0));
    if (el.k === 'rad') rawVal = Math.max(0, 420 + Math.cos(idx) * 80);
    if (el.k === 'efld') rawVal = 0.12 + (idx % 10) * 0.05;
    valStr = `${rawVal.toFixed(el.k === 'wdir' ? 0 : 2)}${el.u ? ' ' + el.u : ''}`;
    evidence = '通过时序、邻站空间比对及多要素协同三级交叉检验，数据有效。';
   } else if (cfg.flagLabel === '错误') {
    if (el.k === 'temp') {
     const errVal = 52.0 + (idx % 25) * 1.4;
     valStr = `${errVal.toFixed(1)} ℃`;
     evidence = `界限值检查超限，当前值 ${valStr} 严重偏离气温合理物理界限（上限 50.0 ℃）。`;
    } else if (el.k === 'pres') {
     valStr = `${(120.0 + (idx % 20) * 1.5).toFixed(1)} hPa`;
     evidence = `界限值检查超限，当前值严重脱离地表气压合理范围（参考 1002.30 hPa）。`;
    } else if (el.k === 'wspd') {
     valStr = `${(72.0 + (idx % 15) * 1.2).toFixed(1)} m/s`;
     evidence = `界限值检查超限，瞬时风速越过传感器极限上限（60.0 m/s）。`;
    } else if (el.k === 'rh') {
     valStr = `${(112.0 + (idx % 12) * 2.5).toFixed(1)} %RH`;
     evidence = `界限值检查超限，相对湿度超过物理上限 100.0 %RH。`;
    } else if (el.k === 'efld') {
     valStr = `${(12.80 + (idx % 8) * 0.45).toFixed(2)} kV/m`;
     evidence = `界限值检查超限，当前值严重偏离晴天大气电场物理基线。`;
    } else {
     valStr = `12.80 ${el.u || ''}`;
     evidence = `界限值检查超限，观测数值偏离物理极限与历史极值阈值。`;
    }
   } else if (cfg.flagLabel === '可疑') {
    if (stageName === '主要变化范围') {
     if (el.k === 'temp') {
      valStr = `${(28.5 + (idx % 15) * 0.4).toFixed(1)} ℃`;
      evidence = `与周边邻近同海拔参考站偏差达 +6.8℃，超出主要变化范围容差阈值。`;
     } else if (el.k === 'wspd') {
      valStr = `${(12.5 + (idx % 8) * 0.5).toFixed(1)} m/s`;
      evidence = `与微地形背景场气压梯度动力模拟偏差偏大（偏离度达 34.2%）。`;
     } else {
      valStr = `12.40 ${el.u || ''}`;
      evidence = `与周边参考测站时空插值偏差超过主要变化判据阈值。`;
     }
    } else if (stageName === '内部一致性') {
     if (el.k === 'temp') {
      valStr = `${(32.4 + (idx % 10) * 0.3).toFixed(1)} ℃`;
      evidence = `相对湿度处于 96%RH 饱和状态下气温仍异常偏高，温湿协同物理约束未通过。`;
     } else if (el.k === 'rh') {
      valStr = `98.00 %RH`;
      evidence = `相对湿度与温度协同变化关系异常，未通过内部物理约束校验。`;
     } else {
      valStr = `98.00 ${el.u || ''}`;
      evidence = `温湿气压要素物理变化关系不协调，未通过内部物理约束校验。`;
     }
    } else { // 时间一致性
     if (el.k === 'temp') {
      valStr = `${(31.2 + (idx % 12) * 0.3).toFixed(1)} ℃`;
      evidence = `10分钟温升速率超 4.2℃/10min，突变速率越界，未通过时间一致性检查。`;
     } else if (el.k === 'wspd') {
      valStr = `8.30 m/s`;
      evidence = `连续6个时次观测值僵死不变（标准差 < 0.01），疑似风速仪轴承卡滞。`;
     } else {
      valStr = `32.50 ${el.u || ''}`;
      evidence = `10分钟连续突变速率异常，超过动态变化率阈值，需进一步印证。`;
     }
    }
   } else if (cfg.flagLabel === '缺测') {
    valStr = '—';
    evidence = `要素传感器通道状态位上报缺测标记，硬件无采样信号输入。`;
   } else if (cfg.flagLabel === '缺失') {
    valStr = '—';
    evidence = `主站省级通道通信中断超时，未在指定窗口内接收到整点数据包。`;
   } else if (cfg.flagLabel === '订正') {
    let correctedVal = el.base + (idx % 4) * 0.4;
    valStr = `${correctedVal.toFixed(el.k === 'wdir' ? 0 : 2)}${el.u ? ' ' + el.u : ''}`;
    evidence = `基于邻近同电压等级站点时空克里金滤波完成自适应订正，置信度 96.8%。`;
   } else if (cfg.flagLabel === '未质控') {
    valStr = '—';
    if (stageName === '数据格式错误') {
     evidence = `报文帧结构校验和错误或含有非标字符，已被前置规约引擎拦截。`;
    } else {
     evidence = `网络链路抖动导致规约握手超时，暂未进入质控引擎判定流程。`;
    }
   }

   const style = QCO_RESULT_STYLE[cfg.flagLabel] || QCO_RESULT_STYLE['正确'];

   pool.push({
    id,
    stationId: `ST-${pName.slice(0, 2)}-${String(idx).padStart(3, '0')}`,
    stationName: deviceName,
    province: pName,
    city: cName,
    deviceName,
    deviceType,
    element: el.k,
    elementName: el.n,
    unit: el.u,
    date: dateStr,
    timeOnly: time,
    flagLabel: cfg.flagLabel,
    stageName,
    value: valStr,
    evidence,
    equipType,
    voltage: volt,
    equipName,
    ownerUnit,
    ...style
   });
  }
 });

 return pool;
}

let qcoDetailChartInstance = null;

function qcoOpenProblemDetail(id) {
 S.detail = null;
 const allPool = qcoGetProblemPool(qcoModalFilter.date);
 const item = allPool.find(x => x.id === id);
 if (!item) return;

 const upperHtml = `
  <div class="qco-detail-upper">
   <!-- 监测站点与断面 -->
   <div class="qco-detail-group">
    <div class="qco-detail-group-title">
     <span>监测站点与断面</span>
     <span class="qco-devtype-tag ${item.deviceType==='变电气象站'?'type-sub':'type-line'}">${esc(item.deviceType)}</span>
    </div>
    <div class="qco-detail-item"><span class="qco-detail-label">记录编号</span><b class="qco-detail-val" style="font-family:var(--pg-number-font)">${item.id}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">监测时次</span><b class="qco-detail-val" style="font-family:var(--pg-number-font)">${item.date} ${item.timeOnly}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">所在省市</span><b class="qco-detail-val">${esc(item.province)} · ${esc(item.city)}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">装置名称</span><b class="qco-detail-val" style="color:#e0f4ff">${esc(item.deviceName)}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">监测要素</span><b class="qco-detail-val">${esc(item.elementName)} (${item.unit || '无单位'})</b></div>
   </div>

   <!-- 关联电网设备 -->
   <div class="qco-detail-group">
    <div class="qco-detail-group-title">
     <span>关联电网设备</span>
     <span style="font-family:var(--pg-number-font);font-size:11px;color:#a2daf0">${esc(item.voltage)}</span>
    </div>
    <div class="qco-detail-item"><span class="qco-detail-label">关联设备</span><b class="qco-detail-val" style="color:#e0f4ff">${esc(item.equipName)}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">设备类型</span><b class="qco-detail-val">${esc(item.equipType)}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">电压等级</span><b class="qco-detail-val" style="font-family:var(--pg-number-font)">${esc(item.voltage)}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">管辖单位</span><b class="qco-detail-val">${esc(item.ownerUnit)}</b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">站点编码</span><b class="qco-detail-val" style="font-family:var(--pg-number-font);color:#8ec9de">${item.stationId}</b></div>
   </div>

   <!-- 质控核验判定 -->
   <div class="qco-detail-group">
    <div class="qco-detail-group-title">
     <span>质控核验判定</span>
     <span class="qcc-flag ${item.flagClass}"><i style="background:${item.flagColor}"></i>${item.flagLabel}</span>
    </div>
    <div class="qco-detail-item"><span class="qco-detail-label">质控结果</span><b class="qco-detail-val"><span class="qcc-flag ${item.flagClass}"><i style="background:${item.flagColor}"></i>${item.flagLabel}</span></b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">异常环节</span><b class="qco-detail-val"><span class="qco-stage-badge">${item.stageName}</span></b></div>
    <div class="qco-detail-item"><span class="qco-detail-label">质控问题值</span><b class="qco-detail-val" style="color:${item.valColor};font-family:var(--pg-number-font);font-size:13px">${item.value}</b></div>
    <div class="qco-detail-item qco-detail-evidence">
     <span class="qco-detail-label">问题证据</span>
     <div class="qco-detail-val">${esc(item.evidence)}</div>
    </div>
   </div>
  </div>
 `;

 const lowerHtml = `
  <div class="qco-detail-lower">
   <div class="qco-detail-chart-header">
    <div class="qco-detail-chart-title">近 24 小时 ${esc(item.elementName)} 趋势图</div>
    <div class="qco-detail-chart-meta">
     <span>时次：${item.date} 00:00 ~ 23:00</span>
     <span>单位：${item.unit || '无单位'}</span>
    </div>
   </div>
   <div id="qco-detail-trend-chart" class="qco-detail-chart-container"></div>
  </div>
 `;

 const actionsHtml = `
  <div class="qco-detail-footer">
   <button class="ds-button primary" type="button" onclick="qcoOpenProblemFix('${item.id}')">立即处置</button>
   <button class="ds-button" type="button" onclick="qcoRestoreAllProblems()">返回清单</button>
  </div>
 `;

 coreOpenModal(
  `${item.deviceName} · 质控结果详情`,
  upperHtml + lowerHtml + actionsHtml
 );

 const modalEl = document.querySelector('#overlay .modal');
 if (modalEl) modalEl.classList.add('qco-detail-dialog');

 setTimeout(() => {
  qcoInitDetailTrendChart(item);
 }, 60);
}

function qcoInitDetailTrendChart(item) {
 const chartDom = document.getElementById('qco-detail-trend-chart');
 if (!chartDom) return;
 if (typeof echarts === 'undefined') {
  chartDom.innerHTML = '<div style="color:#8bb0c7;display:flex;align-items:center;justify-content:center;height:100%">图表组件加载中…</div>';
  return;
 }

 if (qcoDetailChartInstance) {
  try { qcoDetailChartInstance.dispose(); } catch (e) {}
  qcoDetailChartInstance = null;
 }

 const chart = echarts.init(chartDom, null, { renderer: 'canvas' });
 qcoDetailChartInstance = chart;

 const eventHour = parseInt(item.timeOnly.split(':')[0], 10) || 12;
 const hours = [];
 for (let h = 0; h < 24; h++) {
  if (h === eventHour) {
   hours.push(item.timeOnly);
  } else {
   hours.push(`${String(h).padStart(2, '0')}:00`);
  }
 }

 let numericVal = NaN;
 if (item.value && item.value !== '—') {
  const m = item.value.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (m) numericVal = parseFloat(m[0]);
 }

 const refSeries = [];
 const obsSeries = [];
 for (let h = 0; h < 24; h++) {
  let refBase = 20.0;
  if (item.element === 'temp') {
   refBase = 18.0 + 7.5 * Math.sin((h - 8) / 24 * Math.PI * 2);
  } else if (item.element === 'pres') {
   refBase = 1012.0 + 3.0 * Math.cos(h / 12 * Math.PI);
  } else if (item.element === 'rh') {
   refBase = 72.0 - 24.0 * Math.sin((h - 8) / 24 * Math.PI * 2);
  } else if (item.element === 'wspd') {
   refBase = 3.6 + 2.2 * Math.sin(h / 12 * Math.PI);
  } else if (item.element === 'rad') {
   refBase = (h >= 6 && h <= 18) ? Math.max(0, 560 * Math.sin((h - 6) / 12 * Math.PI)) : 0;
  } else if (item.element === 'efld') {
   refBase = 0.12 + 0.05 * Math.sin(h / 12 * Math.PI);
  } else {
   refBase = 15.0;
  }
  refBase = Number(refBase.toFixed(item.element === 'efld' ? 2 : 1));
  refSeries.push(refBase);

  if (h === eventHour) {
   if (!isNaN(numericVal) && numericVal !== null) {
    obsSeries.push(numericVal);
   } else {
    obsSeries.push(null);
   }
  } else {
   const seed = (item.id.charCodeAt(item.id.length - 1) || 5) + h * 2;
   const noise = Math.sin(seed) * (item.element === 'efld' ? 0.03 : 0.6);
   obsSeries.push(Number((refBase + noise).toFixed(item.element === 'efld' ? 2 : 1)));
  }
 }

 const markTargetVal = (!isNaN(numericVal) && numericVal !== null) ? numericVal : refSeries[eventHour];
 const markPointData = [
  {
   name: '质控问题时刻',
   coord: [hours[eventHour], markTargetVal],
   value: item.value,
   itemStyle: {
    color: item.flagColor || '#f0ad4e',
    borderColor: '#ffffff',
    borderWidth: 1.5,
    shadowBlur: 10,
    shadowColor: item.flagColor || '#f0ad4e'
   },
   label: {
    formatter: `${item.flagLabel}: ${item.value}`,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: 'rgba(10,25,38,0.85)',
    padding: [3, 6],
    borderRadius: 3,
    borderColor: item.flagColor || '#f0ad4e',
    borderWidth: 1,
    position: 'top',
    distance: 6
   }
  }
 ];

 const option = {
  animation: true,
  animationDuration: 400,
  textStyle: { fontFamily: 'inherit', fontSize: 11, color: '#9bbecf' },
  grid: { left: 45, right: 35, top: 38, bottom: 28 },
  legend: {
   top: 4,
   right: 20,
   textStyle: { color: '#adc8d8', fontSize: 11 },
   itemWidth: 16,
   itemHeight: 8,
   data: ['实际观测原值', '参考基准线']
  },
  tooltip: {
   trigger: 'axis',
   confine: true,
   backgroundColor: 'rgba(8, 25, 40, 0.94)',
   borderColor: '#4d87a4',
   borderWidth: 1,
   textStyle: { color: '#e5f6fd', fontSize: 11 },
   formatter: (params) => {
    if (!params || !params.length) return '';
    const hStr = params[0].axisValueLabel || params[0].name;
    const isEvent = (hStr === hours[eventHour]);
    let html = `<div style="font-weight:700;margin-bottom:5px;border-bottom:1px solid #48789544;padding-bottom:3px;color:#7ee8f5">${hStr} · ${item.elementName}</div>`;
    params.forEach(p => {
     const val = (p.value !== null && p.value !== undefined) ? `${p.value} ${item.unit || ''}` : '<span style="color:#8ba9be">无上报（缺测/缺失）</span>';
     html += `<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a8c7d8">${p.marker} ${p.seriesName}</span><b style="font-family:var(--pg-number-font)">${val}</b></div>`;
    });
    if (isEvent) {
     html += `<div style="margin-top:4px;padding-top:4px;border-top:1px dashed #48789555;color:${item.valColor};font-size:10px">判定：【${item.flagLabel}】${item.stageName}</div>`;
    }
    return html;
   }
  },
  xAxis: {
   type: 'category',
   data: hours,
   boundaryGap: false,
   axisLine: { lineStyle: { color: '#385e78' } },
   axisTick: { show: false },
   axisLabel: { color: '#88aabd', fontSize: 10, interval: 2 }
  },
  yAxis: {
   type: 'value',
   scale: true,
   axisLine: { show: false },
   axisTick: { show: false },
   axisLabel: { color: '#88aabd', fontSize: 10, formatter: `{value} ${item.unit || ''}` },
   splitLine: { lineStyle: { color: '#2a526e44', type: 'dashed' } }
  },
  series: [
   {
    name: '实际观测原值',
    type: 'line',
    data: obsSeries,
    smooth: 0.25,
    symbol: 'circle',
    symbolSize: 4,
    showSymbol: false,
    lineStyle: { color: item.flagColor || '#7ee8f5', width: 2 },
    itemStyle: { color: item.flagColor || '#7ee8f5' },
    markPoint: {
     data: markPointData
    }
   },
   {
    name: '参考基准线',
    type: 'line',
    data: refSeries,
    smooth: 0.25,
    symbol: 'none',
    lineStyle: { color: '#688d9e', width: 1.5, type: 'dashed' },
    itemStyle: { color: '#688d9e' }
   }
  ]
 };

 chart.setOption(option);

 const resizeObserver = new ResizeObserver(() => {
  if (chartDom.isConnected) chart.resize();
 });
 resizeObserver.observe(chartDom);
}

function qcoOpenProblemFix(id) {
 const allPool = qcoGetProblemPool(qcoModalFilter.date);
 const item = allPool.find(x => x.id === id);
 if (!item) return;

 if (item.eventId && events.some(e => e.id === item.eventId)) {
  closeModal();
  dsEventDialog(item.eventId);
  return;
 }

 const defaultFlag = item.flagLabel === '订正' ? '5' : (item.flagLabel === '错误' ? '3' : (item.flagLabel === '缺失' ? '4' : '2'));
 const formHtml = `
  <div class="qcc-info">
   <div><span>记录编号</span><b>${item.id}</b></div>
   <div><span>装置名称</span><b>${item.deviceName}</b></div>
   <div><span>要素及原值</span><b>${item.elementName} · ${item.value}</b></div>
   <div><span>质控判定</span><b><span class="qcc-flag ${item.flagClass}"><i style="background:${item.flagColor}"></i>${item.flagLabel}</span> (${item.stageName})</b></div>
   <div><span>关联设备</span><b>${item.equipName} (${item.voltage})</b></div>
  </div>
  <form class="qcc-fix-form" onsubmit="qcoSubmitProblemFix(event, '${item.id}');return false">
   <div class="form-field"><label>处置结论</label>
    ${typeof dsRenderSelect === 'function' ? dsRenderSelect({
      id: 'qco-fix-conclusion',
      value: defaultFlag,
      options: [
        { value: '5', label: '订正（保留原值，另存订正值）' },
        { value: '2', label: '可疑（保留原值，待复核）' },
        { value: '3', label: '错误（标记不可用）' },
        { value: '1', label: '正确（撤销异常标识）' },
        { value: '4', label: '缺失（确认通道断测）' }
      ],
      ariaLabel: '处置结论'
    }) : `<select id="qco-fix-conclusion"><option value="5">订正（保留原值，另存订正值）</option><option value="2">可疑（保留原值，待复核）</option><option value="3">错误（标记不可用）</option><option value="1">正确（撤销异常）</option><option value="4">缺失（确认断测）</option></select>`}
   </div>
   <div class="form-field"><label>订正方式</label>
    ${typeof dsRenderSelect === 'function' ? dsRenderSelect({
      id: 'qco-fix-method',
      value: '邻站空间插值',
      options: ['邻站空间插值', '动态线性时序插值', '数值模式实况替代', '自适应中位数重采样', '专家人工复核确认'],
      ariaLabel: '订正方式'
    }) : `<select id="qco-fix-method"><option>邻站空间插值</option><option>动态线性时序插值</option><option>数值模式实况替代</option></select>`}
   </div>
   <label>订正数值（${item.unit || ''}）
    <input id="qco-fix-value" type="text" placeholder="输入订正后有效数值" value="${item.value !== '—' ? item.value.split(' ')[0] : ''}" />
   </label>
   <label>处置依据与说明
    <textarea id="qco-fix-memo" rows="3" placeholder="填写现场协同核查情况、参考站依据及处置说明">${esc(item.evidence)}</textarea>
   </label>
   <div class="qcc-preserve">原始观测值始终保全；订正值、质量标识及处置流水独立持久化留痕。</div>
   <div class="qcc-button-row" style="margin-top:10px">
    <button class="ds-button primary" type="submit">提交处置结论</button>
    <button class="ds-button" type="button" onclick="qcoRestoreAllProblems()">返回清单</button>
   </div>
  </form>
 `;

 coreOpenModal(`${item.deviceName} · 质控处置`, formHtml);
}

function qcoSubmitProblemFix(event, id) {
 event.preventDefault();
 const conclusionSelect = document.getElementById('qco-fix-conclusion');
 const valInput = document.getElementById('qco-fix-value');
 const memoInput = document.getElementById('qco-fix-memo');
 const methodSelect = document.getElementById('qco-fix-method');

 const conclusion = conclusionSelect?.dataset?.value || conclusionSelect?.value || '5';
 const fixVal = valInput?.value?.trim();
 const memo = memoInput?.value?.trim() || '完成质量结果闭环处置。';
 const method = methodSelect?.dataset?.value || methodSelect?.value || '人工复核';

 const conclusionMap = { '5': '订正', '2': '可疑', '3': '错误', '1': '正确', '4': '缺失' };
 const flagLabel = conclusionMap[conclusion] || '订正';

 const allPool = qcoGetProblemPool(qcoModalFilter.date);
 const target = allPool.find(x => x.id === id);
 if (target) {
  target.flagLabel = flagLabel;
  target.stageName = flagLabel === '订正' ? '自适应订正' : target.stageName;
  if (fixVal) target.value = `${fixVal} ${target.unit || ''}`;
  target.evidence = `【已处置】${memo}（方式：${method}）`;
  const style = QCO_RESULT_STYLE[flagLabel] || QCO_RESULT_STYLE['正确'];
  Object.assign(target, style);
 }

 toast(`记录 ${id} 已完成【${flagLabel}】处置并保存轨迹。`);
 qcoRestoreAllProblems();
}

function qcoToggleCategorySelect(val, event) {
 if (event) {
  event.stopPropagation();
  event.preventDefault();
 }
 const ALL_RESULTS = ['正确', '错误', '可疑', '缺测', '缺失', '订正', '未质控'];
 if (!Array.isArray(qcoModalFilter.categories)) {
  qcoModalFilter.categories = ['错误', '可疑'];
 }
 const list = qcoModalFilter.categories;

 if (val === '__all__') {
  if (list.length === ALL_RESULTS.length) {
   qcoModalFilter.categories = [];
  } else {
   qcoModalFilter.categories = [...ALL_RESULTS];
  }
 } else {
  const idx = list.indexOf(val);
  if (idx > -1) {
   list.splice(idx, 1);
  } else {
   list.push(val);
  }
 }
 qcoModalFilter.page = 1;

 const container = document.getElementById('qco-problems-container');
 if (container) {
  container.innerHTML = qcoRenderProblemsModalContent();
  const dropdown = document.getElementById('qco-filter-category-select');
  if (dropdown) {
   dropdown.classList.add('is-open');
   dropdown.querySelector('.ds-cs-trigger')?.setAttribute('aria-expanded', 'true');
  }
 }
}

function qcoRenderCategoryMultiSelect(selectedCategories = []) {
 const ALL_RESULTS = ['正确', '错误', '可疑', '缺测', '缺失', '订正', '未质控'];
 const isAll = ALL_RESULTS.length > 0 && ALL_RESULTS.every(r => selectedCategories.includes(r));

 let labelText = '请选择质控结果';
 if (isAll) {
  labelText = '全部质控结果';
 } else if (selectedCategories.length > 0) {
  labelText = selectedCategories.join('、');
 }

 const downIcon = typeof icon === 'function' ? icon('down') : '<svg class="icon" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';

 return `
  <div class="ds-custom-select qco-filter-cs qco-multi-select" id="qco-filter-category-select" style="min-width:140px">
   <button type="button" class="ds-cs-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="质控结果多选" onclick="dsToggleCustomSelect('qco-filter-category-select', event)">
    <span class="ds-cs-label" title="${esc(labelText)}">${esc(labelText)}</span>
    <span class="ds-cs-arrow" aria-hidden="true">${downIcon}</span>
   </button>
   <div class="ds-cs-menu" role="listbox" aria-label="质控结果多选项" onclick="event.stopPropagation()">
    <div class="ds-cs-scroll" style="max-height:280px">
     <div class="ds-cs-option is-multi ds-cs-option-all ${isAll ? 'selected' : ''}" role="option" aria-selected="${isAll}" onclick="qcoToggleCategorySelect('__all__', event)">
      <span class="ds-cs-checkbox"></span>
      <span class="ds-cs-opt-text" style="font-weight:600">全选全部结果</span>
     </div>
     ${ALL_RESULTS.map(r => {
       const isSel = selectedCategories.includes(r);
       const style = QCO_RESULT_STYLE[r] || QCO_RESULT_STYLE['正确'];
       return `
        <div class="ds-cs-option is-multi ${isSel ? 'selected' : ''}" role="option" aria-selected="${isSel}" onclick="qcoToggleCategorySelect('${r}', event)">
         <span class="ds-cs-checkbox"></span>
         <span class="ds-cs-opt-text" style="display:flex;align-items:center;gap:6px">
          <i style="width:6px;height:6px;border-radius:1px;background:${style.flagColor};display:inline-block"></i>
          <span>${r}</span>
         </span>
        </div>
       `;
     }).join('')}
    </div>
   </div>
  </div>
 `;
}

let qcoModalFilter = {
 categories: ['错误', '可疑'],
 scope: 'all',
 element: 'temp',
 deviceType: 'all',
 date: '2026-10-23',
 search: '',
 page: 1,
 pageSize: 50
};

function qcoGeneratePageButtons(currentPage, totalPages) {
 if (totalPages <= 7) {
  return Array.from({ length: totalPages }, (_, i) => i + 1);
 }
 const pages = [];
 if (currentPage <= 4) {
  for (let i = 1; i <= 5; i++) pages.push(i);
  pages.push('...');
  pages.push(totalPages);
 } else if (currentPage >= totalPages - 3) {
  pages.push(1);
  pages.push('...');
  for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
 } else {
  pages.push(1);
  pages.push('...');
  pages.push(currentPage - 1);
  pages.push(currentPage);
  pages.push(currentPage + 1);
  pages.push('...');
  pages.push(totalPages);
 }
 return pages;
}

function qcoSetModalPage(page) {
 const p = parseInt(page, 10);
 if (isNaN(p) || p < 1) return;
 qcoModalFilter.page = p;
 const container = document.getElementById('qco-problems-container');
 if (container) {
  container.innerHTML = qcoRenderProblemsModalContent();
  const tableWrap = container.querySelector('.qcc-table-wrap');
  if (tableWrap) tableWrap.scrollTop = 0;
 }
}

function qcoOpenAllProblems(category) {
 S.detail = null;
 const initialCategories = category ? [category] : ['错误', '可疑'];
 const initialScope = (S.scope && S.scope !== '全国') ? S.scope : 'all';
 let initialElement = 'temp';
 if (S.element && S.element !== '综合') {
  const found = QC_REFERENCE.ELS.find(e => e.n === S.element || e.k === S.element);
  if (found) initialElement = found.k;
 }

 qcoModalFilter = {
  categories: initialCategories,
  scope: initialScope,
  element: initialElement,
  deviceType: 'all',
  date: S.selectedDate || '2026-10-23',
  search: '',
  page: 1,
  pageSize: 50
 };

 qcoRestoreAllProblems();
}

function qcoRestoreAllProblems() {
 coreOpenModal(
  '质控结果清单',
  `<div id="qco-problems-container">${qcoRenderProblemsModalContent()}</div>`
 );
 document.querySelector('#overlay .modal')?.classList.add('qco-problems-dialog');
}

function qcoSetModalFilter(key, value) {
 qcoModalFilter[key] = value;
 qcoModalFilter.page = 1;
 const container = document.getElementById('qco-problems-container');
 if (container) {
  const activeInput = document.activeElement && document.activeElement.matches('.qco-dialog-search input') ? document.activeElement : null;
  const start = activeInput ? activeInput.selectionStart : null;
  const end = activeInput ? activeInput.selectionEnd : null;

  container.innerHTML = qcoRenderProblemsModalContent();

  if (activeInput) {
   const input = container.querySelector('.qco-dialog-search input');
   if (input) {
    input.focus();
    if (start != null && end != null) {
     input.setSelectionRange(start, end);
    }
   }
  }
 }
}

function qcoResetModalFilter() {
 qcoModalFilter = {
  categories: ['错误', '可疑'],
  scope: 'all',
  element: 'temp',
  deviceType: 'all',
  date: '2026-10-23',
  search: '',
  page: 1,
  pageSize: 50
 };
 const container = document.getElementById('qco-problems-container');
 if (container) {
  container.innerHTML = qcoRenderProblemsModalContent();
 }
}

function qcoRenderProblemsModalContent() {
 const filter = qcoModalFilter;
 const allPool = qcoGetProblemPool(filter.date);

 const activeCategories = (Array.isArray(filter.categories) && filter.categories.length > 0) ? filter.categories : ['错误', '可疑'];

 const filteredList = allPool.filter(item => {
  if (!activeCategories.includes(item.flagLabel)) return false;
  if (filter.scope !== 'all' && item.province !== filter.scope) return false;
  if (filter.element && item.element !== filter.element && item.elementName !== filter.element) return false;
  if (filter.deviceType !== 'all' && item.deviceType !== filter.deviceType) return false;
  if (filter.search) {
   const q = filter.search.toLowerCase();
   const text = `${item.deviceName} ${item.stationName} ${item.stationId} ${item.equipName} ${item.ownerUnit} ${item.evidence}`.toLowerCase();
   if (!text.includes(q)) return false;
  }
  return true;
 });

 // 分页处理：固定 50 条/页
 const pageSize = 50;
 const totalItems = filteredList.length;
 const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
 const currentPage = Math.max(1, Math.min(filter.page || 1, totalPages));
 filter.page = currentPage;

 const startIndex = (currentPage - 1) * pageSize;
 const endIndex = Math.min(startIndex + pageSize, totalItems);
 const pagedItems = filteredList.slice(startIndex, endIndex);

 const toolbarHtml = `
  <div class="qco-dialog-toolbar">
   <div class="qco-dialog-left">
    ${qcoRenderCategoryMultiSelect(activeCategories)}
    <div class="qco-dialog-date" title="单日日期查询">
     <input type="date" class="qco-filter-date-input" value="${filter.date || '2026-10-23'}" onchange="qcoSetModalFilter('date', this.value)" aria-label="查询日期" />
    </div>
   </div>
   <div class="qco-dialog-right">
    ${dsRenderSelect({
      id: 'qco-filter-scope',
      value: filter.scope,
      options: [
        { value: 'all', label: '全国' },
        ...(typeof CHINA_DIVISIONS !== 'undefined' ? CHINA_DIVISIONS.map(p => ({ value: p.name, label: p.short })) : provinces.map(p => ({ value: p.n, label: p.short })))
      ],
      className: 'qco-filter-cs',
      ariaLabel: '省份范围',
      onchange: "qcoSetModalFilter('scope', this.dataset.value)"
    })}
    ${dsRenderSelect({
      id: 'qco-filter-element',
      value: filter.element || 'temp',
      options: [
        { value: 'temp', label: '气温' },
        { value: 'pres', label: '气压' },
        { value: 'rh', label: '相对湿度' },
        { value: 'wspd', label: '风速' },
        { value: 'wdir', label: '风向' },
        { value: 'rain', label: '雨量' },
        { value: 'rad', label: '总辐射' },
        { value: 'efld', label: '大气电场' }
      ],
      className: 'qco-filter-cs',
      ariaLabel: '监测要素',
      onchange: "qcoSetModalFilter('element', this.dataset.value)"
    })}
    ${dsRenderSelect({
      id: 'qco-filter-devicetype',
      value: filter.deviceType,
      options: [
        { value: 'all', label: '全部装置类型' },
        { value: '变电气象站', label: '变电气象站' },
        { value: '输电气象站', label: '输电气象站' }
      ],
      className: 'qco-filter-cs',
      ariaLabel: '装置类型',
      onchange: "qcoSetModalFilter('deviceType', this.dataset.value)"
    })}
    <div class="qco-dialog-search">
     ${icon('search')}
     <input type="text" placeholder="搜索装置 / 杆塔 / 设备" value="${esc(filter.search)}" oninput="qcoSetModalFilter('search', this.value)" aria-label="搜索装置名称" />
    </div>
    <button type="button" class="qco-btn-reset" onclick="qcoResetModalFilter()">重置</button>
   </div>
  </div>
 `;

 const headers = [
  '日期', '时间', '所在省', '装置名称', '装置类型', 
  '要素', '质控结果', '质控异常环节', '质控问题值', '问题证据', 
  '电压等级', '操作'
 ];

 const tableRows = pagedItems.map(item => [
  `<span style="white-space:nowrap;font-family:var(--pg-number-font)">${item.date}</span>`,
  `<span style="white-space:nowrap;font-family:var(--pg-number-font)">${item.timeOnly}</span>`,
  `<span style="white-space:nowrap">${esc(item.province)}</span>`,
  `<button type="button" class="qco-tbl-btn" onclick="qcoOpenProblemDetail('${item.id}')" title="查看详情"><strong>${esc(item.deviceName)}</strong></button>`,
  `<span class="qco-devtype-tag ${item.deviceType==='变电气象站'?'type-sub':'type-line'}">${esc(item.deviceType)}</span>`,
  `<span style="white-space:nowrap">${esc(item.elementName)}</span>`,
  `<span class="qcc-flag ${item.flagClass}"><i style="background:${item.flagColor}"></i>${item.flagLabel}</span>`,
  `<span class="qco-stage-badge">${esc(item.stageName)}</span>`,
  `<b style="color:${item.valColor};font-family:var(--pg-number-font);white-space:nowrap">${item.value}</b>`,
  `<span title="${esc(item.evidence)}" class="qco-evidence-text">${esc(item.evidence)}</span>`,
  `<span style="white-space:nowrap;font-family:var(--pg-number-font)">${esc(item.voltage)}</span>`,
  `<div class="qco-action-btns"><button type="button" class="qco-btn-op" onclick="qcoOpenProblemDetail('${item.id}')">详情</button><button type="button" class="qco-btn-op op-fix" onclick="qcoOpenProblemFix('${item.id}')">处置</button></div>`
 ]);

 const tableHtml = qccTable(headers, tableRows);

 // 生成页码列表
 const pageBtns = qcoGeneratePageButtons(currentPage, totalPages);
 const pageBtnsHtml = pageBtns.map(btn => {
  if (btn === '...') return `<span class="qco-page-ellipsis">…</span>`;
  return `<button type="button" class="qco-page-num ${btn===currentPage?'active':''}" onclick="qcoSetModalPage(${btn})">${btn}</button>`;
 }).join('');

 const paginationHtml = `
  <div class="qco-pagination-bar">
   <div class="qco-page-info">
    <span>共 <b>${totalItems}</b> 条记录</span>
    <span>第 <b>${totalItems ? startIndex + 1 : 0}-${endIndex}</b> 条</span>
   </div>
   <div class="qco-page-controls">
    <button type="button" class="qco-page-btn" ${currentPage<=1?'disabled':''} onclick="qcoSetModalPage(1)">首页</button>
    <button type="button" class="qco-page-btn" ${currentPage<=1?'disabled':''} onclick="qcoSetModalPage(${currentPage-1})">上一页</button>
    <div class="qco-page-numbers">${pageBtnsHtml}</div>
    <button type="button" class="qco-page-btn" ${currentPage>=totalPages?'disabled':''} onclick="qcoSetModalPage(${currentPage+1})">下一页</button>
    <button type="button" class="qco-page-btn" ${currentPage>=totalPages?'disabled':''} onclick="qcoSetModalPage(${totalPages})">末页</button>
   </div>
   <div class="qco-page-jump">
    <span>跳至</span>
    <input type="number" min="1" max="${totalPages}" value="${currentPage}" onkeydown="if(event.key==='Enter'){event.preventDefault();qcoSetModalPage(this.value)}" onchange="qcoSetModalPage(this.value)" aria-label="跳转页码" />
    <span>/ ${totalPages} 页</span>
   </div>
  </div>
 `;

 return toolbarHtml + tableHtml + paginationHtml;
}

qccOverview=function(){return `<div class="qco-col-right">${qcoQualityCard()}${qcoProvinceCard()}</div>`+`<div class="qco-map-bottom">${qcoProblemCard()}${qcoTrendCard()}</div>`;};

function qcoToggleStage(id){
 const targetTab=id==='channel'?'connect':id;
 if(S.tab===targetTab){
  if(typeof tileView==='object')tileView.status='all';
  changeTab('summary');
  return;
 }
 qcoEnterStage(id);
}

function qcoOpenQualityFlag(flag){if(flag!=='good'){qcoOpenResults(flag);return;}S.detail=null;const d=qcoQualitySummary();coreOpenModal('正确与订正样本',qccInfo([['正确样本',num(d.flags[1])+' 条'],['已订正样本',num(d.flags[5])+' 条'],['合计',num(d.quality.good)+' 条'],['样本可用率',qcoPercent(d.quality.usable)]])+qccAction('查看正确样本',"qcoOpenResults('1')",true)+qccAction('查看订正样本',"qcoOpenResults('5')"));}
function qcoOpenQualityScope(){S.detail=null;const rows=qccRows(),d=qcoQualitySummary(rows);coreOpenModal('质量结果分布 · 统计说明',qccInfo([['范围 / 时段',S.scope+' / '+S.period],['统计对象',d.stationCount+' 个重点站 · '+d.elementCount+' 类要素'],['样本总数',num(rows.length)+' 条']])+qccTable(['质量标识','样本数 / 条','占比'],qcoResultBands(rows).map(item=>[item.label,num(item.count),qcoPercent(item.share)]))+qccNote('六种标识互斥且覆盖全部样本，单项占比 = 该标识样本数 / 全部样本数。该面板展示质量结果；到报率、完整性、关联一致率、可用率等过程与评估指标集中在质控体系中。全网站点和重点站观测样本分别统计。'));}
function qcoOpenElementMatrix(){
 S.detail=null;
 coreOpenModal('监测要素质量分布 · '+S.scope+' ('+S.period+')', qcoElementRankHtml());
 document.querySelector('#overlay .modal')?.classList.add('qco-element-rank-dialog');
}
function qcoOpenIssueRank(key){S.detail=null;const all=qcoIssueRanking(),item=all.find(item=>item.key===key);if(!item){coreOpenModal('异常类型分布',qccTable(['异常类型','异常样本 / 条','操作'],all.map(item=>[item.label,num(item.count),qccAction('查看样本',`qcoOpenIssueRank('${item.key}')`)]))+qccNote('可疑、错误、缺失样本按要素与主因归类，每条样本仅计一次；右侧方法统计允许交叉命中，两种统计不可直接相加。'));return;}coreOpenModal(item.label+' · 异常样本',qccTable(['站点','时次','原始观测','质量标识'],item.rows.slice(0,60).map(r=>[station(r.station).n,r.time,qccValue(r.value)+' '+QCC_ELEMENT[r.element].u,qccFlag(r.flag)]))+qccNote(`当前范围 ${S.scope} / ${S.period}，共 ${num(item.count)} 条${item.count>60?'，此处预览前60条':''}。主因采用关联问题的类型，附加方法命中不重复计数。`)+qccAction('查看关联质控结果',`qcoRankResults('${item.element}','${item.method}')`,true));}
function qcoRankResults(element,method){closeModal();if(typeof tileView==='object')tileView.status='all';S.qccMethod=method;S.qccFlag='all';S.tab=qccResultStage(method);S.qccSearch=QCC_ELEMENT[element].n;S.qccPage=0;render();}

function qcoOpenMethod(id){if(!QCC_METHOD[id])return;closeModal();if(typeof tileView==='object')tileView.status='all';S.qccFlag='all';S.qccMethod=id;S.qccPage=0;S.qccSearch='';S.tab=qccResultStage(id);render();}
function qcoOpenEval(evalTab='model'){closeModal();if(typeof tileView==='object')tileView.status='all';S.qccEval=evalTab;S.tab='evaluation';render();}
function qcoOpenMethods(){S.detail=null;coreOpenModal('关键质控方法 · 结果明细',qccTable(['质控方法','样例观测','异常命中 / 条','已判定 / 条','样本占比','操作'],QC_REFERENCE.METHODS.map(method=>{const m=qcoMethodStats(method.id);return [m.name,`<span title="${esc(m.sampleNote)}">${esc(m.sampleText)}</span>`,num(m.hits),num(m.checked),qcoPercent(m.share),qccAction('进入方法页面',`qcoOpenMethod('${m.id}')`)];}))+qccNote('样例观测为当前窗口的代表异常原值，不是方法阈值。样本占比 = 本方法异常命中 / 已判定样本；同一样本可命中多个方法，各方法命中数不可直接相加。当前为演示方法关联结果，不等同于真实执行日志的通过率。'));}
function qcoOpenResults(flag){if(flag==='checked'){S.detail=null;const f=qccFlags();coreOpenModal('自动判定样本',qccInfo([['样本总数',num(qccRows().length)+' 条'],['已判定',num(qccRows().length-f[0])+' 条'],['未质控',num(f[0])+' 条']])+qccNote('已判定表示具有正确、可疑、错误、缺失或订正标识，不等同于自动修正或问题已闭环。')+qccAction('查看全部质控结果',"qcoOpenResults('all')",true));return;}closeModal();if(typeof tileView==='object')tileView.status='all';S.qccMethod='missing';S.qccFlag=flag==='checked'?'all':flag;S.qccSearch='';S.qccPage=0;S.tab='rapid';render();}
function qcoOpenFix(status){closeModal();if(typeof tileView==='object')tileView.status='all';S.tab='rapid';render();}
function qcoSetTrend(days){S.qcoTrend=days==='7'?'7':'30';render();document.querySelector(`.qco-trend-card button[onclick="qcoSetTrend('${S.qcoTrend}')"]`)?.focus({preventScroll:true});}
function qcoDimensionInfo(rows){const m=qcoQuality(rows);return qccInfo([['样本总数',num(m.n)+' 条'],['缺失 / 未质控',m.missing+' / '+m.unchecked+' 条'],['正确及订正',m.good+' 条'],['完整性','(全部 − 缺失) / 全部'],['合格性','正确及订正 / (全部 − 缺失 − 未质控)'],['一致性','(已质控非缺失 − 一致性异常) / 已质控非缺失'],['可用性','正确及订正 / 全部']])+qccNote('一致性异常取时间、空间、内部一致性与持续性检查命中的可疑、错误样本；多方法命中按样本去重。');}
function qcoOpenHeat(element,dimension){const el=QCC_ELEMENT[element],rows=qccRows().filter(r=>r.element===element);S.detail=null;coreOpenModal(el.n+' · '+QCO_DIMS.find(([k])=>k===dimension)[1],qcoDimensionInfo(rows)+qccAction('查看该要素质控结果',`qcoElementResults('${element}')`,true));}
function qcoElementResults(element){closeModal();if(typeof tileView==='object')tileView.status='all';S.qccMethod='missing';S.qccFlag='all';S.tab='rapid';S.qccSearch=QCC_ELEMENT[element].n;render();}
function qcoOpenStage(id){qcoEnterStage(id);}
function qcoEnterStage(id){closeModal();const targetTab=id==='channel'?'connect':id;if(typeof tileView==='object'&&S.tab!==targetTab)tileView.status='all';S.tab=targetTab;S.qccPage=0;S.qccSearch='';if(id==='rapid'){S.qccFlag='all';if(!QCC_STAGE_METHODS.rapid.includes(S.qccMethod))S.qccMethod='missing';}else if(id==='province'){S.qccFlag='all';if(!QCC_STAGE_METHODS.province.includes(S.qccMethod))S.qccMethod='space';}else if(id==='evaluation'){S.qccEval=S.qccEval||'model';if(!S.element||S.element==='综合')S.element='气压';}render();}
function qcoOpenAssociation(method){closeModal();if(typeof tileView==='object')tileView.status='all';S.qccFlag='all';S.qccMethod=method;S.qccPage=0;S.qccSearch='';S.tab='province';render();}
function qcoProvinceLogic(){S.detail=null;coreOpenModal('省级质控 · 关联分析逻辑',qccTable(['分析维度','输入要求','判定逻辑（设计）','输出'],[['时序关联','同站、同要素的连续观测','时间对齐、突变与持续性核查','时间一致性标识与异常时段'],['邻站空间比对','邻站同要素、位置与地形元数据','按场景筛选参考站、比较空间偏差','空间一致性标识与参考依据'],['多要素联判','同站温湿、风向风速等相关要素','单位与时次对齐、物理关系约束','内部一致性标识与关联证据']])+qccNote('以上为省级质控的输入与逻辑设计。当前指标关联既有演示规则结果；完整邻站参考序列、省端执行日志和判定阈值需后续接入，关联异常按记录去重。')+qccAction('查看空间关联样本',"qcoOpenAssociation('space')",true));}
function qcoOpenValidationTasks(){S.detail=null;const tasks=qcoValidationTasks();coreOpenModal('试验验证 · 关联任务样本',qccTable(['任务编号','验证内容','责任范围','阶段'],tasks.map(row=>[esc(row[0]),esc(row[1]),esc(row[2]),esc(row[3])]))+qccNote('关联原型中已有的验证任务样本；尚无执行用例和试验判定结果，不能据此计算通过率。')+qccAction('查看试验指标定义','qcoValidationDefinitions()',true));}
function qcoValidationDefinitions(){S.detail=null;coreOpenModal('试验验证 · 指标定义',qccTable(['指标','计算口径','所需证据'],[['试验通过率','通过用例 / 已执行用例','用例记录、通过判据、试验结论'],['误报率','FP / (FP + TN)','固定数据集、真实正常标签'],['漏报率','FN / (TP + FN)','固定数据集、真实异常标签'],['识别准确率','(TP + TN) / 全部标注样本','标准真值与算法输出'],['召回率','TP / (TP + FN)','标准异常样本集'],['处理时延','处理完成时间 − 数据到达时间','执行起止日志；可统计P95'],['场景覆盖率','已验证场景 / 要求验证场景','工况目录、试验记录']])+qccNote('TP为正确检出的异常，FP为正常样本被误报，TN为正确判定的正常，FN为漏检的异常。各分母为0时显示“—”；不填入未经验证的效果值。'));}
function qcoProblemDistribution(){const list=filteredEvents(),types=[...new Set(list.map(e=>e.type))];S.detail=null;coreOpenModal('问题类型分布',qccRank(types.map(t=>[t,list.filter(e=>e.type===t).length]),Math.max(1,...types.map(t=>list.filter(e=>e.type===t).length)))+qccNote(`当前范围 ${S.scope} / ${S.period}，共 ${list.length} 项问题。按事件类型统计，不与质控样本条数相加。`)+qccAction('查看全部问题',"qcoOpenFix('全部')",true));}

const qcoPreviousPopup=premiumMapPopup;
premiumMapPopup=function(){let html=qcoPreviousPopup();const st=station(S.selectedStation);if(S.tab==='summary'&&st){html=html.replace('<span>质控合格率</span>','<span>重点样本可用率</span>').replace(st.quality.toFixed(2)+'%',qcoPercent(qcoQuality(qccRows().filter(r=>r.station===st.id)).usable));}return html;};
qualityCatalog.summary.features=['全网站点地图与状态筛选','六类质量标识数量与占比分布','方法与过程指标按环节归集','省级装置分布与在线率','质控问题清单与分类追溯','数据质量堆叠趋势分析','八类监测要素质量矩阵','质控体系：链路通道与快速质控','省级质控：时空与多要素关联','数据评估与试验验证'];

const qcoPreviousRender = render;
render = function() {
 qcoPreviousRender();
 qcoInitProblemScroll();
 if (typeof initAllAutoScrolls === 'function') initAllAutoScrolls();
 requestAnimationFrame(() => { if (typeof tileView === 'object' && tileView.map) tileView.map.resize(); });
};
render();
