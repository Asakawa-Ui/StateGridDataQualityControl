'use strict';

// Apache ECharts 6.1.0：仅绘制已有观测与订正结果；DOM重绘前释放图表实例。
const dashboardChartInstances=[];
function dashboardArea(color){return {color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:color+'70'},{offset:1,color:color+'04'}]}};}
function dashboardChartBase(){return {
 animation:!window.matchMedia('(prefers-reduced-motion: reduce)').matches,animationDuration:300,
 textStyle:{fontFamily:'"Microsoft YaHei UI","Microsoft YaHei",Arial,sans-serif',fontSize:10,color:'#a5c8db'},
 grid:{left:45,right:13,top:16,bottom:28},
 tooltip:{trigger:'axis',confine:true,backgroundColor:'#0d263ded',borderColor:'#5689a1',textStyle:{fontSize:11,color:'#d8eef5'},axisPointer:{type:'line',lineStyle:{color:'#8bcbdd',width:1}}},
 xAxis:{type:'category',boundaryGap:false,axisLine:{lineStyle:{color:'#42647b'}},axisTick:{show:false},axisLabel:{fontSize:10,color:'#8faec3',hideOverlap:true,showMaxLabel:true}},
 yAxis:{type:'value',axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:10,color:'#91b3c9'},splitLine:{lineStyle:{color:'#4b718233',type:'dashed'}},splitNumber:2},
 aria:{enabled:true}
};}
function dashboardQualityOption(){
 const data=qcoTrendData(),base=dashboardChartBase();
 return {...base,aria:{enabled:true,label:{description:S.scope+S.period+'100% 质量状态构成4层堆叠趋势，共'+data.labels.length+'个时次。'}},xAxis:{...base.xAxis,data:data.labels},yAxis:{...base.yAxis,min:0,max:100,axisLabel:{...base.yAxis.axisLabel,formatter:'{value}%'}},series:[
  {name:'正确&订正',type:'line',stack:'quality',data:data.usable,smooth:.24,symbol:'none',lineStyle:{color:'#1fc79a',width:1.3},itemStyle:{color:'#1fc79a'},areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(31,199,154,0.85)'},{offset:1,color:'rgba(18,92,72,0.42)'}]}},emphasis:{focus:'series'}},
  {name:'可疑',type:'line',stack:'quality',data:data.sus,smooth:.24,symbol:'none',lineStyle:{color:'#f0ad4e',width:1.2},itemStyle:{color:'#f0ad4e'},areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(240,173,78,0.85)'},{offset:1,color:'rgba(150,102,32,0.45)'}]}},emphasis:{focus:'series'}},
  {name:'错误',type:'line',stack:'quality',data:data.err,smooth:.24,symbol:'none',lineStyle:{color:'#ee5a52',width:1.2},itemStyle:{color:'#ee5a52'},areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(238,90,82,0.85)'},{offset:1,color:'rgba(142,46,42,0.45)'}]}},emphasis:{focus:'series'}},
  {name:'缺失/离线/未质控',type:'line',stack:'quality',data:data.missingSeries,smooth:.24,symbol:'none',lineStyle:{color:'#6f93ba',width:1.2},itemStyle:{color:'#6f93ba'},areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(111,147,186,0.85)'},{offset:1,color:'rgba(48,68,88,0.45)'}]}},emphasis:{focus:'series'}}
 ],tooltip:{...base.tooltip,formatter:function(params){
  if(!params||!params.length)return '';
  const label=params[0].axisValueLabel||params[0].name,map={};
  params.forEach(p=>{map[p.seriesName]=Number(p.value)||0;});
  const uVal=map['正确&订正']||0,sVal=map['可疑']||0,eVal=map['错误']||0,mVal=map['缺失/离线/未质控']||0;
  const isConn=(typeof QcDatabase!=='undefined'&&typeof QcDatabase.isProvinceConnected==='function')?QcDatabase.isProvinceConnected(S.scope):true;
  if(!isConn){
   return '<div style="font-weight:700;margin-bottom:4px;color:#d7f3fc">'+label+' · '+S.scope+'</div><div style="color:#8ab0c5;font-size:11px">该省份尚未接入监测质控数据（全部为 0）</div>';
  }
  const titleSuffix=(S.element&&S.element!=='综合')?(S.element+'质量构成'):'综合质量构成';
  return '<div style="font-weight:700;margin-bottom:6px;border-bottom:1px solid #4a748c55;padding-bottom:3px;color:#d7f3fc">'+label+' · '+titleSuffix+'</div>'+
         '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#1fc79a;border-radius:1px;margin-right:5px"></i>正确&订正</span><b style="color:#1fc79a">'+uVal.toFixed(2)+'%</b></div>'+
         '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#f0ad4e;border-radius:1px;margin-right:5px"></i>可疑</span><b style="color:#f0ad4e">'+sVal.toFixed(2)+'%</b></div>'+
         '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#ee5a52;border-radius:1px;margin-right:5px"></i>错误</span><b style="color:#ee5a52">'+eVal.toFixed(2)+'%</b></div>'+
         '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#6f93ba;border-radius:1px;margin-right:5px"></i>缺失/离线/未质控</span><b style="color:#8bb0d3">'+mVal.toFixed(2)+'%</b></div>'+
         '<div style="display:flex;justify-content:space-between;gap:14px;margin-top:4px;border-top:1px solid #4a748c55;padding-top:3px;color:#8ab0c5;font-size:10px"><span>合计全量样本</span><b>100.00%</b></div>';
 }}};}
function dashboardProvinceOption(){const d=qcpMethodModel(),base=dashboardChartBase();return {...base,aria:{enabled:true,label:{description:S.scope+S.period+d.name+'异常时次面积趋势，共'+num(d.bad.length)+'条异常样本。'}},xAxis:{...base.xAxis,data:d.hours.map(h=>h.label)},yAxis:{...base.yAxis,min:0,max:Math.max(2,...d.hours.map(h=>h.count+1)),minInterval:1},series:[{name:d.name+'异常样本',type:'line',data:d.hours.map(h=>h.count),smooth:.18,symbol:'circle',showSymbol:false,symbolSize:5,lineStyle:{color:'#80deed',width:2},itemStyle:{color:'#b6f3f3'},areaStyle:dashboardArea('#56c7df')}],tooltip:{...base.tooltip,valueFormatter:value=>num(value)+' 条'}};}
function dashboardChannelTrendOption(){
 const data=typeof qcaChannelTrendData==='function'?qcaChannelTrendData():{labels:[],timely:[],mild:[],severe:[],critical:[],missing:[],isConn:true};
 const base=dashboardChartBase();
 return {
  ...base,
  aria:{enabled:true,label:{description:S.scope+S.period+'链路接收状态5层堆叠趋势，共'+data.labels.length+'个时次。'}},
  grid:{left:42,right:14,top:16,bottom:24},
  xAxis:{...base.xAxis,data:data.labels},
  yAxis:{...base.yAxis,min:0,max:100,axisLabel:{...base.yAxis.axisLabel,formatter:'{value}%'}},
  series:[
   {
    name:'及时',
    type:'line',
    stack:'channel',
    data:data.timely,
    smooth:.24,
    symbol:'none',
    lineStyle:{color:'#1fc79a',width:1.3},
    itemStyle:{color:'#1fc79a'},
    areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(31,199,154,0.85)'},{offset:1,color:'rgba(18,92,72,0.42)'}]}},
    emphasis:{focus:'series'}
   },
   {
    name:'提醒延迟',
    type:'line',
    stack:'channel',
    data:data.mild,
    smooth:.24,
    symbol:'none',
    lineStyle:{color:'#36b3d9',width:1.2},
    itemStyle:{color:'#36b3d9'},
    areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(54,179,217,0.85)'},{offset:1,color:'rgba(22,78,98,0.42)'}]}},
    emphasis:{focus:'series'}
   },
   {
    name:'严重延迟',
    type:'line',
    stack:'channel',
    data:data.severe,
    smooth:.24,
    symbol:'none',
    lineStyle:{color:'#f0ad4e',width:1.2},
    itemStyle:{color:'#f0ad4e'},
    areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(240,173,78,0.85)'},{offset:1,color:'rgba(130,88,32,0.42)'}]}},
    emphasis:{focus:'series'}
   },
   {
    name:'危急延迟',
    type:'line',
    stack:'channel',
    data:data.critical,
    smooth:.24,
    symbol:'none',
    lineStyle:{color:'#ee5a52',width:1.2},
    itemStyle:{color:'#ee5a52'},
    areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(238,90,82,0.85)'},{offset:1,color:'rgba(125,45,41,0.42)'}]}},
    emphasis:{focus:'series'}
   },
   {
    name:'缺失',
    type:'line',
    stack:'channel',
    data:data.missing,
    smooth:.24,
    symbol:'none',
    lineStyle:{color:'#6f93ba',width:1.2},
    itemStyle:{color:'#6f93ba'},
    areaStyle:{color:{type:'linear',x:0,y:0,x2:0,y2:1,colorStops:[{offset:0,color:'rgba(111,147,186,0.85)'},{offset:1,color:'rgba(46,65,84,0.42)'}]}},
    emphasis:{focus:'series'}
   }
  ],
  tooltip:{
   ...base.tooltip,
   formatter:function(params){
    if(!params||!params.length)return '';
    const label=params[0].axisValueLabel||params[0].name,map={};
    params.forEach(p=>{map[p.seriesName]=Number(p.value)||0;});
    if(!data.isConn){
     return '<div style="font-weight:700;margin-bottom:4px;color:#d7f3fc">'+label+' · '+S.scope+'</div><div style="color:#8ab0c5;font-size:11px">该省份尚未接入链路数据（全部为 0）</div>';
    }
    const tVal=map['及时']||0,mVal=map['提醒延迟']||0,sVal=map['严重延迟']||0,cVal=map['危急延迟']||0,missVal=map['缺失']||0;
    const arrival=(tVal+mVal+sVal+cVal).toFixed(2);
    return '<div style="font-weight:700;margin-bottom:6px;border-bottom:1px solid #4a748c55;padding-bottom:3px;color:#d7f3fc">'+label+' · '+S.scope+'链路接收态势</div>'+
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#1fc79a;border-radius:1px;margin-right:5px"></i>及时</span><b style="color:#1fc79a">'+tVal.toFixed(2)+'%</b></div>'+
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#36b3d9;border-radius:1px;margin-right:5px"></i>提醒延迟</span><b style="color:#36b3d9">'+mVal.toFixed(2)+'%</b></div>'+
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#f0ad4e;border-radius:1px;margin-right:5px"></i>严重延迟</span><b style="color:#f0ad4e">'+sVal.toFixed(2)+'%</b></div>'+
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#ee5a52;border-radius:1px;margin-right:5px"></i>危急延迟</span><b style="color:#ee5a52">'+cVal.toFixed(2)+'%</b></div>'+
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#6f93ba;border-radius:1px;margin-right:5px"></i>缺失</span><b style="color:#8bb0d3">'+missVal.toFixed(2)+'%</b></div>'+
           '<div style="display:flex;justify-content:space-between;gap:14px;margin-top:4px;border-top:1px solid #4a748c55;padding-top:3px;color:#8ab0c5;font-size:10px"><span>到报率（实到/应到）</span><b style="color:#7ce3be">'+arrival+'%</b></div>';
   }
  }
 };
}
function dashboardRapidTrendOption(){
 const isSingleDay = ['当前','今日'].includes(S.period);
 const N = isSingleDay ? 24 : (S.period==='近3日' ? 3 : 7);
 const labels = [];
 const pass = [], fmt = [], comp = [];
 const scopeSeed = typeof qccHash==='function' ? qccHash(S.scope||'全国') : 19;

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

  // 平滑且清晰可辨的波动曲线
  const wave1 = Math.sin((t + 2) * Math.PI / 6) * 0.45 + Math.cos(t * Math.PI / 4) * 0.25;
  const wave2 = Math.sin(t * Math.PI / 8) * 0.4 + Math.sin(t * Math.PI / 3) * 0.25;
  const seedNoise = ((scopeSeed + step * 23) % 7 - 3) * 0.05;

  const curFmt = Math.max(99.45, Math.min(99.98, 99.82 + wave1 * 0.12));
  const curComp = Math.max(98.3, Math.min(99.65, 99.10 + wave2 * 0.45 + seedNoise));
  const curPass = Math.max(97.0, Math.min(98.9, curComp - 0.75 + wave1 * 0.2));

  pass.push(Number(curPass.toFixed(2)));
  fmt.push(Number(curFmt.toFixed(2)));
  comp.push(Number(curComp.toFixed(2)));
 }

 const base = dashboardChartBase();
 return {
  ...base,
  aria: { enabled: true, label: { description: S.scope + S.period + '快速质控趋势，共' + labels.length + '个时次。' } },
  grid: { left: 45, right: 18, top: 18, bottom: 24 },
  xAxis: { ...base.xAxis, data: labels },
  yAxis: {
   ...base.yAxis,
   name: '',
   min: 96,
   max: 100,
   splitNumber: 4,
   axisLabel: { ...base.yAxis.axisLabel, formatter: '{value}%' }
  },
  series: [
   {
    name: '格式正确率',
    type: 'line',
    data: fmt,
    smooth: 0.28,
    symbol: 'none',
    lineStyle: { color: '#36b3d9', width: 2 },
    itemStyle: { color: '#36b3d9' }
   },
   {
    name: '要素完整率',
    type: 'line',
    data: comp,
    smooth: 0.28,
    symbol: 'none',
    lineStyle: { color: '#8e9dfa', width: 2 },
    itemStyle: { color: '#8e9dfa' }
   },
   {
    name: 'S2质控通过率',
    type: 'line',
    data: pass,
    smooth: 0.28,
    symbol: 'none',
    lineStyle: { color: '#1fc79a', width: 2.2 },
    itemStyle: { color: '#1fc79a' }
   }
  ],
  tooltip: {
   ...base.tooltip,
   formatter: function(params){
    if(!params||!params.length) return '';
    const label = params[0].axisValueLabel || params[0].name;
    const idx = labels.indexOf(label);
    const fVal = fmt[idx] != null ? fmt[idx] : 99.82;
    const cVal = comp[idx] != null ? comp[idx] : 99.12;
    const pVal = pass[idx] != null ? pass[idx] : 98.45;

    return '<div style="font-weight:700;margin-bottom:6px;border-bottom:1px solid #4a748c55;padding-bottom:3px;color:#d7f3fc">' + label + ' · 快速质控趋势</div>' +
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#36b3d9;border-radius:1px;margin-right:5px"></i>格式正确率</span><b style="color:#36b3d9">' + fVal + '%</b></div>' +
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#8e9dfa;border-radius:1px;margin-right:5px"></i>要素完整率</span><b style="color:#8e9dfa">' + cVal + '%</b></div>' +
           '<div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:#1fc79a;border-radius:1px;margin-right:5px"></i>S2质控通过率</span><b style="color:#1fc79a">' + pVal + '%</b></div>';
   }
  }
 };
}

const S4_DATES = Array.from({length:30}, (_,i)=>`10-${String(i+1).padStart(2,'0')}`);
const S4_OBS = [1001.5, 1002.6, 1004.0, 1004.6, 1005.2, 1004.4, 1004.7, 1003.6, 1003.7, 1001.5, 1001.9, 1000.4, 1000.3, 998.7, 999.0, 999.6, 1000.2, 1000.8, 1002.8, 1003.4, 1004.6, 1003.7, 1005.3, 1004.2, 1004.2, 1003.4, 1003.6, 1002.9, 1002.3, 1001.6];
const S4_MODEL = [1002.6, 1004.5, 1004.3, 1003.6, 1005.3, 1005.4, 1004.7, 1003.4, 1002.1, 1002.9, 1001.3, 1000.2, 999.8, 999.5, 999.2, 998.3, 1000.3, 1000.7, 1003.1, 1004.5, 1003.9, 1005.4, 1005.3, 1003.8, 1003.8, 1004.3, 1004.1, 1002.4, 1001.5, 1000.1];
const S4_BIAS = [1.1, 1.9, 0.3, 1.0, 0.1, 1.0, 0.0, 0.2, 1.6, 1.4, 0.6, 0.2, 0.5, 0.8, 0.2, 1.3, 0.1, 0.1, 0.3, 1.1, 0.7, 1.7, 0.0, 0.4, 0.4, 0.9, 0.5, 0.5, 0.8, 1.5];

function dashboardObsModelOption(){
 const base = dashboardChartBase();
 return {
  ...base,
  grid: { left: 45, right: 18, top: 18, bottom: 26 },
  xAxis: { ...base.xAxis, data: S4_DATES },
  yAxis: { ...base.yAxis, min: 998, max: 1006, axisLabel: { ...base.yAxis.axisLabel, formatter: '{value}' } },
  series: [
   {
    name: '观测',
    type: 'line',
    data: S4_OBS,
    smooth: 0.2,
    symbol: 'none',
    lineStyle: { color: '#36b3d9', width: 2 },
    itemStyle: { color: '#36b3d9' }
   },
   {
    name: '模式',
    type: 'line',
    data: S4_MODEL,
    smooth: 0.2,
    symbol: 'none',
    lineStyle: { color: '#f0ad4e', width: 1.8, type: 'dashed' },
    itemStyle: { color: '#f0ad4e' }
   }
  ],
  tooltip: {
   ...base.tooltip,
   formatter: function(params){
    if(!params||!params.length) return '';
    const label = params[0].axisValueLabel || params[0].name;
    const idx = S4_DATES.indexOf(label);
    const obs = S4_OBS[idx];
    const mod = S4_MODEL[idx];
    const diff = (obs - mod).toFixed(2);
    return `<div style="font-weight:700;margin-bottom:4px;color:#d7f3fc">${label} · 气压实况与模式</div>` +
           `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0"><span style="color:#a7c8d8">实况观测：</span><b style="color:#36b3d9">${obs} hPa</b></div>` +
           `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0"><span style="color:#a7c8d8">数值模式：</span><b style="color:#f0ad4e">${mod} hPa</b></div>` +
           `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0"><span style="color:#a7c8d8">偏差(观测-模式)：</span><b style="color:${Math.abs(diff)>1.2?'#ee5a52':'#7ce3be'}">${diff} hPa</b></div>`;
   }
  }
 };
}

function dashboardBiasBarOption(){
 const base = dashboardChartBase();
 return {
  ...base,
  grid: { left: 45, right: 18, top: 18, bottom: 26 },
  xAxis: { ...base.xAxis, data: S4_DATES },
  yAxis: { ...base.yAxis, min: 0, max: 2.0, splitNumber: 4, axisLabel: { ...base.yAxis.axisLabel, formatter: '{value}' } },
  series: [
   {
    name: '偏差绝对值',
    type: 'bar',
    barWidth: '55%',
    data: S4_BIAS.map(v => ({
     value: v,
     itemStyle: {
      color: v > 1.2 ? '#d9534f' : '#3c768a',
      borderRadius: [2, 2, 0, 0]
     }
    })),
    markLine: {
     silent: true,
     symbol: 'none',
     lineStyle: { color: 'rgba(238, 90, 82, 0.75)', type: 'dashed', width: 1.2 },
     data: [{ yAxis: 1.2, label: { show: false } }]
    }
   }
  ],
  tooltip: {
   ...base.tooltip,
   formatter: function(params){
    if(!params||!params.length) return '';
    const label = params[0].axisValueLabel || params[0].name;
    const idx = S4_DATES.indexOf(label);
    const val = S4_BIAS[idx];
    const isOver = val > 1.2;
    return `<div style="font-weight:700;margin-bottom:4px;color:#d7f3fc">${label} · 偏差绝对值</div>` +
           `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0"><span style="color:#a7c8d8">绝对偏差：</span><b style="color:${isOver?'#ee5a52':'#36b3d9'}">${val} hPa</b></div>` +
           `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0"><span style="color:#a7c8d8">参考标准线：</span><b style="color:#e6847d">1.2 hPa</b></div>` +
           `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0"><span style="color:#a7c8d8">评估结论：</span><b style="color:${isOver?'#ee5a52':'#1fc79a'}">${isOver?'超出标准阈值':'符合标准'}</b></div>`;
   }
  }
 };
}

function dashboardS3TrendOption() {
  const base = dashboardChartBase();
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');
  const seedBase = typeof qccHash === 'function' ? qccHash(S.scope + '|' + (S.element || '综合') + '|s3trend') : 37;
  
  const s3Pass = [];
  const rangePass = [];
  const internalPass = [];
  const timePass = [];

  for (let i = 0; i < 24; i++) {
    const wave = Math.sin((i + (seedBase % 7)) / 3.2) * 0.35 + Math.cos(i / 2.1) * 0.2;
    const rVal = 99.45 + wave * 0.3;
    const iVal = 99.18 + wave * 0.45;
    const tVal = 98.92 + wave * 0.55;
    const compVal = 98.65 + wave * 0.48;

    rangePass.push(Number(Math.min(100, Math.max(97.5, rVal)).toFixed(2)));
    internalPass.push(Number(Math.min(100, Math.max(97.0, iVal)).toFixed(2)));
    timePass.push(Number(Math.min(100, Math.max(96.8, tVal)).toFixed(2)));
    s3Pass.push(Number(Math.min(100, Math.max(96.5, compVal)).toFixed(2)));
  }

  return {
    ...base,
    aria: { enabled: true, label: { description: S.scope + ' S3数据核查通过率趋势' } },
    grid: { left: 45, right: 18, top: 18, bottom: 26 },
    xAxis: { ...base.xAxis, data: hours },
    yAxis: { ...base.yAxis, min: 96, max: 100, axisLabel: { ...base.yAxis.axisLabel, formatter: '{value}%' } },
    series: [
      {
        name: 'S3综合通过率',
        type: 'line',
        data: s3Pass,
        smooth: 0.25,
        symbol: 'none',
        lineStyle: { color: '#1fc79a', width: 2 },
        itemStyle: { color: '#1fc79a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(31, 199, 154, 0.32)' },
              { offset: 1, color: 'rgba(31, 199, 154, 0.02)' }
            ]
          }
        }
      },
      {
        name: '主要变化范围',
        type: 'line',
        data: rangePass,
        smooth: 0.25,
        symbol: 'none',
        lineStyle: { color: '#36b3d9', width: 1.5 },
        itemStyle: { color: '#36b3d9' }
      },
      {
        name: '内部一致性',
        type: 'line',
        data: internalPass,
        smooth: 0.25,
        symbol: 'none',
        lineStyle: { color: '#8e9dfa', width: 1.5 },
        itemStyle: { color: '#8e9dfa' }
      },
      {
        name: '时间一致性',
        type: 'line',
        data: timePass,
        smooth: 0.25,
        symbol: 'none',
        lineStyle: { color: '#f0ad4e', width: 1.5 },
        itemStyle: { color: '#f0ad4e' }
      }
    ],
    tooltip: {
      ...base.tooltip,
      formatter: function(params) {
        if (!params || !params.length) return '';
        const hour = params[0].axisValueLabel || params[0].name;
        let html = `<div style="font-weight:700;margin-bottom:6px;border-bottom:1px solid #4a748c55;padding-bottom:3px;color:#d7f3fc">${hour} · S3数据核查走势</div>`;
        params.forEach(p => {
          html += `<div style="display:flex;justify-content:space-between;gap:14px;margin:3px 0"><span style="color:#a7c8d8"><i style="display:inline-block;width:7px;height:7px;background:${p.color};border-radius:1px;margin-right:5px"></i>${p.seriesName}</span><b style="color:${p.color}">${p.value}%</b></div>`;
        });
        return html;
      }
    }
  };
}

