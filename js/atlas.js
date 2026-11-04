'use strict';

// MapLibre GL 交互底图、省域矢量、质控四分类空间分布及时间轴联动
const tileView = {
  map: null,
  node: null,
  loaded: false,
  scope: null,
  markers: [],
  labels: [],
  popup: null,
  status: 'all',
  showProvinces: true,
  showStations: true,
  showLabels: true,
  opacity: .56,
  error: false,
  layersOpen: false,
  equipOpen: false,
  datePickerOpen: false,
  pickerYear: 2026,
  pickerMonth: 10,
  octahedronImages: {},
  lastClusterZoom: null,
  stationLabels: new Map()
};

Object.assign(S, {
  selectedDate: S.selectedDate || '2026-10-23',
  equipType: S.equipType || '全部',
  equipCity: S.equipCity || '全部',
  equipCounty: S.equipCounty || '全部',
  equipVoltage: S.equipVoltage || '全部'
});

const QC_STATUS_CONFIG = (typeof QcDatabase !== 'undefined' && QcDatabase.STATUS_CONFIG) ? QcDatabase.STATUS_CONFIG : {
  usable: { id: 'usable', label: '正确', color: '#1fc79a', symbol: '●' },
  suspect: { id: 'suspect', label: '可疑', color: '#f0ad4e', symbol: '◆' },
  error: { id: 'error', label: '错误', color: '#ee5a52', symbol: '▲' },
  missing: { id: 'missing', label: '缺失/离线', color: '#6f93ba', symbol: '■' },
  corrected: { id: 'corrected', label: '订正', color: '#36b3d9', symbol: '★' },
  unchecked: { id: 'unchecked', label: '未质控', color: '#50687d', symbol: '◌' }
};
const NETWORK_STATUS = QC_STATUS_CONFIG;

const corePositions = {
  'ZJ-HZ-013': [120.16, 30.27],
  'SC-GZ-028': [101.96, 30.05],
  'HB-WH-087': [114.32, 30.38],
  'HN-CS-041': [112.81, 28.35],
  'JS-YC-066': [120.05, 34.00],
  'AH-HS-022': [118.44, 29.87],
  'HA-LY-031': [111.62, 33.78],
  'SX-DT-019': [113.69, 39.70]
};

function seededRandom(seed) {
  let n = seed >>> 0;
  return () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

function ringAreaLL(r) {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
  return Math.abs(a / 2);
}

function pointInRingLL(x, y, r) {
  let yes = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i], b = r[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) yes = !yes;
  }
  return yes;
}

const PROVINCE_STATION_NAMING_POOL = {
  '浙江省': {
    subs: ['萧山', '慈溪', '富阳', '临安', '余姚', '乐清', '瑞安', '海宁', '桐乡', '诸暨', '上虞', '义乌', '东阳', '温岭', '临海', '长兴', '德清', '安吉', '江山', '龙泉', '定海', '北仑', '镇海', '鄞州', '柯桥', '兰溪', '永康', '玉环', '天台', '仙居'],
    lines: ['钱塘', '宁绍', '杭绍', '瓯海', '甬台', '浙北', '浙中', '金丽', '杭湖', '嘉湖', '温瑞', '舟岱', '天一', '双屿', '富春', '天目']
  },
  '江苏省': {
    subs: ['江宁', '浦口', '六合', '溧水', '高淳', '锡山', '惠山', '江阴', '宜兴', '铜山', '丰县', '沛县', '睢宁', '新沂', '邳州', '武进', '金坛', '溧阳', '吴中', '相城', '吴江', '常熟', '张家港', '昆山', '太仓', '通州', '海门', '启东', '如皋', '海安'],
    lines: ['苏通', '扬镇', '宁常', '锡澄', '徐宿', '连盐', '淮泰', '通海', '江海', '太湖', '钟山', '彭城', '东海', '洪泽', '金陵', '婁江']
  },
  '四川省': {
    subs: ['双流', '温江', '郫都', '新都', '青白江', '简阳', '都江堰', '彭州', '邛崃', '崇州', '金堂', '大邑', '蒲江', '新津', '涪城', '游仙', '安州', '江油', '三台', '盐亭', '梓潼', '翠屏', '南溪', '江安', '长宁', '广汉', '什邡', '绵竹', '中江', '罗江'],
    lines: ['雅康', '川藏', '成绵', '乐雅', '成自', '绵广', '达巴', '南广', '攀西', '岷江', '金沙', '嘉陵', '沱江', '大渡', '二郎', '折多']
  },
  '湖南省': {
    subs: ['岳麓', '芙蓉', '天心', '开福', '雨花', '长沙', '浏阳', '宁乡', '株洲', '醴陵', '攸县', '茶陵', '炎陵', '湘潭', '湘乡', '韶山', '衡阳', '衡南', '衡山', '衡东', '祁东', '耒阳', '常宁', '邵阳', '隆回', '洞口', '岳阳', '汨罗', '临湘', '武陵'],
    lines: ['湘浏', '长株', '衡邵', '岳常', '湘南', '湘西', '洞庭', '潇湘', '武陵', '雪峰', '南岳', '罗霄', '资水', '沅江', '澧水', '耒水']
  },
  '安徽省': {
    subs: ['肥东', '肥西', '长丰', '庐江', '巢湖', '镜湖', '鸠江', '无为', '南陵', '繁昌', '蚌埠', '怀远', '五河', '固镇', '淮南', '凤台', '寿县', '当涂', '含山', '和县', '淮北', '濉溪', '铜陵', '枞阳', '安庆', '怀宁', '桐城', '潜山', '太湖', '宿松'],
    lines: ['皖南', '徽杭', '合巢', '芜铜', '淮蚌', '安池', '皖江', '江淮', '黄山', '九华', '天柱', '琅琊', '新安', '青弋', '巢湖', '涡河']
  },
  '湖北省': {
    subs: ['盘龙', '蔡甸', '黄陂', '新洲', '东西湖', '汉南', '阳新', '大冶', '十堰', '郧阳', '丹江口', '夷陵', '宜都', '当阳', '枝江', '远安', '兴山', '秭归', '襄州', '老河口', '枣阳', '宜城', '南漳', '谷城', '保康', '鄂州', '东宝', '掇刀', '京山', '钟祥'],
    lines: ['汉川', '襄十', '宜荆', '黄鄂', '荆汉', '江汉', '武黄', '咸通', '三峡', '清江', '汉江', '武当', '大别', '神农', '赤壁', '漳河']
  },
  '河南省': {
    subs: ['嵩山', '偃师', '登封', '新郑', '荥阳', '新密', '中牟', '巩义', '孟津', '新安', '宜阳', '伊川', '汝阳', '嵩县', '洛宁', '兰考', '杞县', '通许', '尉氏', '宝丰', '叶县', '鲁山', '郏县', '汝州', '安阳', '汤阴', '滑县', '内黄', '林州', '淇县'],
    lines: ['洛郑', '伏牛', '豫北', '豫西', '郑汴', '许平', '焦济', '新鹤', '南信', '商周', '驻漯', '三门', '太行', '黄河', '伊洛', '淮源']
  },
  '山西省': {
    subs: ['榆次', '太谷', '祁县', '平遥', '介休', '寿阳', '昔阳', '灵石', '清徐', '阳曲', '娄烦', '古交', '云冈', '阳高', '天镇', '广灵', '灵丘', '左云', '潞州', '上党', '屯留', '襄垣', '黎城', '壶关', '长子', '武乡', '沁县', '晋城', '泽州', '高平'],
    lines: ['晋中', '大同', '太忻', '长晋', '临运', '吕梁', '雁门', '太行', '吕梁', '汾河', '桑干', '漳泽', '云中', '平定', '娘子', '恒山']
  }
};

const CITY_COUNTIES_DICT = {
  '杭州': ['余杭区', '萧山区', '富阳区', '临安区', '西湖区'],
  '宁波': ['鄞州区', '北仑区', '镇海区', '慈溪市', '余姚市'],
  '温州': ['鹿城区', '瓯海区', '乐清市', '瑞安市', '永嘉县'],
  '嘉兴': ['南湖区', '秀洲区', '海宁市', '桐乡市', '嘉善县'],
  '绍兴': ['越城区', '柯桥区', '上虞区', '诸暨市', '嵊州市'],
  '金华': ['婺城区', '金东区', '义乌市', '东阳市', '兰溪市'],
  '台州': ['椒江区', '黄岩区', '温岭市', '临海市', '天台县'],
  '湖州': ['吴兴区', '南浔区', '德清县', '长兴县', '安吉县'],
  '衢州': ['柯城区', '衢江区', '江山市', '龙游县', '常山县'],
  '丽水': ['莲都区', '龙泉市', '青田县', '缙云县', '遂昌县'],
  '舟山': ['定海区', '普陀区', '岱山县', '嵊泗县'],
  '南京': ['江宁区', '溧水区', '高淳区', '六合区', '浦口区'],
  '无锡': ['锡山区', '惠山区', '滨湖区', '江阴市', '宜兴市'],
  '徐州': ['铜山区', '贾汪区', '新沂市', '邳州市', '丰县'],
  '常州': ['武进区', '新北区', '金坛区', '溧阳市'],
  '苏州': ['姑苏区', '吴中区', '相城区', '昆山市', '常熟市'],
  '南通': ['崇川区', '通州区', '海门区', '启东市', '如皋市'],
  '连云港': ['海州区', '连云区', '赣榆区', '东海县', '灌云县'],
  '淮安': ['清江浦区', '淮安区', '淮阴区', '涟水县', '盱眙县'],
  '盐城': ['亭湖区', '盐都区', '滨海县', '东台市', '建湖县'],
  '扬州': ['邗江区', '广陵区', '江都区', '仪征市', '高邮市'],
  '镇江': ['京口区', '润州区', '丹徒区', '丹阳市', '句容市'],
  '泰州': ['海陵区', '高港区', '姜堰区', '兴化市', '靖江市'],
  '宿迁': ['宿城区', '宿豫区', '沭阳县', '泗阳县', '泗洪县'],
  '成都': ['双流区', '温江区', '郫都区', '都江堰市', '简阳市'],
  '绵阳': ['涪城区', '游仙区', '安州区', '江油市', '三台县'],
  '宜宾': ['翠屏区', '南溪区', '叙州区', '江安县', '长宁县'],
  '德阳': ['旌阳区', '罗江区', '广汉市', '什邡市', '绵竹市'],
  '甘孜': ['康定市', '泸定县', '丹巴县', '雅江县', '理塘县'],
  '长沙': ['望城区', '岳麓区', '长沙县', '浏阳市', '宁乡市'],
  '株洲': ['天元区', '芦淞区', '醴陵市', '攸县', '茶陵县'],
  '湘潭': ['雨湖区', '岳塘区', '湘乡市', '韶山市', '湘潭县'],
  '衡阳': ['蒸湘区', '雁峰区', '耒阳市', '常宁市', '衡南县'],
  '合肥': ['蜀山区', '包河区', '肥东县', '肥西县', '长丰县'],
  '芜湖': ['镜湖区', '鸠江区', '无为市', '湾沚区', '繁昌区'],
  '黄山': ['屯溪区', '黄山区', '徽州区', '歙县', '休宁县'],
  '武汉': ['江夏区', '黄陂区', '新洲区', '蔡甸区', '东西湖区'],
  '宜昌': ['夷陵区', '西陵区', '宜都市', '当阳市', '枝江市'],
  '襄阳': ['襄州区', '樊城区', '枣阳市', '宜城市', '老河口市'],
  '郑州': ['中牟县', '新郑市', '荥阳市', '新密市', '登封市'],
  '洛阳': ['洛龙区', '涧西区', '栾川县', '偃师区', '孟津区'],
  '太原': ['小店区', '迎泽区', '清徐县', '阳曲县', '古交市'],
  '大同': ['平城区', '云冈区', '浑源县', '阳高县', '灵丘县']
};

function formatCityUnitName(city) {
  if (!city || city === '全部') return '全部';
  if (city.startsWith('国网') && city.endsWith('供电公司')) return city;
  return `国网${city.replace(/市|地区/g, '')}供电公司`;
}

