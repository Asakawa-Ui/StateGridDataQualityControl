'use strict';
// 提取自用户提供的 HTML；只复用业务分类、方法和演示参数，不载入原页面脚本。
const QC_REFERENCE={
FLAGS:[
  {k:1,n:'正确',hex:'#1fc79a',cls:'ok'},
  {k:2,n:'可疑',hex:'#f0a13a',cls:'sus'},
  {k:3,n:'错误',hex:'#ee5a52',cls:'err'},
  {k:4,n:'缺失',hex:'#6b8199',cls:'mis'},
  {k:5,n:'订正',hex:'#9a8bf2',cls:'cor'},
  {k:0,n:'未质控',hex:'#39485a',cls:'non'}
],
ELS:[
  {k:'pres',n:'气压',u:'hPa',lo:450,hi:1100,sus:0.5,err:2,min:0.1,base:1006.4,step:0.12},
  {k:'temp',n:'气温',u:'℃',lo:-50,hi:60,sus:3,err:5,min:0.01,base:23.6,step:0.18},
  {k:'rh',n:'相对湿度',u:'%',lo:0,hi:100,sus:10,err:15,min:1,base:64,step:0.6},
  {k:'wdir',n:'风向',u:'°',lo:0,hi:360,sus:null,err:null,min:null,base:236,step:3},
  {k:'wspd',n:'风速',u:'m/s',lo:0,hi:75,sus:10,err:20,min:0.5,base:4.6,step:0.3},
  {k:'rain',n:'雨量',u:'mm',lo:0,hi:8,sus:null,err:null,min:null,base:0.0,step:0.1},
  {k:'rad',n:'总辐射',u:'W/m²',lo:0,hi:2000,sus:800,err:1000,min:null,base:586,step:12},
  {k:'efld',n:'大气电场',u:'kV/m',lo:-100,hi:100,sus:null,err:null,min:null,base:2.8,step:0.4}
],
METHODS:[
  {id:'range',   n:'界限值检查',      ex:'观测值超出要素测量范围或物理上限', base:386, acc:99.2},
  {id:'climate', n:'气候界限值检查',  ex:'超出该站该月历史气候极值区间',     base:214, acc:98.4},
  {id:'rate',    n:'变化速率检查',    ex:'单位时间变化量超过允许变化速率',   base:302, acc:97.6},
  {id:'internal',n:'内部一致性检查',  ex:'风速与风向、气温与湿度等要素间逻辑冲突', base:158, acc:96.8},
  {id:'time',    n:'时间一致性检查',  ex:'相邻时次序列突变或长时间持续不变', base:271, acc:98.1},
  {id:'space',   n:'空间一致性检查',  ex:'与邻站同时次观测偏离超过阈值',     base:196, acc:95.3},
  {id:'missing', n:'缺测检查',        ex:'采样样本数不足或整点数据未到报',   base:342, acc:99.6},
  {id:'persist', n:'持续性检查',      ex:'连续多个时次数值完全相同（僵值）', base:124, acc:94.7},
  {id:'complex', n:'综合研判',        ex:'多方法交叉判定，输出最终质控标识', base:268, acc:99.1}
],
EVAL_TABS:[
  {id:'model',n:'观测-模式评估'},
  {id:'meteo',n:'气象部门比对'},
  {id:'warn',n:'预警业务支撑'},
  {id:'weather',n:'强天气过程回溯'}
],
WEATHER_CASES:[
  {n:'2026 年第 11 号台风“海葵”',t:'09-02 ~ 09-04',type:'台风',dev:186,cap:97.3,alarm:412,score:'优',
   provs:['浙江','福建','上海','江苏','广东'],el:'风速'},
  {n:'江淮强对流过程',t:'08-12',type:'强对流',dev:174,cap:94.6,alarm:286,score:'良',
   provs:['江苏','安徽'],el:'大气电场'},
  {n:'苏北暴雨山洪过程',t:'07-21 ~ 07-22',type:'暴雨山洪',dev:96,cap:92.8,alarm:198,score:'良',
   provs:['江苏'],el:'雨量'},
  {n:'皖南线路覆冰过程',t:'01-18 ~ 01-21',type:'覆冰',dev:132,cap:96.1,alarm:154,score:'优',
   provs:['安徽','浙江'],el:'气温'},
  {n:'豫北导线舞动过程',t:'02-06 ~ 02-07',type:'舞动',dev:78,cap:89.4,alarm:96,score:'中',
   provs:['河南'],el:'风速'}
],
ALGOS:[
  {id:'QC-MAIN-2026.8',n:'综合质控主流程',cat:'中心端',ver:'2026.8',freq:'10 分钟',last:'14:20:06',st:'运行中',hits:'—',own:'中国电科院'},
  {id:'QC-RANGE-3.2',n:'界限值检查',cat:'中心端',ver:'3.2',freq:'10 分钟',last:'14:20:04',st:'运行中',hits:386,own:'中国电科院'},
  {id:'QC-CLIMATE-2.1',n:'气候界限值检查',cat:'中心端',ver:'2.1',freq:'1 小时',last:'14:00:00',st:'运行中',hits:214,own:'中国电科院'},
  {id:'QC-RATE-3.0',n:'变化速率检查',cat:'中心端',ver:'3.0',freq:'10 分钟',last:'14:20:05',st:'运行中',hits:302,own:'国网电科院'},
  {id:'QC-INTERNAL-2.4',n:'内部一致性检查',cat:'中心端',ver:'2.4',freq:'10 分钟',last:'14:20:05',st:'运行中',hits:158,own:'国网电科院'},
  {id:'QC-TIME-2.6',n:'时间一致性检查',cat:'中心端',ver:'2.6',freq:'1 小时',last:'14:00:00',st:'运行中',hits:271,own:'国网电科院'},
  {id:'QC-SPACE-1.8',n:'空间一致性检查',cat:'中心端',ver:'1.8',freq:'1 小时',last:'14:00:00',st:'运行中',hits:196,own:'气象探测中心'},
  {id:'QC-MISS-1.5',n:'缺测检查',cat:'装置端',ver:'1.5',freq:'5 分钟',last:'14:20:00',st:'运行中',hits:342,own:'装置厂商'},
  {id:'QC-PERSIST-1.2',n:'持续性检查',cat:'中心端',ver:'1.2',freq:'1 小时',last:'13:00:00',st:'已停用',hits:0,own:'国网电科院'}
]
};