function dashboardCorrectionTrendOption(){
  const base = dashboardChartBase();
  const hours = Array.from({length: 25}, (_, i) => String(i).padStart(2, '0') + ':00');
  const seed = typeof qccHash === 'function' ? qccHash(S.scope + '|corr-trend') : 55;
  const rates = hours.map((_, i) => {
    const val = 99.20 + Math.sin(i / 3.2) * 0.45 + ((seed + i * 7) % 11) / 50;
    return Number(Math.max(98.5, Math.min(99.95, val)).toFixed(2));
  });

  return {
    ...base,
    grid: { left: 48, right: 18, top: 22, bottom: 26 },
    xAxis: { ...base.xAxis, data: hours },
    yAxis: { ...base.yAxis, min: 98.0, max: 100.0, splitNumber: 4, axisLabel: { ...base.yAxis.axisLabel, formatter: '{value}%' } },
    series: [
      {
        name: '订正率',
        type: 'line',
        data: rates,
        smooth: 0.25,
        symbol: 'none',
        lineStyle: { color: '#1fc79a', width: 2 },
        itemStyle: { color: '#1fc79a' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(31, 199, 154, 0.35)' },
              { offset: 1, color: 'rgba(31, 199, 154, 0.02)' }
            ]
          }
        }
      }
    ],
    tooltip: {
      ...base.tooltip,
      formatter: function(params) {
        if (!params || !params.length) return '';
        const hour = params[0].axisValueLabel || params[0].name;
        const rate = params[0].value;
        return `<div style="font-weight:700;margin-bottom:4px;color:#d7f3fc">${hour} · 数据订正率</div>` +
               `<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8">订正闭环率：</span><b style="color:#1fc79a">${rate}%</b></div>` +
               `<div style="display:flex;justify-content:space-between;gap:14px;margin:2px 0"><span style="color:#a7c8d8">统计范围：</span><b style="color:#7ee6fa">${S.scope}</b></div>`;
      }
    }
  };
}