function formatCountyUnitName(county) {
  if (!county || county === '全部') return '全部';
  if (county.startsWith('国网') && county.endsWith('供电公司')) return county;
  return `国网${county}供电公司`;
}

function getCountiesForCity(cityUnitOrName) {
  if (!cityUnitOrName || cityUnitOrName === '全部') return [];
  const rawCity = cityUnitOrName.replace(/^国网/, '').replace(/供电公司$/, '').replace(/市$/, '');
  const list = CITY_COUNTIES_DICT[rawCity] || [rawCity + '城区', rawCity + '东区', rawCity + '北县', rawCity + '南县'];
  return list.map(c => formatCountyUnitName(c));
}

const CORE_STATION_META = {
  'ZJ-HZ-013': { city: '国网杭州供电公司', county: '国网余杭区供电公司', profType: '变电站', voltage: '500kV' },
  'SC-GZ-028': { city: '国网甘孜供电公司', county: '国网康定市供电公司', profType: '线路', voltage: '500kV' },
  'HB-WH-087': { city: '国网武汉供电公司', county: '国网江夏区供电公司', profType: '变电站', voltage: '220kV' },
  'HN-CS-041': { city: '国网长沙供电公司', county: '国网望城区供电公司', profType: '变电站', voltage: '500kV' },
  'JS-YC-066': { city: '国网盐城供电公司', county: '国网滨海县供电公司', profType: '线路', voltage: '500kV' },
  'AH-HS-022': { city: '国网黄山供电公司', county: '国网歙县供电公司', profType: '变电站', voltage: '220kV' },
  'HA-LY-031': { city: '国网洛阳供电公司', county: '国网栾川县供电公司', profType: '线路', voltage: '500kV' },
  'SX-DT-019': { city: '国网大同供电公司', county: '国网浑源县供电公司', profType: '变电站', voltage: '500kV' }
};

function buildStandardStationName(provName, provShort, index) {
  const pool = PROVINCE_STATION_NAMING_POOL[provName];
  const voltages = ['500kV', '220kV', '110kV', '35kV', '1000kV', '±800kV', '±500kV', '220kV', '500kV', '110kV'];
  const volt = voltages[index % voltages.length];

  // 与问题清单一致：交替采用“<电压> <站名>变”与“<电压> <线名>线 #<杆塔号>”
  if (index % 5 === 2 || index % 5 === 4 || volt.startsWith('±')) {
    const lineList = pool?.lines || [provShort + '东', provShort + '西', provShort + '南', provShort + '北'];
    const lineName = lineList[index % lineList.length];
    const towerNo = String(((index * 17 + 23) % 180) + 12).padStart(3, '0');
    return `${volt} ${lineName}线 #${towerNo}`;
  } else {
    const subList = pool?.subs || [provShort + '中心', provShort + '新D'];
    const subName = subList[index % subList.length];
    const suffix = index >= subList.length ? (index >= subList.length * 2 ? '南变' : '东变') : '变';
    return `${volt} ${subName}${suffix}`;
  }
}

const networkStations = (() => {
  const out = [];
  provinces.forEach((p, pi) => {
    const core = stations.find(s => s.p === p.n);
    const f = PROVINCE_GEOJSON.features.find(f => f.properties.name === p.n);
    const ring = f.geometry.coordinates.map(poly => poly[0]).sort((a, b) => ringAreaLL(b) - ringAreaLL(a))[0];
    const xs = ring.map(c => c[0]), ys = ring.map(c => c[1]);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const rand = seededRandom(811 + pi * 2731);
    const divCities = (typeof CHINA_DIVISIONS !== 'undefined' ? CHINA_DIVISIONS.find(d => d.name === p.n)?.cities : null) || [{ name: p.short }];

    const defaultCityUnit = formatCityUnitName(divCities[0].name);
    const coreMeta = CORE_STATION_META[core.id] || {
      city: defaultCityUnit,
      county: getCountiesForCity(defaultCityUnit)[0] || '',
      profType: (core.line || '').includes('线') ? '线路' : '变电站',
      voltage: (core.line || '500kV').split(' ')[0]
    };

    out.push({
      id: core.id,
      name: core.line || core.n,
      province: p.n,
      city: coreMeta.city,
      county: coreMeta.county,
      profType: coreMeta.profType,
      voltage: coreMeta.voltage,
      coordinates: corePositions[core.id],
      baseStatus: 'online',
      core: true
    });

    for (let i = 1; i < p.stations; i++) {
      let x, y, guard = 0;
      do {
        x = minx + rand() * (maxx - minx);
        y = miny + rand() * (maxy - miny);
        guard++;
      } while (!pointInRingLL(x, y, ring) && guard < 1500);

      const stName = buildStandardStationName(p.n, p.short, i);
      const cityObj = divCities[i % divCities.length];
      const cityUnit = formatCityUnitName(cityObj.name);
      const counties = getCountiesForCity(cityUnit);
      const countyUnit = counties[i % counties.length] || formatCountyUnitName(cityObj.name + '城区');
      const profType = stName.includes('线 #') ? '线路' : '变电站';
      const voltage = stName.split(' ')[0] || '220kV';

      out.push({
        id: p.short + '-DEMO-' + String(i).padStart(3, '0'),
        name: stName,
        province: p.n,
        city: cityUnit,
        county: countyUnit,
        profType,
        voltage,
        coordinates: [+x.toFixed(4), +y.toFixed(4)],
        baseStatus: i <= p.stations - p.online ? 'offline' : 'online',
        core: false
      });
    }
  });
  return out;
})();

function hasActiveEquipFilter() {
  return (S.equipType && S.equipType !== '全部') ||
    (S.equipCity && S.equipCity !== '全部') ||
    (S.equipCounty && S.equipCounty !== '全部') ||
    (S.equipVoltage && S.equipVoltage !== '全部');
}
window.hasActiveEquipFilter = hasActiveEquipFilter;

function matchStationEquipFilter(s) {
  if (S.equipType && S.equipType !== '全部' && s.profType !== S.equipType) return false;
  if (S.equipCity && S.equipCity !== '全部' && s.city !== S.equipCity) return false;
  if (S.equipCounty && S.equipCounty !== '全部' && s.county !== S.equipCounty) return false;
  if (S.equipVoltage && S.equipVoltage !== '全部' && s.voltage !== S.equipVoltage) return false;
  return true;
}

function getEffectiveTimelineMinute() {
  const baseM = S.currentMinute ?? ((S.currentHour != null ? S.currentHour * 60 : 1000));
  const dStr = S.selectedDate || '2026-10-23';
  if (dStr === '2026-10-23') return baseM;
  const dayNum = Number(dStr.slice(-2)) || 23;
  return (baseM + Math.abs(23 - dayNum) * 170) % 1440;
}

function networkStatus(s) {
  if (typeof QcDatabase !== 'undefined' && typeof QcDatabase.getStationQualityStatus === 'function') {
    return QcDatabase.getStationQualityStatus(s, s.province, s.province, S.period, getEffectiveTimelineMinute(), S.element);
  }
  if (s.baseStatus === 'offline') return 'missing';
  if (s.core && events.some(e => e.station === s.id && e.status !== '已闭环' && matchElement(station(e.station).element))) return 'suspect';
  return 'usable';
}

const ARRIVAL_STATUS_CONFIG = {
  timely: { id: 'timely', label: '及时', color: '#1fc79a', symbol: '●' },
  mild_delay: { id: 'mild_delay', label: '提醒延迟', color: '#36b3d9', symbol: '★' },
  severe_delay: { id: 'severe_delay', label: '严重延迟', color: '#f0ad4e', symbol: '◆' },
  critical_delay: { id: 'critical_delay', label: '危急延迟', color: '#ee5a52', symbol: '▲' },
  missing: { id: 'missing', label: '缺失', color: '#6f93ba', symbol: '■' }
};

const RAPID_STATUS_CONFIG = {
  s2_pass: { id: 's2_pass', label: 'S2质控通过', color: '#1fc79a', symbol: '●' },
  format_ok: { id: 'format_ok', label: '格式正确', color: '#36b3d9', symbol: '★' },
  complete_ok: { id: 'complete_ok', label: '要素完整', color: '#7de6fa', symbol: '●' },
  over_limit: { id: 'over_limit', label: '分要素超限', color: '#ee5a52', symbol: '▲' }
};

function networkArrivalStatus(s) {
  const q = networkStatus(s);
  if (q === 'corrected') return 'mild_delay';
  if (q === 'suspect') return 'severe_delay';
  if (q === 'error') return 'critical_delay';
  if (q === 'missing') return 'missing';
  return 'timely';
}

function networkRapidStatus(s) {
  const q = networkStatus(s);
  const isOver = q === 'error' || (s.core && s.id === 'AH-HS-022');
  if (isOver) return 'over_limit';
  const hasFormatErr = (s.core && s.id === 'SX-DT-019');
  if (hasFormatErr) return 'format_ok';
  if (q === 'missing') return 'complete_ok';
  return 's2_pass';
}

function matchRapidStatus(s, filterStatus) {
  if (filterStatus === 'all') return true;
  const q = networkStatus(s);
  const hasFormatErr = (s.core && s.id === 'SX-DT-019');
  const isFmt = !hasFormatErr;
  const isComp = q !== 'missing';
  const isOver = q === 'error' || (s.core && s.id === 'AH-HS-022');
  const isPass = isFmt && isComp && !isOver;

  if (filterStatus === 'format_ok') return isFmt;
  if (filterStatus === 'complete_ok') return isComp;
  if (filterStatus === 'over_limit') return isOver;
  if (filterStatus === 's2_pass') return isPass;
  return true;
}

function networkRapidCounts(rows = networkScope()) {
  const isConn = (S.scope === '全国' || (typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function' && QcDatabase.isProvinceConnected(S.scope)));
  if (!isConn) {
    return { all: 0, format_ok: 0, complete_ok: 0, over_limit: 0, s2_pass: 0 };
  }
  const all = rows.length;
  let format_ok = 0, complete_ok = 0, over_limit = 0, s2_pass = 0;
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];
    const q = networkStatus(s);
    const hasFormatErr = (s.core && s.id === 'SX-DT-019');
    const isFmt = !hasFormatErr;
    const isComp = q !== 'missing';
    const isOver = q === 'error' || (s.core && s.id === 'AH-HS-022');
    const isPass = isFmt && isComp && !isOver;

    if (isFmt) format_ok++;
    if (isComp) complete_ok++;
    if (isOver) over_limit++;
    if (isPass) s2_pass++;
  }
  return { all, format_ok, complete_ok, over_limit, s2_pass };
}
window.networkRapidCounts = networkRapidCounts;

function networkEffectiveStatus(s) {
  if (S.tab === 'connect') return networkArrivalStatus(s);
  if (S.tab === 'rapid') return networkRapidStatus(s);
  if (S.tab === 'province') return networkS3Status(s);
  if (S.tab === 'correction') return networkCorrectionStatus(s);
  if (S.tab === 'evaluation') return networkEvalStatus(s);
  return networkStatus(s);
}

const S3_STATUS_CONFIG = {
  s3_pass: { id: 's3_pass', label: 'S3质控通过', color: '#1fc79a', symbol: '●' },
  range_pass: { id: 'range_pass', label: '主要变化范围通过', color: '#36b3d9', symbol: '★' },
  internal_pass: { id: 'internal_pass', label: '内部一致性通过', color: '#8e9dfa', symbol: '◆' },
  time_pass: { id: 'time_pass', label: '时间一致性通过', color: '#f0ad4e', symbol: '▲' }
};
window.S3_STATUS_CONFIG = S3_STATUS_CONFIG;

function getStationS3Flags(s, elem = S.element || '综合') {
  const seed = typeof qccHash === 'function' ? qccHash(s.id + '|' + elem + '|s3') : 29;
  const v = seed % 100;
  let rangePass = true, internalPass = true, timePass = true;
  if (v < 4) {
    rangePass = false;
  } else if (v < 8) {
    internalPass = false;
  } else if (v < 13) {
    timePass = false;
  }
  const s3Pass = rangePass && internalPass && timePass;
  return { rangePass, internalPass, timePass, s3Pass };
}
window.getStationS3Flags = getStationS3Flags;

function networkS3Status(s) {
  const flags = getStationS3Flags(s);
  if (flags.s3Pass) return 's3_pass';
  if (!flags.rangePass) return 'range_pass';
  if (!flags.internalPass) return 'internal_pass';
  return 'time_pass';
}
window.networkS3Status = networkS3Status;

function matchS3Status(s, filterStatus) {
  if (filterStatus === 'all') return true;
  const flags = getStationS3Flags(s);
  if (filterStatus === 's3_pass') return flags.s3Pass;
  if (filterStatus === 'range_pass') return flags.rangePass;
  if (filterStatus === 'internal_pass') return flags.internalPass;
  if (filterStatus === 'time_pass') return flags.timePass;
  return true;
}
window.matchS3Status = matchS3Status;

function networkS3Counts(rows = networkScope()) {
  const all = rows.length;
  let s3_pass = 0, range_pass = 0, internal_pass = 0, time_pass = 0;
  for (let i = 0; i < rows.length; i++) {
    const flags = getStationS3Flags(rows[i]);
    if (flags.s3Pass) s3_pass++;
    if (flags.rangePass) range_pass++;
    if (flags.internalPass) internal_pass++;
    if (flags.timePass) time_pass++;
  }
  return { all, s3_pass, range_pass, internal_pass, time_pass };
}
window.networkS3Counts = networkS3Counts;

const EVAL_STATUS_CONFIG = {
  excellent: { id: 'excellent', label: '优', color: '#1fc79a', symbol: '●' },
  medium: { id: 'medium', label: '中', color: '#f0ad4e', symbol: '◆' },
  poor: { id: 'poor', label: '差', color: '#ee5a52', symbol: '▲' }
};
window.EVAL_STATUS_CONFIG = EVAL_STATUS_CONFIG;

function networkEvalStatus(st) {
  const seed = typeof qccHash === 'function' ? qccHash(st.id + '|eval') : 17;
  const v = seed % 100;
  if (v < 80) return 'excellent';
  if (v < 95) return 'medium';
  return 'poor';
}
window.networkEvalStatus = networkEvalStatus;

function networkEvalCounts(rows = networkScope()) {
  const counts = { all: rows.length, excellent: 0, medium: 0, poor: 0 };
  for (let i = 0; i < rows.length; i++) {
    const st = networkEvalStatus(rows[i]);
    counts[st] = (counts[st] || 0) + 1;
  }
  return counts;
}
window.networkEvalCounts = networkEvalCounts;

const CORRECTION_STATUS_CONFIG = {
  corrected: { id: 'corrected', label: '订正', color: '#1fc79a', symbol: '★' },
  error: { id: 'error', label: '错误', color: '#ee5a52', symbol: '▲' },
  other: { id: 'other', label: '其他', color: '#36b3d9', symbol: '●' }
};
window.CORRECTION_STATUS_CONFIG = CORRECTION_STATUS_CONFIG;

function networkCorrectionStatus(st) {
  if (st.core) {
    if (['AH-HS-022', 'SC-GZ-028', 'HN-CS-041', 'HB-WH-087', 'JS-YC-066'].includes(st.id)) return 'corrected';
    if (['SX-DT-019', 'ZJ-HZ-013'].includes(st.id)) return 'error';
    return 'other';
  }
  const seed = typeof qccHash === 'function' ? qccHash(st.id + '|corr') : 41;
  const v = seed % 100;
  if (v < 32) return 'corrected';
  if (v < 44) return 'error';
  return 'other';
}
window.networkCorrectionStatus = networkCorrectionStatus;

function networkCorrectionCounts(rows = networkScope()) {
  const counts = { all: rows.length, corrected: 0, error: 0, other: 0 };
  for (let i = 0; i < rows.length; i++) {
    const st = networkCorrectionStatus(rows[i]);
    counts[st] = (counts[st] || 0) + 1;
  }
  return counts;
}
window.networkCorrectionCounts = networkCorrectionCounts;

function networkArrivalCounts(rows = networkScope()) {
  if (S.scope !== '全国' && typeof QcDatabase !== 'undefined' && typeof QcDatabase.isProvinceConnected === 'function' && !QcDatabase.isProvinceConnected(S.scope)) {
    return { all: 0, timely: 0, mild_delay: 0, severe_delay: 0, critical_delay: 0, missing: 0 };
  }
  const counts = { all: rows.length, timely: 0, mild_delay: 0, severe_delay: 0, critical_delay: 0, missing: 0 };
  for (let i = 0; i < rows.length; i++) {
    const st = networkArrivalStatus(rows[i]);
    counts[st] = (counts[st] || 0) + 1;
  }
  return counts;
}
window.networkArrivalCounts = networkArrivalCounts;

function networkScope() {
  return networkStations.filter(s => (S.scope === '全国' || s.province === S.scope) && matchStationEquipFilter(s));
}

function networkShown() {
  if (S.tab === 'rapid') {
    return networkScope().filter(s => matchRapidStatus(s, tileView.status));
  }
  if (S.tab === 'province') {
    return networkScope().filter(s => matchS3Status(s, tileView.status));
  }
  return networkScope().filter(s => tileView.status === 'all' || networkEffectiveStatus(s) === tileView.status);
}

function networkCounts() {
  if (!hasActiveEquipFilter() && typeof QcDatabase !== 'undefined' && typeof QcDatabase.getQualityCounts === 'function') {
    return QcDatabase.getQualityCounts(S.scope, S.period, S.element, getEffectiveTimelineMinute());
  }
  const rows = networkScope();
  const all = rows.length;
  const usable = rows.filter(s => networkStatus(s) === 'usable').length;
  const suspect = rows.filter(s => networkStatus(s) === 'suspect').length;
  const error = rows.filter(s => networkStatus(s) === 'error').length;
  const missing = rows.filter(s => networkStatus(s) === 'missing').length;
  const corrected = rows.filter(s => networkStatus(s) === 'corrected').length;
  const unchecked = rows.filter(s => networkStatus(s) === 'unchecked').length;
  const toPct = v => all ? Number((v / all * 100).toFixed(2)) : 0;
  return {
    all,
    usable,
    suspect,
    error,
    missing,
    corrected,
    unchecked,
    usablePct: toPct(usable),
    suspectPct: toPct(suspect),
    errorPct: toPct(error),
    missingPct: toPct(missing),
    correctedPct: toPct(corrected),
    uncheckedPct: toPct(unchecked)
  };
}
window.networkCounts = networkCounts;

const OCTAHEDRON_STATUS_KEY_MAP = {
  usable: 'normal',
  normal: 'normal',
  timely: 'normal',
  s2_pass: 'normal',
  s3_pass: 'normal',
  range_pass: 'corrected',
  internal_pass: 'suspicious',
  time_pass: 'missing_offline',
  format_ok: 'normal',
  complete_ok: 'corrected',
  excellent: 'normal',
  medium: 'suspicious',
  poor: 'error',
  suspect: 'suspicious',
  suspicious: 'suspicious',
  severe_delay: 'suspicious',
  format_error: 'suspicious',
  error: 'error',
  critical_delay: 'error',
  over_limit: 'error',
  missing: 'missing_offline',
  incomplete: 'missing_offline',
  offline: 'missing_offline',
  missing_offline: 'missing_offline',
  corrected: 'corrected',
  mild_delay: 'corrected',
  other: 'normal',
  unchecked: 'unchecked'
};

const OCTAHEDRON_BADGE_COLORS = {
  normal: { border: '#2ef2be', text: '#eafff9' },
  suspicious: { border: '#ffbe55', text: '#fff8eb' },
  error: { border: '#ff6b63', text: '#fff0ef' },
  missing_offline: { border: '#7daeff', text: '#eef5ff' },
  corrected: { border: '#4ce0ff', text: '#ecfcff' },
  unchecked: { border: '#8cdbd5', text: '#effaf9' }
};

/**
 * 为聚合簇 (count > 1) 基于真实八面体切图合成右上角/右下角数量角标纹理
 */
function ensureClusterOctahedronIcon(map, octaStatus, count) {
  const baseKey = OCTAHEDRON_STATUS_KEY_MAP[octaStatus] || 'normal';
  if (!count || count <= 1) return 'station-octahedron-' + baseKey;

  const iconId = `station-cluster-${baseKey}-${count}`;
  if (!map) return 'station-octahedron-' + baseKey;
  if (map.hasImage(iconId)) return iconId;

  const baseImg = tileView.octahedronImages[baseKey];
  if (!baseImg) return 'station-octahedron-' + baseKey;

  try {
    const w = baseImg.width || baseImg.naturalWidth || 128;
    const h = baseImg.height || baseImg.naturalHeight || 128;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(baseImg, 0, 0, w, h);

    // 绘制聚合数量角标胶囊
    const label = count > 99 ? '99+' : String(count);
    const fontSize = Math.round(w * (label.length >= 3 ? 0.22 : 0.24));
    ctx.font = `700 ${fontSize}px "DIN Alternate", "JetBrains Mono", "Microsoft YaHei", sans-serif`;
    const textW = ctx.measureText(label).width;
    const padX = Math.round(w * 0.08);
    const pillH = Math.round(h * 0.29);
    const pillW = Math.max(pillH, Math.ceil(textW + padX * 2));
    const pillX = w - pillW - Math.round(w * 0.03);
    const pillY = Math.round(h * 0.64);
    const r = Math.round(pillH / 2);

    const theme = OCTAHEDRON_BADGE_COLORS[baseKey] || OCTAHEDRON_BADGE_COLORS.normal;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pillX + r, pillY);
    ctx.lineTo(pillX + pillW - r, pillY);
    ctx.quadraticCurveTo(pillX + pillW, pillY, pillX + pillW, pillY + r);
    ctx.lineTo(pillX + pillW, pillY + pillH - r);
    ctx.quadraticCurveTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH);
    ctx.lineTo(pillX + r, pillY + pillH);
    ctx.quadraticCurveTo(pillX, pillY + pillH, pillX, pillY + pillH - r);
    ctx.lineTo(pillX, pillY + r);
    ctx.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
    ctx.closePath();

    ctx.fillStyle = 'rgba(6, 22, 35, 0.92)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 6;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.lineWidth = Math.max(2, Math.round(w * 0.022));
    ctx.strokeStyle = theme.border;
    ctx.stroke();

    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pillX + pillW / 2, pillY + pillH / 2 + 1);
    ctx.restore();

    const imageData = ctx.getImageData(0, 0, w, h);
    map.addImage(iconId, imageData);
    return iconId;
  } catch (e) {
    return 'station-octahedron-' + baseKey;
  }
}

/**
 * 生成站点名称标签纹理，供位于八面体图标图层之下的 WebGL 符号层渲染
 */
function ensureStationLabelIcon(map, stationId, stationName, isSelected = false) {
  if (!map || !stationId || !stationName) return '';
  const iconId = `station-label-${stationId}${isSelected ? '-sel' : ''}`;
  if (map.hasImage(iconId)) return iconId;

  try {
    const dpr = 2;
    const fontSize = 11 * dpr;
    const padX = 7 * dpr;
    const padY = 3.5 * dpr;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `500 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    const textW = Math.ceil(ctx.measureText(stationName).width);
    const w = textW + padX * 2 + 4 * dpr;
    const h = fontSize + padY * 2 + 4 * dpr;

    canvas.width = w;
    canvas.height = h;
    ctx.font = `500 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;

    const bx = 2 * dpr;
    const by = 2 * dpr;
    const bw = w - 4 * dpr;
    const bh = h - 4 * dpr;
    const r = 3 * dpr;

    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();

    ctx.fillStyle = isSelected ? 'rgba(12, 42, 62, 0.94)' : 'rgba(6, 22, 36, 0.82)';
    ctx.fill();

    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = isSelected ? '#65f0d0' : 'rgba(110, 195, 228, 0.42)';
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#ffffff' : '#dff6ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stationName, w / 2, h / 2 + 0.5 * dpr);

    map.addImage(iconId, ctx.getImageData(0, 0, w, h), { pixelRatio: dpr });
    return iconId;
  } catch (e) {
    return '';
  }
}