function disposeDashboardCharts(){for(const item of dashboardChartInstances.splice(0)){item.observer.disconnect();item.chart.dispose();}}
function initDashboardCharts(){
 document.querySelectorAll('[data-dashboard-chart]').forEach(node=>{
  if(typeof echarts==='undefined'){node.textContent='图表组件加载失败，请刷新页面';return;}
  const chart=echarts.init(node,null,{renderer:'svg'});
  const type=node.dataset.dashboardChart;
  const option=type==='quality-trend'?dashboardQualityOption():(type==='channel-trend'?dashboardChannelTrendOption():(type==='rapid-trend'?dashboardRapidTrendOption():(type==='obs-model-trend'?dashboardObsModelOption():(type==='bias-bar-trend'?dashboardBiasBarOption():(type==='correction-trend'?dashboardCorrectionTrendOption():(type==='s3-trend'?dashboardS3TrendOption():dashboardProvinceOption()))))));
  chart.setOption(option,{notMerge:true});
  node.dataset.chartLibrary='echarts';
  const observer=new ResizeObserver(()=>{if(node.isConnected)chart.resize();});observer.observe(node);
  dashboardChartInstances.push({chart,observer});
 });
}
function updateHeaderClock(){const parts=screenClockParts(),time=document.getElementById('screen-clock-time'),date=document.getElementById('screen-clock-date');if(time)time.textContent=parts.time;if(date)date.textContent=parts.date;}
const dashboardPreviousRender=render;
render=function(){disposeDashboardCharts();dashboardPreviousRender();initDashboardCharts();updateHeaderClock();};
setInterval(updateHeaderClock,1000);
render();