function stationFeatures() {
  const m = tileView.map;
  const zoom = m ? m.getZoom() : 3.45;
  // 地图始终保留全网所有省份站点，仅响应状态筛选与关联设备筛选（选中某省时仅高亮行政区，不隐藏其他省站点）
  const baseList = hasActiveEquipFilter()
    ? networkStations.filter(s => matchStationEquipFilter(s))
    : networkStations;
  const candidates = tileView.status === 'all'
    ? baseList
    : (S.tab === 'rapid'
      ? baseList.filter(s => matchRapidStatus(s, tileView.status))
      : baseList.filter(s => networkEffectiveStatus(s) === tileView.status));

  // 根据缩放等级计算屏幕像素聚合阈值（zoom >= 6.8 完全展开为独立站点）
  let minPx = 0;
  if (zoom < 6.8) {
    if (tileView.status !== 'all') {
      minPx = zoom <= 3.8 ? 24 : zoom <= 5.2 ? 16 : 10;
    } else {
      minPx = zoom <= 3.5 ? 40 : Math.round(40 - (zoom - 3.5) * (30 / 3.3));
    }
  }

  if (minPx <= 0) {
    const needLabels = zoom >= 7.3 && m;
    return {
      type: 'FeatureCollection',
      features: candidates.map(s => {
        const st = networkEffectiveStatus(s);
        const octaStatus = OCTAHEDRON_STATUS_KEY_MAP[st] || 'normal';
        const isSel = S.selectedStation === s.id;
        const labelIconId = needLabels
          ? ensureStationLabelIcon(m, s.id, s.name, isSel)
          : `station-label-${s.id}${isSel ? '-sel' : ''}`;
        return {
          type: 'Feature',
          id: s.id,
          properties: {
            id: s.id,
            name: s.name,
            province: s.province,
            status: st,
            octahedron_status: octaStatus,
            icon_id: 'station-octahedron-' + octaStatus,
            label_icon_id: labelIconId,
            point_count: 1,
            core: s.core
          },
          geometry: {
            type: 'Point',
            coordinates: s.coordinates
          }
        };
      })
    };
  }

  const pxPerDeg = (512 * Math.pow(2, zoom)) / 360;
  const clusters = [];

  for (let i = 0; i < candidates.length; i++) {
    const s = candidates[i];
    const st = networkEffectiveStatus(s);
    const lng = s.coordinates[0];
    const lat = s.coordinates[1];
    const px = lng * pxPerDeg;
    const py = lat * pxPerDeg * 1.15;

    // 选中的站点保持独立不合并
    if (S.selectedStation && s.id === S.selectedStation) {
      clusters.push({
        primary: s,
        province: s.province,
        seedStatus: st,
        sumLng: lng,
        sumLat: lat,
        px,
        py,
        count: 1,
        locked: true
      });
      continue;
    }

    let bestCluster = null;
    let bestDist = minPx;
    for (let j = 0; j < clusters.length; j++) {
      const c = clusters[j];
      if (c.locked || c.province !== s.province) continue;
      const d = Math.hypot(px - c.px, py - c.py);
      if (d < bestDist) {
        bestDist = d;
        bestCluster = c;
      }
    }

    if (bestCluster) {
      bestCluster.count++;
      bestCluster.sumLng += lng;
      bestCluster.sumLat += lat;
      const avgLng = bestCluster.sumLng / bestCluster.count;
      const avgLat = bestCluster.sumLat / bestCluster.count;
      bestCluster.px = avgLng * pxPerDeg;
      bestCluster.py = avgLat * pxPerDeg * 1.15;
    } else {
      clusters.push({
        primary: s,
        province: s.province,
        seedStatus: st,
        sumLng: lng,
        sumLat: lat,
        px,
        py,
        count: 1,
        locked: false
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features: clusters.map(c => {
      const st = c.seedStatus;
      const octaStatus = OCTAHEDRON_STATUS_KEY_MAP[st] || 'normal';
      const iconId = ensureClusterOctahedronIcon(m, octaStatus, c.count);
      const coords = c.count === 1
        ? c.primary.coordinates
        : [+(c.sumLng / c.count).toFixed(4), +(c.sumLat / c.count).toFixed(4)];
      return {
        type: 'Feature',
        id: c.primary.id,
        properties: {
          id: c.primary.id,
          name: c.primary.name,
          province: c.province,
          status: st,
          octahedron_status: octaStatus,
          icon_id: iconId,
          point_count: c.count,
          core: c.primary.core
        },
        geometry: {
          type: 'Point',
          coordinates: coords
        }
      };
    })
  };
}

const premiumOldStationList = dsStationList;
dsStationList = function(limit = 3) {
  if (tileView.status === 'all') return premiumOldStationList(limit);
  return networkShown().slice(0, limit).map(row => {
    const stKey = networkStatus(row);
    const cfg = QC_STATUS_CONFIG[stKey] || QC_STATUS_CONFIG.usable;
    return `<button class="ds-station-row" onclick="selectNetworkStation('${row.id}')"><span><strong>${esc(row.name)}</strong><small>${row.id} / ${row.province}</small></span><b style="font-size:12px;color:${cfg.color}">${cfg.label}</b></button>`;
  }).join('') || dsEmpty('当前没有匹配的站点');
};

const premiumOldCard = dsCard;
dsCard = function(...args) {
  if (args[0] === '重点站点质量' && tileView.status !== 'all') args[0] = '筛选站点概览';
  return premiumOldCard(...args).replace('<header class="ds-card-head">', '<i class="panel-ornament" aria-hidden="true"></i><header class="ds-card-head">');
};

dsAccessBody = function() {
  const c = networkCounts();
  const r = stats();
  const usablePct = pct(c.usable, c.all);
  return `<div class="premium-data-head"><span>${S.period}到报数据</span><strong>${num(r.received)}<small>条</small></strong></div><div class="premium-network"><div class="premium-ring" style="--healthy:${c.all ? c.usable / c.all * 100 : 0};--abnormal:${c.all ? (c.suspect + c.error) / c.all * 100 : 0}"><div class="premium-ring-inner"><b>${usablePct}%</b><small>质控可用率</small></div></div><div class="premium-network-legend"><div class="usable"><i class="atlas-symbol sym-usable">●</i><span>正确/订正</span><b>${num(c.usable)}</b></div><div class="suspect"><i class="atlas-symbol sym-suspect">◆</i><span>可疑</span><b>${num(c.suspect)}</b></div><div class="error"><i class="atlas-symbol sym-error">▲</i><span>错误</span><b>${num(c.error)}</b></div><div class="missing"><i class="atlas-symbol sym-missing">■</i><span>缺失/未质控</span><b>${num(c.missing)}</b></div></div></div>`;
};

const oldDsTypeBody = dsTypeBody;
dsTypeBody = function() {
  return oldDsTypeBody();
};

const PROVINCE_CITY_ORDER_OVERRIDE = {
  '江苏省': ['南京', '无锡', '徐州', '常州', '苏州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁']
};

function getEquipCityOptions() {
  if (typeof CHINA_DIVISIONS === 'undefined') return ['全部'];
  if (S.scope && S.scope !== '全国') {
    if (PROVINCE_CITY_ORDER_OVERRIDE[S.scope]) {
      return ['全部', ...PROVINCE_CITY_ORDER_OVERRIDE[S.scope].map(c => formatCityUnitName(c))];
    }
    const div = CHINA_DIVISIONS.find(d => d.name === S.scope);
    return ['全部', ...(div ? div.cities.map(c => formatCityUnitName(c.name)) : [])];
  }
  const connectedCities = provinces.flatMap(p => {
    if (PROVINCE_CITY_ORDER_OVERRIDE[p.n]) {
      return PROVINCE_CITY_ORDER_OVERRIDE[p.n].map(c => formatCityUnitName(c));
    }
    const div = CHINA_DIVISIONS.find(d => d.name === p.n);
    return div ? div.cities.map(c => formatCityUnitName(c.name)) : [];
  });
  return ['全部', ...connectedCities];
}

function atlasEquipFilterWidget() {
  const cityOpts = getEquipCityOptions();
  if (S.equipCity && S.equipCity !== '全部' && !cityOpts.includes(S.equipCity)) {
    S.equipCity = '全部';
    S.equipCounty = '全部';
  }
  const countyDisabled = !S.equipCity || S.equipCity === '全部';
  const countyOpts = countyDisabled ? ['全部'] : ['全部', ...getCountiesForCity(S.equipCity)];
  if (S.equipCounty && S.equipCounty !== '全部' && !countyOpts.includes(S.equipCounty)) {
    S.equipCounty = '全部';
  }

  const activeTags = [];
  if (S.equipVoltage && S.equipVoltage !== '全部') activeTags.push(S.equipVoltage);
  if (S.equipType && S.equipType !== '全部') activeTags.push(S.equipType);
  if (S.equipCity && S.equipCity !== '全部') activeTags.push(S.equipCity);
  if (S.equipCounty && S.equipCounty !== '全部') activeTags.push(S.equipCounty);
  const hasEquip = activeTags.length > 0;
  const summaryText = hasEquip ? activeTags.join(' · ') : '全部';

  const voltageSelectHtml = dsRenderSelect({
    id: 'atlas-equip-voltage-select',
    value: S.equipVoltage || '全部',
    options: ['全部', '1000kV', '±800kV', '500kV', '±500kV', '220kV', '110kV', '35kV'],
    className: 'atlas-equip-cs',
    ariaLabel: '电压等级',
    onchange: "setAtlasEquipFilter('voltage', this.dataset.value)"
  });

  const citySelectHtml = dsRenderSelect({
    id: 'atlas-equip-city-select',
    value: S.equipCity || '全部',
    options: cityOpts,
    className: 'atlas-equip-cs',
    ariaLabel: '市级单位',
    onchange: "setAtlasEquipFilter('city', this.dataset.value)"
  });

  const countySelectHtml = dsRenderSelect({
    id: 'atlas-equip-county-select',
    value: S.equipCounty || '全部',
    options: countyOpts,
    className: 'atlas-equip-cs' + (countyDisabled ? ' is-disabled' : ''),
    ariaLabel: '县级单位',
    onchange: "setAtlasEquipFilter('county', this.dataset.value)"
  });

  return `
    <div class="atlas-equip-filter-widget">
      <button type="button" class="atlas-equip-trigger ${tileView.equipOpen ? 'is-open' : ''}" aria-haspopup="dialog" aria-expanded="${Boolean(tileView.equipOpen)}" onclick="toggleAtlasEquipPopover(event)">
        ${icon('grid')}
        <span class="atlas-equip-trigger-title">关联设备</span>
      </button>
      <div class="atlas-equip-popover ${tileView.equipOpen ? 'visible' : ''}" role="region" aria-label="关联设备筛选面板" onclick="event.stopPropagation()">
        <div class="atlas-equip-field">
          <div class="atlas-equip-label-row">
            <span class="atlas-equip-label">电压等级</span>
            ${hasEquip ? `<button type="button" class="atlas-equip-reset" onclick="resetAtlasEquipFilter(event)">重置</button>` : ''}
          </div>
          ${voltageSelectHtml}
        </div>
        <div class="atlas-equip-field">
          <span class="atlas-equip-label">专业类型</span>
          <div class="atlas-equip-seg" role="group" aria-label="专业类型">
            ${['全部', '线路', '变电站'].map(t => `<button type="button" class="${(S.equipType || '全部') === t ? 'active' : ''}" aria-pressed="${(S.equipType || '全部') === t}" onclick="setAtlasEquipFilter('type', '${t}', event)">${t}</button>`).join('')}
          </div>
        </div>
        <div class="atlas-equip-field">
          <span class="atlas-equip-label">市级单位</span>
          ${citySelectHtml}
        </div>
        <div class="atlas-equip-field ${countyDisabled ? 'is-disabled' : ''}">
          <span class="atlas-equip-label">县级单位</span>
          ${countySelectHtml}
        </div>
      </div>
    </div>
  `;
}

function toggleAtlasEquipPopover(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (typeof dsCloseAllCustomSelects === 'function') dsCloseAllCustomSelects();
  tileView.equipOpen = !tileView.equipOpen;
  const trigger = document.querySelector('.atlas-equip-trigger');
  const popover = document.querySelector('.atlas-equip-popover');
  if (trigger) {
    trigger.classList.toggle('is-open', tileView.equipOpen);
    trigger.setAttribute('aria-expanded', String(tileView.equipOpen));
  }
  if (popover) popover.classList.toggle('visible', tileView.equipOpen);
}

function setAtlasEquipFilter(key, val, event) {
  if (event) event.stopPropagation();
  if (key === 'type') {
    S.equipType = val || '全部';
  } else if (key === 'city') {
    S.equipCity = val || '全部';
    S.equipCounty = '全部';
  } else if (key === 'county') {
    S.equipCounty = val || '全部';
  } else if (key === 'voltage') {
    S.equipVoltage = val || '全部';
  }
  S.selectedStation = null;
  render();
}

function resetAtlasEquipFilter(event) {
  if (event) event.stopPropagation();
  S.equipType = '全部';
  S.equipCity = '全部';
  S.equipCounty = '全部';
  S.equipVoltage = '全部';
  S.selectedStation = null;
  render();
}

document.addEventListener('click', e => {
  if (!tileView.equipOpen) return;
  const widget = document.querySelector('.atlas-equip-filter-widget');
  if (widget && !widget.contains(e.target)) {
    tileView.equipOpen = false;
    const trigger = document.querySelector('.atlas-equip-trigger');
    const popover = document.querySelector('.atlas-equip-popover');
    if (trigger) {
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    if (popover) popover.classList.remove('visible');
  }
});

function atlasScopeFilters() {
  const isEval = S.tab === 'evaluation';
  const singleEls = ['气压', '温度', '湿度', '风速', '风向', '雨量', '辐照', '大气电场'];
  const els = isEval ? singleEls : ['综合', ...singleEls];
  if (isEval && (!S.element || S.element === '综合')) {
    S.element = '气压';
  }
  const provList = (typeof CHINA_DIVISIONS !== 'undefined' ? CHINA_DIVISIONS.map(p => p.name) : provinces.map(p => p.n));
  const scopeSelectHtml = dsRenderSelect({
    id: 'atlas-scope-select',
    value: S.scope,
    options: ['全国', ...provList],
    className: 'atlas-scope-cs',
    ariaLabel: '地域',
    onchange: 'changeScope(this.dataset.value)'
  });
  const elementSelectHtml = dsRenderSelect({
    id: 'atlas-element-select',
    value: S.element || (isEval ? '气压' : '综合'),
    options: els,
    className: 'atlas-scope-cs atlas-element-cs',
    ariaLabel: '监测要素',
    onchange: 'changeScreenElement(this.dataset.value)'
  });

  return `<form class="atlas-map-filters ds-scope-filters" aria-label="地图地域、时段、要素与关联设备筛选" onsubmit="return false"><div class="ds-tool-label atlas-region-group">${icon('pin')}<span>地域</span>${scopeSelectHtml}</div><div class="atlas-map-period" role="group" aria-label="时段筛选"><button type="button" class="atlas-period-live ${S.period === '当前' ? 'active' : ''}" aria-pressed="${S.period === '当前'}" onclick="changeScreenPeriod('当前')"><i class="live-dot"></i>当前</button>${['今日', '近3日', '近7日'].map(p => `<button type="button" class="${S.period === p ? 'active' : ''}" aria-pressed="${S.period === p}" onclick="changeScreenPeriod('${p}')">${p}</button>`).join('')}</div><div class="ds-tool-label atlas-element-select-group">${icon('activity')}<span>要素</span>${elementSelectHtml}</div>${atlasEquipFilterWidget()}</form>`;
}

function atlasMapMeta() {
  const starts = { '当前': '2026-10-23', '今日': '2026-10-23', '近3日': '2026-10-21', '近7日': '2026-10-17' };
  const tStr = typeof formatTimelineTime === 'function' ? formatTimelineTime() : '24:00';
  const elName = S.element || '综合';
  const full = S.period === '当前' ? `2026-10-23 ${tStr} 单时刻断面 · ${elName}` : `${starts[S.period] || '2026-10-23'} 00:00 至 2026-10-23 24:00 · ${elName}`;
  const short = S.period === '当前' ? `10.23 ${tStr}` : S.period === '今日' ? '10.23 00:00–24:00' : `${(starts[S.period] || '').slice(5).replace('-', '.')}–10.23`;
  return `<div class="atlas-map-meta"><span title="${S.scope}当前接入范围">接入 ${scopeRows().length} 省</span><time title="统计窗口：${full}">${short} · ${elName}</time><button aria-label="统计详情与口径" onclick="showScopeContext()">${icon('info')}口径</button></div>`;
}

function atlasLeftTools() {
  const canReset = S.scope !== '全国';
  return `<div class="atlas-left-tools" role="toolbar" aria-label="地图视角与图层工具"><button type="button" class="atlas-tool-btn atlas-reset-btn ${canReset ? 'can-reset' : ''}" aria-label="恢复全国视角及统计范围" title="恢复全国视角及统计范围${canReset ? '（当前：' + S.scope + '）' : ''}" onclick="resetMap()">${icon('refresh')}</button>${atlasLayerPanel()}</div>`;
}

function atlasLayerPanel() {
  return `<div class="atlas-layer-widget" aria-label="图层控制组件"><button type="button" class="atlas-tool-btn atlas-layer-trigger ${tileView.layersOpen ? 'active' : ''}" aria-label="图层控制" title="图层控制" onclick="toggleAtlasLayerPanel()">${icon('layers')}</button><div class="atlas-layer-popover ${tileView.layersOpen ? 'visible' : ''}" role="region" aria-label="图层控制面板"><div class="atlas-layer-popover-head"><div class="atlas-layer-popover-title">${icon('layers')}<span>图层</span></div><button type="button" class="atlas-layer-popover-close" aria-label="关闭图层面板" onclick="toggleAtlasLayerPanel(false)">${icon('close')}</button></div><div class="atlas-layer-body"><label><input type="checkbox" aria-label="显示省域分色" ${tileView.showProvinces ? 'checked' : ''} onchange="setAtlasLayer('showProvinces',this.checked)"><span>省域分色</span></label><label><input type="checkbox" aria-label="显示站点分布" ${tileView.showStations ? 'checked' : ''} onchange="setAtlasLayer('showStations',this.checked)"><span>站点分布</span></label><label><input type="checkbox" aria-label="显示省份名称" ${tileView.showLabels ? 'checked' : ''} onchange="setAtlasLayer('showLabels',this.checked)"><span>省份名称</span></label><label class="atlas-opacity-label" for="atlas-fill-opacity"><span>填色强度</span><output id="atlas-opacity-value" for="atlas-fill-opacity">${Math.round(tileView.opacity * 100)}%</output></label><input id="atlas-fill-opacity" aria-label="省域填色强度" type="range" min=".15" max=".8" step=".01" value="${tileView.opacity}" oninput="setAtlasOpacity(this.value)"></div></div></div>`;
}

function toggleAtlasLayerPanel(forceState) {
  tileView.layersOpen = forceState !== undefined ? Boolean(forceState) : !tileView.layersOpen;
  const trigger = document.querySelector('.atlas-layer-trigger');
  const popover = document.querySelector('.atlas-layer-popover');
  if (trigger) trigger.classList.toggle('active', tileView.layersOpen);
  if (popover) popover.classList.toggle('visible', tileView.layersOpen);
}

document.addEventListener('click', e => {
  if (!tileView.layersOpen) return;
  const widget = document.querySelector('.atlas-layer-widget');
  if (widget && !widget.contains(e.target)) toggleAtlasLayerPanel(false);
});

function buildTimelineCalendarBodyHtml() {
  const y = tileView.pickerYear || 2026;
  const m = tileView.pickerMonth || 10;
  const selStr = S.selectedDate || '2026-10-23';
  const todayStr = '2026-10-23';

  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m, 0).getDate();
  const prevMonthDays = new Date(y, m - 1, 0).getDate();

  const fmt = (yy, mm, dd) => `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const cells = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    const dStr = fmt(py, pm, d);
    cells.push(`<button type="button" class="cal-day is-other ${dStr === selStr ? 'is-selected' : ''}" onclick="selectTimelineCalendarDate('${dStr}', event)">${d}</button>`);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = fmt(y, m, d);
    const cls = [
      'cal-day',
      dStr === selStr ? 'is-selected' : '',
      dStr === todayStr ? 'is-today' : ''
    ].filter(Boolean).join(' ');
    cells.push(`<button type="button" class="${cls}" onclick="selectTimelineCalendarDate('${dStr}', event)">${d}</button>`);
  }

  const remain = 42 - cells.length;
  for (let d = 1; d <= remain; d++) {
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    const dStr = fmt(ny, nm, d);
    cells.push(`<button type="button" class="cal-day is-other ${dStr === selStr ? 'is-selected' : ''}" onclick="selectTimelineCalendarDate('${dStr}', event)">${d}</button>`);
  }

  const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
  return `
    <div class="cal-header">
      <div class="cal-nav-group">
        <button type="button" class="cal-nav-btn" aria-label="上一年" onclick="shiftTimelineCalendarMonth(-12, event)">«</button>
        <button type="button" class="cal-nav-btn" aria-label="上一月" onclick="shiftTimelineCalendarMonth(-1, event)">‹</button>
      </div>
      <span class="cal-title">${y}年 ${String(m).padStart(2, '0')}月</span>
      <div class="cal-nav-group">
        <button type="button" class="cal-nav-btn" aria-label="下一月" onclick="shiftTimelineCalendarMonth(1, event)">›</button>
        <button type="button" class="cal-nav-btn" aria-label="下一年" onclick="shiftTimelineCalendarMonth(12, event)">»</button>
      </div>
    </div>
    <div class="cal-weekdays">
      ${weekdays.map(w => `<span>${w}</span>`).join('')}
    </div>
    <div class="cal-grid">
      ${cells.join('')}
    </div>
    <div class="cal-footer">
      <span class="cal-selected-hint">${esc(selStr)}</span>
      <button type="button" class="cal-today-btn" onclick="selectTimelineCalendarDate('${todayStr}', event)">今天</button>
    </div>
  `;
}

function toggleTimelineDatePicker(event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  if (typeof dsCloseAllCustomSelects === 'function') dsCloseAllCustomSelects();
  tileView.datePickerOpen = !tileView.datePickerOpen;
  if (tileView.datePickerOpen) {
    const parts = (S.selectedDate || '2026-10-23').split('-');
    tileView.pickerYear = Number(parts[0]) || 2026;
    tileView.pickerMonth = Number(parts[1]) || 10;
  }
  const trigger = document.querySelector('.timeline-date-trigger');
  const popover = document.querySelector('.timeline-datepicker-popover');
  if (trigger) {
    trigger.classList.toggle('is-open', tileView.datePickerOpen);
    trigger.setAttribute('aria-expanded', String(tileView.datePickerOpen));
  }
  if (popover) {
    if (tileView.datePickerOpen) popover.innerHTML = buildTimelineCalendarBodyHtml();
    popover.classList.toggle('visible', tileView.datePickerOpen);
  }
}

function shiftTimelineCalendarMonth(deltaMonths, event) {
  if (event) event.stopPropagation();
  const dt = new Date(tileView.pickerYear || 2026, (tileView.pickerMonth || 10) - 1 + deltaMonths, 1);
  tileView.pickerYear = dt.getFullYear();
  tileView.pickerMonth = dt.getMonth() + 1;
  const popover = document.querySelector('.timeline-datepicker-popover');
  if (popover) popover.innerHTML = buildTimelineCalendarBodyHtml();
}

function selectTimelineCalendarDate(dateStr, event) {
  if (event) event.stopPropagation();
  if (!dateStr) return;
  S.selectedDate = dateStr;
  const parts = dateStr.split('-');
  tileView.pickerYear = Number(parts[0]) || 2026;
  tileView.pickerMonth = Number(parts[1]) || 10;
  tileView.datePickerOpen = false;
  render();
}

document.addEventListener('click', e => {
  if (!tileView.datePickerOpen) return;
  const box = document.querySelector('.timeline-date-box');
  if (box && !box.contains(e.target)) {
    tileView.datePickerOpen = false;
    const trigger = document.querySelector('.timeline-date-trigger');
    const popover = document.querySelector('.timeline-datepicker-popover');
    if (trigger) {
      trigger.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }
    if (popover) popover.classList.remove('visible');
  }
});

function atlasTimelineBar() {
  const curM = S.currentMinute ?? ((S.currentHour != null ? S.currentHour * 60 : 1440));
  const isLive = S.period === '当前';
  const isPlaying = Boolean(S.timePlay);
  const majorTicks = [0, 120, 240, 360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1440];
  const pctProgress = (curM / 1440) * 100;
  const tStr = typeof formatTimelineTime === 'function' ? formatTimelineTime(curM) : '24:00';
  const curDate = S.selectedDate || '2026-10-23';

  return `
    <div class="atlas-timeline-panel ${isLive ? 'mode-live' : 'mode-stat'}" aria-label="10分钟时刻切换时间轴">
      <div class="timeline-date-box">
        <button type="button" class="timeline-date-trigger ${tileView.datePickerOpen ? 'is-open' : ''}" aria-haspopup="dialog" aria-expanded="${Boolean(tileView.datePickerOpen)}" aria-label="选择观测日期" onclick="toggleTimelineDatePicker(event)">
          <span class="timeline-date-text">${esc(curDate)}</span>
          <span class="timeline-date-arrow" aria-hidden="true">${icon('down')}</span>
        </button>
        <div class="timeline-datepicker-popover ${tileView.datePickerOpen ? 'visible' : ''}" role="dialog" aria-label="日期选择器" onclick="event.stopPropagation()">
          ${buildTimelineCalendarBodyHtml()}
        </div>
      </div>
      <div class="timeline-controls" role="group" aria-label="10分钟步进控制">
        <button type="button" class="timeline-btn prev-btn" title="上一时次 (-10分钟)" onclick="stepTimeline(-1)">◀</button>
        <button type="button" class="timeline-play-btn ${isPlaying ? 'playing' : ''}" title="${isPlaying ? '暂停时序回放' : '开始自动时序回放'}" onclick="toggleTimelinePlay()">
          <span class="play-icon">${isPlaying ? '❚❚' : '▶'}</span>
        </button>
        <button type="button" class="timeline-btn next-btn" title="下一时次 (+10分钟)" onclick="stepTimeline(1)">▶</button>
      </div>
      <div class="timeline-axis-wrap">
        <div class="timeline-track-container" style="--track-pct:${pctProgress}%;--track-ratio:${curM / 1440};">
          <div class="timeline-thumb-badge" aria-hidden="true">
            <span class="timeline-thumb-badge-text">${tStr}</span>
            <i class="timeline-thumb-badge-arrow"></i>
          </div>
          <div class="timeline-track-bg"></div>
          <div class="timeline-track-fill"></div>
          <div class="timeline-thumb-handle" aria-hidden="true"></div>
          <input type="range" class="timeline-slider" min="0" max="1440" step="10" value="${curM}" aria-label="选择观测时刻（10分钟分辨率，最大24:00）" oninput="handleTimelineInput(this.value,this)" onchange="handleTimelineChange(this.value)">
          <div class="timeline-ticks">
            ${majorTicks.map(m => `<button type="button" class="timeline-tick ${Math.abs(m - curM) < 10 ? 'active' : ''}" data-minute="${m}" style="left:${(m / 1440) * 100}%" onclick="setTimelineMinute(${m})" title="${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}"><span class="tick-mark"></span><span class="tick-label">${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}</span></button>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

dsMap = function() {
  const hasTimeline = S.period === '当前';
  const isConnect = S.tab === 'connect';
  const isRapid = S.tab === 'rapid';
  const isProvince = S.tab === 'province';
  const isCorrection = S.tab === 'correction';
  const isEvaluation = S.tab === 'evaluation';
  let c, stateFilterHtml;
  if (isConnect) {
    c = networkArrivalCounts();
    stateFilterHtml = `
      <div class="atlas-state-filter" aria-label="数据接收状态筛选">
        <button class="${tileView.status === 'all' ? 'active' : ''}" onclick="filterNetwork('all')">全部<b>${num(c.all)}</b></button>
        <button class="${tileView.status === 'timely' ? 'active' : ''}" onclick="filterNetwork('timely')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/normal_64.webp" alt="">及时<b>${num(c.timely)}</b></button>
        <button class="${tileView.status === 'mild_delay' ? 'active' : ''}" onclick="filterNetwork('mild_delay')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/corrected_64.webp" alt="">提醒延迟<b>${num(c.mild_delay)}</b></button>
        <button class="${tileView.status === 'severe_delay' ? 'active' : ''}" onclick="filterNetwork('severe_delay')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/suspicious_64.webp" alt="">严重延迟<b>${num(c.severe_delay)}</b></button>
        <button class="${tileView.status === 'critical_delay' ? 'active' : ''}" onclick="filterNetwork('critical_delay')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/error_64.webp" alt="">危急延迟<b>${num(c.critical_delay)}</b></button>
        <button class="${tileView.status === 'missing' ? 'active' : ''}" onclick="filterNetwork('missing')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/missing_offline_64.webp" alt="">缺失<b>${num(c.missing)}</b></button>
      </div>`;
  } else if (isRapid) {
    c = networkRapidCounts();
    stateFilterHtml = `
      <div class="atlas-state-filter" aria-label="快速质控状态筛选">
        <button class="${tileView.status === 'all' ? 'active' : ''}" onclick="filterNetwork('all')">全部<b>${num(c.all)}</b></button>
        <button class="${tileView.status === 'format_ok' ? 'active' : ''}" onclick="filterNetwork('format_ok')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/normal_64.webp" alt="">格式正确<b>${num(c.format_ok)}</b></button>
        <button class="${tileView.status === 'complete_ok' ? 'active' : ''}" onclick="filterNetwork('complete_ok')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/corrected_64.webp" alt="">要素完整<b>${num(c.complete_ok)}</b></button>
        <button class="${tileView.status === 'over_limit' ? 'active' : ''}" onclick="filterNetwork('over_limit')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/error_64.webp" alt="">分要素超限<b>${num(c.over_limit)}</b></button>
        <button class="${tileView.status === 's2_pass' ? 'active' : ''}" onclick="filterNetwork('s2_pass')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/normal_64.webp" alt="">S2质控通过<b>${num(c.s2_pass)}</b></button>
      </div>`;
  } else if (isProvince) {
    c = networkS3Counts();
    stateFilterHtml = `
      <div class="atlas-state-filter" aria-label="数据核查状态筛选">
        <button class="${tileView.status === 'all' ? 'active' : ''}" onclick="filterNetwork('all')">全部<b>${num(c.all)}</b></button>
        <button class="${tileView.status === 'range_pass' ? 'active' : ''}" onclick="filterNetwork('range_pass')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/corrected_64.webp" alt="">主要变化范围通过<b>${num(c.range_pass)}</b></button>
        <button class="${tileView.status === 'internal_pass' ? 'active' : ''}" onclick="filterNetwork('internal_pass')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/suspicious_64.webp" alt="">内部一致性通过<b>${num(c.internal_pass)}</b></button>
        <button class="${tileView.status === 'time_pass' ? 'active' : ''}" onclick="filterNetwork('time_pass')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/missing_offline_64.webp" alt="">时间一致性通过<b>${num(c.time_pass)}</b></button>
        <button class="${tileView.status === 's3_pass' ? 'active' : ''}" onclick="filterNetwork('s3_pass')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/normal_64.webp" alt="">S3质控通过<b>${num(c.s3_pass)}</b></button>
      </div>`;
  } else if (isCorrection) {
    c = networkCorrectionCounts();
    stateFilterHtml = `
      <div class="atlas-state-filter" aria-label="数据订正状态筛选">
        <button class="${tileView.status === 'all' ? 'active' : ''}" onclick="filterNetwork('all')">全部<b>${num(c.all)}</b></button>
        <button class="${tileView.status === 'corrected' ? 'active' : ''}" onclick="filterNetwork('corrected')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/corrected_64.webp" alt="">订正<b>${num(c.corrected)}</b></button>
        <button class="${tileView.status === 'error' ? 'active' : ''}" onclick="filterNetwork('error')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/error_64.webp" alt="">错误<b>${num(c.error)}</b></button>
        <button class="${tileView.status === 'other' ? 'active' : ''}" onclick="filterNetwork('other')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/normal_64.webp" alt="">其他<b>${num(c.other)}</b></button>
      </div>`;
  } else if (isEvaluation) {
    c = networkEvalCounts();
    stateFilterHtml = `
      <div class="atlas-state-filter" aria-label="评估等级筛选">
        <button class="${tileView.status === 'all' ? 'active' : ''}" onclick="filterNetwork('all')">全部<b>${num(c.all)}</b></button>
        <button class="${tileView.status === 'excellent' ? 'active' : ''}" onclick="filterNetwork('excellent')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/normal_64.webp" alt="">优<b>${num(c.excellent)}</b></button>
        <button class="${tileView.status === 'medium' ? 'active' : ''}" onclick="filterNetwork('medium')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/suspicious_64.webp" alt="">中<b>${num(c.medium)}</b></button>
        <button class="${tileView.status === 'poor' ? 'active' : ''}" onclick="filterNetwork('poor')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/error_64.webp" alt="">差<b>${num(c.poor)}</b></button>
      </div>`;
  } else {
    c = networkCounts();
    stateFilterHtml = `
      <div class="atlas-state-filter" aria-label="质控状态筛选">
        <button class="${tileView.status === 'all' ? 'active' : ''}" onclick="filterNetwork('all')">全部<b>${num(c.all)}</b></button>
        <button class="${tileView.status === 'usable' ? 'active' : ''}" onclick="filterNetwork('usable')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/normal_64.webp" alt="">正确<b>${num(c.usable)}</b></button>
        <button class="${tileView.status === 'suspect' ? 'active' : ''}" onclick="filterNetwork('suspect')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/suspicious_64.webp" alt="">可疑<b>${num(c.suspect)}</b></button>
        <button class="${tileView.status === 'error' ? 'active' : ''}" onclick="filterNetwork('error')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/error_64.webp" alt="">错误<b>${num(c.error)}</b></button>
        <button class="${tileView.status === 'missing' ? 'active' : ''}" onclick="filterNetwork('missing')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/missing_offline_64.webp" alt="">缺失/离线<b>${num(c.missing)}</b></button>
        <button class="${tileView.status === 'corrected' ? 'active' : ''}" onclick="filterNetwork('corrected')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/corrected_64.webp" alt="">订正<b>${num(c.corrected || 0)}</b></button>
        <button class="${tileView.status === 'unchecked' ? 'active' : ''}" onclick="filterNetwork('unchecked')"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/unchecked_64.webp" alt="">未质控<b>${num(c.unchecked || 0)}</b></button>
      </div>`;
  }
  return `
    <div class="atlas-container">
      <div id="atlas-placeholder" class="atlas-map" aria-label="瓦片底图、省域填色与电力气象站点分布" role="region"></div>
      <div class="atlas-loading" id="atlas-loading">正在加载地图瓦片</div>
    </div>
    <div class="atlas-border-hud"></div>
    ${atlasScopeFilters()}
    
    <!-- 1. 时间轴上方的浮动工具栏与质控状态筛选（上移到时间轴上方） -->
    <div class="atlas-mid-controls ${hasTimeline ? 'has-timeline' : 'no-timeline'}" aria-label="地图控制与状态筛选">
      ${stateFilterHtml}
      ${atlasLeftTools()}
    </div>

    ${hasTimeline ? `
    <!-- 2. 最底部：时间轴独占一行（仅在“当前”断面模式下显示） -->
    <div class="atlas-bottom-timeline-row" aria-label="地图底栏：时间轴">
      ${atlasTimelineBar()}
    </div>` : ''}

    <div class="atlas-map-credit"><i></i><span id="atlas-health">NASA 地形瓦片 · 省域分色 · 质控四分类叠加</span></div>
  `;
};

function premiumMapPopup() {
  return '';
}

const originalPremiumRender = render;
render = function() {
  const oldNode = tileView.node;
  if (oldNode && oldNode.parentElement) oldNode.remove();
  originalPremiumRender();
  if (S.module !== 'qc') return;
  const target = document.getElementById('atlas-placeholder');
  if (!target) return;
  if (tileView.node) {
    target.replaceWith(tileView.node);
    if (tileView.loaded) hideAtlasLoader();
    tileView.map?.resize();
    syncAtlas();
  } else {
    target.id = 'atlas-map';
    tileView.node = target;
    initAtlas();
  }
};

function hideAtlasLoader() {
  document.getElementById('atlas-loading')?.remove();
}

function initAtlas() {
  if (typeof maplibregl === 'undefined' || typeof maplibregl.Map !== 'function') {
    hideAtlasLoader();
    document.getElementById('atlas-map').innerHTML = '<div class="atlas-map-error">当前预览环境未提供 WebGL，无法显示交互瓦片。请使用支持 WebGL 的浏览器打开原型。</div>';
    return;
  }
  try {
    const map = new maplibregl.Map({
      container: tileView.node,
      style: {
        version: 8,
        sources: {
          'public-dark-tiles': {
            type: 'raster',
            tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'],
            tileSize: 256,
            attribution: 'Imagery: <a href="https://www.earthdata.nasa.gov/engage/open-data-services-and-software/data-services/global-imagery-browse-services-gibs" target="_blank" rel="noopener">NASA GIBS</a> / Blue Marble',
            maxzoom: 8
          }
        },
        layers: [
          {
            id: 'base-background',
            type: 'background',
            paint: { 'background-color': '#081d2d' }
          },
          {
            id: 'raster-tiles',
            type: 'raster',
            source: 'public-dark-tiles',
            paint: {
              'raster-opacity': .44,
              'raster-saturation': -.86,
              'raster-contrast': .14,
              'raster-brightness-min': .02,
              'raster-brightness-max': .62,
              'raster-fade-duration': 150
            }
          }
        ]
      },
      center: [104.3, 35.5],
      zoom: 3.45,
      pitch: 17,
      bearing: -3,
      minZoom: 1,
      maxZoom: 12,
      attributionControl: { compact: false },
      renderWorldCopies: false,
      dragRotate: false,
      maxBounds: [[45, -5], [165, 68]],
      fadeDuration: 100
    });

    tileView.map = map;
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 76, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      tileView.loaded = true;
      createAtlasLayers();
      syncAtlas(true);
      hideAtlasLoader();
      tileView.node.dataset.mapReady = 'true';
      let zoomRaf = 0;
      const refreshClustersByZoom = (threshold) => {
        const z = map.getZoom();
        if (tileView.lastClusterZoom === null || Math.abs(z - tileView.lastClusterZoom) >= threshold) {
          tileView.lastClusterZoom = z;
          map.getSource('network-stations')?.setData(stationFeatures());
        }
      };
      map.on('zoom', () => {
        if (zoomRaf) return;
        zoomRaf = requestAnimationFrame(() => {
          zoomRaf = 0;
          refreshClustersByZoom(0.22);
          syncStationNameLabels();
        });
      });
      map.on('zoomend', () => {
        refreshClustersByZoom(0.06);
        syncStationNameLabels();
        window.updateMapControls?.();
      });
      map.on('moveend', () => {
        syncStationNameLabels();
      });
      window.updateMapControls?.();
    });

    map.on('idle', () => {
      if (map.isSourceLoaded('public-dark-tiles')) {
        tileView.node.dataset.tileReady = 'true';
        const health = document.getElementById('atlas-health');
        if (health) health.textContent = 'NASA 地形瓦片已加载 · 省域分色 · 质控状态动态叠加';
      }
    });

    map.on('error', e => {
      if (e.sourceId === 'public-dark-tiles') {
        tileView.error = true;
        const health = document.getElementById('atlas-health');
        if (health) health.textContent = '部分瓦片请求失败 · 省域与站点图层仍可使用';
      }
    });
  } catch (err) {
    hideAtlasLoader();
    tileView.node.innerHTML = '<div class="atlas-map-error">交互地图初始化失败，请检查浏览器图形加速设置后重新打开。</div>';
  }
}

/**
 * 加载并注册用户物理资产目录中的真实高保真八面体切图 (src/assets/images/station_icon/*)
 */
function initAtlasOctahedronIcons(map, callback) {
  const keys = ['normal', 'suspicious', 'error', 'missing_offline', 'corrected', 'unchecked'];
  let loaded = 0;

  const onAssetDone = () => {
    loaded++;
    map.triggerRepaint?.();
    if (loaded === keys.length) {
      if (typeof callback === 'function') callback();
    }
  };

  keys.forEach(key => {
    const iconId = 'station-octahedron-' + key;
    const url = `./src/assets/images/station_icon/${key}_128.webp`;

    const registerImg = imgData => {
      try {
        if (imgData) {
          tileView.octahedronImages[key] = imgData;
          if (!map.hasImage(iconId)) {
            map.addImage(iconId, imgData);
          }
        }
      } catch (e) {
        console.warn('[StationIcon] addImage error:', iconId, e);
      }
      onAssetDone();
    };

    const fallbackImgLoad = () => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (typeof createImageBitmap === 'function') {
          createImageBitmap(img).then(bmp => registerImg(bmp)).catch(() => registerImg(img));
        } else {
          registerImg(img);
        }
      };
      img.onerror = () => {
        console.error('[StationIcon] 加载 WebP 资产切图失败:', url);
        onAssetDone();
      };
      img.src = url;
    };

    try {
      const maybePromise = map.loadImage(url);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then(res => {
          const data = (res && res.data) ? res.data : res;
          if (data) registerImg(data);
          else fallbackImgLoad();
        }).catch(() => fallbackImgLoad());
      } else {
        fallbackImgLoad();
      }
    } catch (err) {
      fallbackImgLoad();
    }
  });
}

function createAtlasLayers() {
  const m = tileView.map;

  m.addSource('china-only-mask', { type: 'geojson', data: CHINA_MAP_EXTENT.mask });
  m.addLayer({
    id: 'china-only-mask',
    type: 'fill',
    source: 'china-only-mask',
    paint: { 'fill-color': '#081d2d', 'fill-opacity': 1, 'fill-antialias': true }
  });

  // 剔除合并省界留下的内陆细碎缝隙孔洞，仅保留外围国界与岛屿海岸线外环
  const cleanCountryOutline = {
    ...CHINA_MAP_EXTENT.country,
    geometry: {
      ...CHINA_MAP_EXTENT.country.geometry,
      coordinates: CHINA_MAP_EXTENT.country.geometry.coordinates
        .map(poly => [poly[0]])
        .filter(poly => poly[0] && poly[0].length > 6)
    }
  };
  m.addSource('china-outline', { type: 'geojson', data: cleanCountryOutline });
  m.addLayer({
    id: 'china-outline-glow',
    type: 'line',
    source: 'china-outline',
    paint: { 'line-color': '#72aebe', 'line-width': 4, 'line-blur': 3, 'line-opacity': .2 }
  });

  const colors = ['#285778', '#25617a', '#2b5879', '#306b83', '#204d69', '#315d7c', '#285e76', '#386986'];
  const geo = {
    type: 'FeatureCollection',
    features: PROVINCE_GEOJSON.features.map((f, i) => ({
      ...f,
      properties: { ...f.properties, color: colors[i % colors.length] }
    }))
  };

  m.addSource('province-regions', { type: 'geojson', data: geo });
  m.addLayer({
    id: 'province-color',
    type: 'fill',
    source: 'province-regions',
    paint: {
      'fill-color': ['case', ['==', ['get', 'name'], S.scope], '#698da0', ['get', 'color']],
      'fill-opacity': tileView.opacity
    }
  });
  m.addLayer({
    id: 'province-glow',
    type: 'line',
    source: 'province-regions',
    paint: { 'line-color': '#d1c498', 'line-width': 3, 'line-opacity': .13, 'line-blur': 2 }
  });
  m.addLayer({
    id: 'province-border',
    type: 'line',
    source: 'province-regions',
    paint: { 'line-color': '#c9d4ca', 'line-width': .75, 'line-opacity': .62 }
  });
  m.addLayer({
    id: 'province-selection',
    type: 'line',
    source: 'province-regions',
    filter: ['==', ['get', 'name'], S.scope],
    paint: { 'line-color': '#fecc8b', 'line-width': 2, 'line-opacity': .9 }
  });

  // 站点数据源与质控图层
  m.addSource('network-stations', { type: 'geojson', data: stationFeatures() });

  // 1. 地表微弱柔光图层 (Ambient Glow)
  m.addLayer({
    id: 'station-halos',
    type: 'circle',
    source: 'network-stations',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3.2, 6, 3.8, 8.5, 5.5, 11, 8.0],
      'circle-color': [
        'match', ['get', 'octahedron_status'],
        'normal', '#1fc79a',
        'suspicious', '#f0ad4e',
        'error', '#ee5a52',
        'missing_offline', '#6f93ba',
        'corrected', '#36b3d9',
        'unchecked', '#628a9b',
        '#1fc79a'
      ],
      'circle-opacity': 0.12,
      'circle-blur': 0.85
    }
  });

  // 2. 点击热区
  m.addLayer({
    id: 'station-hits',
    type: 'circle',
    source: 'network-stations',
    paint: { 'circle-radius': 12, 'circle-opacity': 0 }
  });

  // 2.5 站点名称图层（置于 station-octahedron-markers 之下，确保图标永远覆盖在文字上方）
  m.on('styleimagemissing', e => {
    const id = e.id || '';
    if (!id.startsWith('station-label-')) return;
    const isSel = id.endsWith('-sel');
    const stId = id.replace(/^station-label-/, '').replace(/-sel$/, '');
    const stObj = networkStations.find(s => s.id === stId);
    if (stObj) {
      ensureStationLabelIcon(m, stObj.id, stObj.name, isSel);
    }
  });

  m.addLayer({
    id: 'station-name-labels',
    type: 'symbol',
    source: 'network-stations',
    minzoom: 7.5,
    layout: {
      'icon-image': ['get', 'label_icon_id'],
      'icon-anchor': 'top',
      'icon-offset': [
        'interpolate',
        ['linear'],
        ['zoom'],
        7.5, ['literal', [0, 27]],
        8.2, ['literal', [0, 34]],
        9.5, ['literal', [0, 44]],
        11.0, ['literal', [0, 56]],
        12.5, ['literal', [0, 68]]
      ],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true
    }
  }, 'station-hits');

  // 3. 八面体状态图标图层（在中段缩放分裂出更多站点时缩小点位，随继续放大再逐步加大）
  m.addLayer({
    id: 'station-octahedron-markers',
    type: 'symbol',
    source: 'network-stations',
    layout: {
      'icon-image': ['coalesce', ['get', 'icon_id'], 'station-octahedron-normal'],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'icon-anchor': 'center',
      'icon-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        3.2, ['case', ['>', ['get', 'point_count'], 15], 0.25, ['>', ['get', 'point_count'], 1], 0.21, 0.16],
        4.5, ['case', ['>', ['get', 'point_count'], 15], 0.23, ['>', ['get', 'point_count'], 1], 0.19, 0.14],
        5.5, ['case', ['>', ['get', 'point_count'], 15], 0.24, ['>', ['get', 'point_count'], 1], 0.20, 0.16],
        6.3, ['case', ['>', ['get', 'point_count'], 1], 0.26, 0.22],
        7.2, 0.32,
        8.2, 0.45,
        9.5, 0.62,
        11.0, 0.82,
        12.5, 1.00
      ]
    },
    paint: {
      'icon-opacity': 0.8
    }
  }, 'station-hits');

  initAtlasOctahedronIcons(m, () => {
    syncAtlas();
  });

  const handleStationPick = e => {
    e.originalEvent._stationHandled = true;
    const f = e.features?.[0];
    if (!f) return;
    const count = Number(f.properties?.point_count || 1);
    if (count > 1) {
      const coords = f.geometry?.coordinates;
      if (coords) {
        m.easeTo({
          center: coords,
          zoom: Math.min(m.getZoom() + 1.6, 7.6),
          duration: 360
        });
      }
      return;
    }
    selectNetworkStation(f.properties.id);
  };

  m.on('click', 'station-hits', handleStationPick);
  m.on('click', 'station-name-labels', handleStationPick);
  m.on('click', 'station-octahedron-markers', handleStationPick);

  m.on('click', 'province-color', e => {
    if (e.originalEvent._stationHandled) return;
    const f = e.features?.[0];
    if (f) selectScreenProvince(f.properties.name);
  });

  for (const id of ['station-hits', 'station-name-labels', 'station-octahedron-markers', 'province-color']) {
    m.on('mouseenter', id, () => m.getCanvas().style.cursor = 'pointer');
    m.on('mouseleave', id, () => m.getCanvas().style.cursor = '');
  }

  for (const f of PROVINCE_GEOJSON.features) {
    if (['北京市', '天津市', '上海市', '香港特别行政区', '澳门特别行政区'].includes(f.properties.name)) continue;
    const label = document.createElement('span');
    label.className = 'atlas-province-label';
    label.textContent = f.properties.name.replace(/省|自治区|特别行政区|维吾尔|壮族|回族/g, '');
    const marker = new maplibregl.Marker({ element: label, anchor: 'center' }).setLngLat(f.properties.center).addTo(m);
    tileView.labels.push({ marker, element: label, province: f.properties.name });
  }
}

function syncStationNameLabels() {
  const m = tileView.map;
  if (!m || !tileView.loaded) return;
  const z = m.getZoom();
  tileView.labels.forEach(({ element }) => {
    element.style.display = (tileView.showLabels && z < 7.8) ? '' : 'none';
  });
}

function syncAtlas(forceCamera = false) {
  const m = tileView.map;
  if (!m || !tileView.loaded) return;

  tileView.lastClusterZoom = m.getZoom();
  m.getSource('network-stations')?.setData(stationFeatures());
  const show = tileView.showStations ? 'visible' : 'none';

  const stationLayers = ['station-halos', 'station-name-labels', 'station-octahedron-markers', 'station-hits'];
  for (const id of stationLayers) {
    if (m.getLayer(id)) {
      m.setLayoutProperty(id, 'visibility', show);
      m.setFilter(id, null);
    }
  }

  for (const id of ['province-color', 'province-glow', 'province-border', 'province-selection']) {
    m.setLayoutProperty(id, 'visibility', tileView.showProvinces ? 'visible' : 'none');
  }

  m.setPaintProperty('province-color', 'fill-opacity', tileView.opacity);
  const color = S.mapMode === 'events' ? ['case', ['in', ['get', 'name'], ['literal', Array.from(new Set(pending().map(e => station(e.station).p)))]], '#806044', ['get', 'color']] : S.mapMode === 'stations' ? '#43647e' : ['get', 'color'];
  m.setPaintProperty('province-color', 'fill-color', ['case', ['==', ['get', 'name'], S.scope], '#698da0', color]);
  m.setFilter('province-selection', ['==', ['get', 'name'], S.scope]);

  tileView.labels.forEach(({ element, province }) => {
    element.classList.toggle('selected', province === S.scope);
    element.style.display = (tileView.showLabels && m.getZoom() < 7.8) ? '' : 'none';
  });

  syncStationNameLabels();

  tileView.markers.forEach(({ element, row }) => {
    const status = networkEffectiveStatus(row);
    const visible = tileView.showStations && (S.scope === '全国' || row.province === S.scope) && (tileView.status === 'all' || tileView.status === status);
    element.className = 'maplibregl-marker atlas-core-marker ' + status + (S.selectedStation === row.id ? ' selected' : '');
    element.style.visibility = visible ? 'visible' : 'hidden';
    const cfg = (S.tab === 'connect' ? ARRIVAL_STATUS_CONFIG[status] : (S.tab === 'rapid' ? RAPID_STATUS_CONFIG[status] : QC_STATUS_CONFIG[status])) || QC_STATUS_CONFIG.usable;
    element.setAttribute('aria-label', row.name + '，' + cfg.label + '，查看站点质控状态');
  });

  if (forceCamera || tileView.scope !== S.scope) {
    tileView.scope = S.scope;
    fitAtlasCamera();
  }

  const count = document.getElementById('network-visible-count');
  if (count) count.textContent = num(tileView.showStations ? networkShown().length : 0);
  tileView.node.dataset.visibleStations = String(tileView.showStations ? networkShown().length : 0);
  tileView.node.dataset.scope = S.scope;
}

function fitAtlasCamera() {
  const m = tileView.map;
  if (!m) return;
  m.setMaxBounds(null);
  let bounds = CHINA_MAP_EXTENT.bounds;
  if (S.scope !== '全国') {
    const f = PROVINCE_GEOJSON.features.find(f => f.properties.name === S.scope);
    if (!f) return;
    const pts = f.geometry.coordinates.flat(2), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    bounds = [[Math.min(...xs) - .2, Math.min(...ys) - .2], [Math.max(...xs) + .2, Math.max(...ys) + .2]];
  }
  m.fitBounds(bounds, {
    padding: { top: 28, bottom: 28, left: 10, right: 10 },
    pitch: 0,
    bearing: 0,
    maxZoom: 7,
    duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240
  });
}

function selectNetworkStation(id) {
  const row = networkStations.find(s => s.id === id);
  if (!row) return;
  S.selectedStation = id;
  if (row.core) {
    const e = filteredEvents().find(e => e.station === id);
    if (e) S.selectedEvent = e.id;
  }
  render();
}

function filterNetwork(status) {
  tileView.status = status;
  S.selectedStation = null;
  render();
}

zoomMap = function(delta) {
  tileView.map?.zoomTo(tileView.map.getZoom() + delta * 4, { duration: 250 });
};

resetMap = function() {
  tileView.status = 'all';
  tileView.equipOpen = false;
  S.scope = '全国';
  S.equipType = '全部';
  S.equipCity = '全部';
  S.equipCounty = '全部';
  S.equipVoltage = '全部';
  S.selectedStation = null;
  S.selectedEvent = filteredEvents()[0]?.id || null;
  tileView.scope = null;
  render();
};

function openNetworkStation(id) {
  const row = networkStations.find(s => s.id === id);
  if (!row) return;
  if (row.core) {
    openStation(id);
    return;
  }
  S.detail = null;
  const status = networkEffectiveStatus(row);
  const cfg = (S.tab === 'connect' ? ARRIVAL_STATUS_CONFIG[status] : (S.tab === 'rapid' ? RAPID_STATUS_CONFIG[status] : (S.tab === 'province' ? S3_STATUS_CONFIG[status] : (S.tab === 'correction' ? CORRECTION_STATUS_CONFIG[status] : (S.tab === 'evaluation' ? EVAL_STATUS_CONFIG[status] : QC_STATUS_CONFIG[status]))))) || QC_STATUS_CONFIG.usable;
  const statusNotes = {
    other: '该站点当前要素观测正常，处于基准稳定运行状态。',
    excellent: '数据可用率达到95%以上，观测-模式绝对偏差位于允许范围以内，综合评估质量为优。',
    medium: '观测数据与模式基准存在轻度偏离，可用率在90%~95%之间，综合评估质量为中。',
    poor: '观测偏差超出标准线（>1.2 hPa），或存在持续性漂移与缺测，综合评估质量为差。',
    usable: '数据通过全部一致性与界限值规则校验，评定为可用数据，正常汇聚入库。',
    suspect: '部分规则提示异常或存在持续性卡滞趋势，标识为可疑待核查。',
    error: '超出物理极值或空间比对显著偏离参考区间，判定为错误数据。',
    missing: S.tab === 'connect' ? '当前时次链路未收到该站点报文，处于缺失状态。' : '当前通道未按时到报或该时次未执行质控评估。',
    corrected: '已经过算法自适应订正或人工闭环核验，数据恢复可用。',
    unchecked: '当前批次尚未执行质控算法评估或处于待检状态。',
    timely: '当前时次报文在规定时限内正常接收并入库。',
    mild_delay: '当前时次报文轻度超时到达，已触发提醒延迟标记。',
    severe_delay: '当前时次报文显著滞后到达，链路传输存在拥塞或重传。',
    critical_delay: '当前时次报文严重积压超时，建议排查省侧前置通信链路。',
    s2_pass: '数据格式规范、要素完整齐全且所有观测要素均在合理物理界限阈值范围内，全面通过 S2 快速质控。',
    format_ok: '数据报文格式规范，符合电网微气象传输规约标准。',
    complete_ok: '所有监测要素通道均有观测数据上报，无要素缺测漏报情况。',
    over_limit: '存在分要素数值超出合理界限阈值范围（如风速、气压超限），已触发快速界限告警。',
    s3_pass: '该站点当前时次通过主要变化范围、内部物理一致性及时间连续一致性全部核查项。',
    range_pass: '该站点当前要素观测值在主要变化范围之内，数据合理性良好。',
    internal_pass: '该站点温湿、风压等关联气象要素内部物理逻辑协调，符合相关性规律。',
    time_pass: '该站点时序差分及变化趋势平稳连续，未检出突变或卡滞。'
  };

  coreOpenModal('电力气象站点样本档案', `
    <div class="eyebrow">STATION DISTRIBUTION / ${esc(row.id)}</div>
    <h2 style="font-size:21px">${esc(row.name)}</h2>
    <div class="atlas-popup-meta"><img class="atlas-octa-mini-icon" src="./src/assets/images/station_icon/${OCTAHEDRON_STATUS_KEY_MAP[status] || 'normal'}_64.webp" alt=""><b style="color:${cfg.color}">${cfg.label}</b></div>
    <div class="dl" style="margin:20px 0">
      <div><span>所属省份</span>${row.province}</div>
      <div><span>站点编号</span>${row.id}</div>
      <div><span>展示坐标</span>${row.coordinates[0].toFixed(4)}°E / ${row.coordinates[1].toFixed(4)}°N</div>
      <div><span>质控分类</span><span style="color:${cfg.color}">${cfg.label}</span></div>
    </div>
    <div class="evidence-note">
      <strong>${cfg.label}状态说明</strong>
      ${statusNotes[status] || '根据统一质控模型实时判定。'}
    </div>
    <p class="page-desc" style="margin-top:14px">所有坐标和状态均为设计样本，不代表真实站点位置。</p>
  `);
}

function setAtlasLayer(key, visible) {
  if (!['showProvinces', 'showStations', 'showLabels'].includes(key)) return;
  tileView[key] = Boolean(visible);
  if (key === 'showStations' && !visible) {
    S.selectedStation = null;
    document.querySelector('.ds-map-station')?.remove();
  }
  syncAtlas();
}

function setAtlasOpacity(value) {
  const opacity = Number(value);
  if (!Number.isFinite(opacity)) return;
  tileView.opacity = Math.max(.15, Math.min(.8, opacity));
  const output = document.getElementById('atlas-opacity-value');
  if (output) output.textContent = Math.round(tileView.opacity * 100) + '%';
  syncAtlas();
}

let atlasResizeFrame;
const atlasResizeObserver = new ResizeObserver(entries => {
  if (!tileView.map || !entries.some(entry => entry.contentRect.width > 0 && entry.contentRect.height > 0)) return;
  cancelAnimationFrame(atlasResizeFrame);
  atlasResizeFrame = requestAnimationFrame(() => {
    tileView.map?.resize();
    if (tileView.loaded) fitAtlasCamera();
  });
});

const responsiveAtlasRender = render;
render = function() {
  responsiveAtlasRender();
  if (S.module === 'qc' && tileView.node) atlasResizeObserver.observe(tileView.node);
};

if (tileView.node) atlasResizeObserver.observe(tileView.node);
render();
