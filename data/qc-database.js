'use strict';

/**
 * =========================================================================
 * 电力气象数据质控统一微型数据库 (QC Unified Micro-Database)
 * 职责：
 * 1. 统一管理全网 1280 装置与 34 省市、要素与时序维度的核心质控六分类：
 *    - 正确 (usable)       #1fc79a ●
 *    - 可疑 (suspect)      #f0ad4e ◆
 *    - 错误 (error)        #ee5a52 ▲
 *    - 缺失/离线 (missing) #6f93ba ■ （缺失与离线统一划归为同一指标）
 *    - 订正 (corrected)    #36b3d9 ★
 *    - 未质控 (unchecked)  #50687d ◌
 * 2. 质控趋势四分类堆叠驱动（严格对齐）：
 *    - 正确&订正 (usable + corrected)
 *    - 可疑 (suspect)
 *    - 错误 (error)
 *    - 缺失/离线/未质控 (missing + unchecked)
 * 3. 省级装置分布基于正确率降序排名，分色条严格按六分类着色。
 * =========================================================================
 */

const QcDatabase = (function() {
  // 核心质控状态六分类元数据定义
  const STATUS_CONFIG = {
    usable: {
      id: 'usable',
      label: '正确',
      shortLabel: '正确',
      color: '#1fc79a',
      haloColor: 'rgba(31, 199, 154, 0.28)',
      symbol: '●',
      iconClass: 'sym-usable'
    },
    suspect: {
      id: 'suspect',
      label: '可疑',
      shortLabel: '可疑',
      color: '#f0ad4e',
      haloColor: 'rgba(240, 173, 78, 0.35)',
      symbol: '◆',
      iconClass: 'sym-suspect'
    },
    error: {
      id: 'error',
      label: '错误',
      shortLabel: '错误',
      color: '#ee5a52',
      haloColor: 'rgba(238, 90, 82, 0.45)',
      symbol: '▲',
      iconClass: 'sym-error'
    },
    missing: {
      id: 'missing',
      label: '缺失/离线',
      shortLabel: '缺失/离线',
      color: '#6f93ba',
      haloColor: 'rgba(111, 147, 186, 0.22)',
      symbol: '■',
      iconClass: 'sym-missing'
    },
    corrected: {
      id: 'corrected',
      label: '订正',
      shortLabel: '订正',
      color: '#36b3d9',
      haloColor: 'rgba(54, 179, 217, 0.35)',
      symbol: '★',
      iconClass: 'sym-corrected'
    },
    unchecked: {
      id: 'unchecked',
      label: '未质控',
      shortLabel: '未质控',
      color: '#50687d',
      haloColor: 'rgba(80, 104, 125, 0.20)',
      symbol: '◌',
      iconClass: 'sym-unchecked'
    }
  };

  // 8 个已接入数据业务省份，其余 26 省为未接入状态（数据为 0）
  const CONNECTED_PROVINCES = ['浙江省', '江苏省', '四川省', '湖南省', '安徽省', '湖北省', '河南省', '山西省'];
  function isProvinceConnected(name) {
    if (!name || name === '全国') return true;
    return CONNECTED_PROVINCES.some(p => p === name || p.replace('省', '') === name.replace('省', '') || name.startsWith(p.slice(0, 2)));
  }

  /**
   * 字符串哈希算法
   */
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    }
    return h >>> 0;
  }

  // 8 个已接入数据业务省份的特色质控画像基准权重
  const PROVINCE_BASE_WEIGHTS = {
    '浙江省': { usable: 78.5, corrected: 7.2, suspect: 4.8, error: 2.5, missing: 4.2, unchecked: 2.8 },
    '江苏省': { usable: 72.0, corrected: 6.5, suspect: 11.2, error: 3.4, missing: 4.5, unchecked: 2.4 },
    '四川省': { usable: 58.5, corrected: 7.0, suspect: 9.2, error: 5.8, missing: 15.5, unchecked: 4.0 },
    '山西省': { usable: 63.8, corrected: 5.2, suspect: 7.8, error: 11.5, missing: 7.5, unchecked: 4.2 },
    '湖南省': { usable: 62.5, corrected: 11.8, suspect: 11.5, error: 5.2, missing: 6.5, unchecked: 2.5 },
    '湖北省': { usable: 71.0, corrected: 5.5, suspect: 6.8, error: 4.2, missing: 7.8, unchecked: 4.7 },
    '河南省': { usable: 73.2, corrected: 4.8, suspect: 5.5, error: 3.8, missing: 5.2, unchecked: 7.5 },
    '安徽省': { usable: 66.0, corrected: 6.2, suspect: 8.5, error: 6.8, missing: 8.5, unchecked: 4.0 }
  };

  /**
   * 计算指定时间切片、管理范围与要素下的六分类基准比例
   * @param {string} scope - '全国' 或省份名称（如 '四川省'、'四川省-甘孜藏族自治州'）
   * @param {string} period - '当前', '今日', '近3日', '近7日'
   * @param {number} minute - 当前时刻分钟数 (0~1440)
   * @param {string} element - 监测要素（如 '综合', '气压', '风速' 等）
   * @returns {{ usable: number, suspect: number, error: number, missing: number, corrected: number, unchecked: number }}
   */
  function calculateRatios(scope = '全国', period = '今日', minute = 1000, element = '综合') {
    const isSingleElement = Boolean(element && element !== '综合');
    const scopeSeed = hash(scope || '全国');
    const curM = Math.max(0, Math.min(1440, Number(minute) || 1000));
    const t = curM / 60; // 小时浮点数 (0 ~ 24)

    // 解析省份名（兼容 "四川省-成都市" 或 "四川"）
    let provKey = (scope || '全国').split('-')[0].trim();
    if (!provKey.endsWith('省') && !provKey.endsWith('市') && !provKey.endsWith('自治区')) {
      provKey = provKey + '省';
    }

    // 匹配省份专属画像基准
    let base = PROVINCE_BASE_WEIGHTS[provKey] || PROVINCE_BASE_WEIGHTS[scope];
    if (!base) {
      // 其它省份根据哈希分配具有明显差异的 4 类基准模板
      const modType = scopeSeed % 4;
      if (modType === 0) {
        // 优质平原省份
        base = { usable: 75.0, corrected: 5.5, suspect: 6.5, error: 3.5, missing: 5.5, unchecked: 4.0 };
      } else if (modType === 1) {
        // 山区多雾多缺测省份
        base = { usable: 61.0, corrected: 6.8, suspect: 8.5, error: 5.2, missing: 14.5, unchecked: 4.0 };
      } else if (modType === 2) {
        // 沿海强对流多突变省份
        base = { usable: 68.0, corrected: 8.2, suspect: 12.0, error: 4.5, missing: 4.8, unchecked: 2.5 };
      } else {
        // 戈壁覆冰重工超限省份
        base = { usable: 64.0, corrected: 5.0, suspect: 7.5, error: 10.5, missing: 8.0, unchecked: 5.0 };
      }
    }

    // 地市级微扰（若包含地市）
    let cityUsableDelta = 0;
    let cityMisDelta = 0;
    if (scope && scope.includes('-')) {
      const citySeed = hash(scope);
      cityUsableDelta = ((citySeed % 11) - 5) * 1.2;
      cityMisDelta = (((citySeed >> 3) % 9) - 4) * 0.9;
    }

    // 基于傅里叶多谐波物理特征趋势叠加
    const waveUsable = 4.2 * Math.sin(t * Math.PI / 12 + 1.2) - 2.8 * Math.cos(t * Math.PI / 6);
    const waveCor = 1.0 * Math.sin(t * Math.PI / 8);
    const waveSus = 1.8 * Math.sin((t - 6) * Math.PI / 6);
    const waveErr = 1.5 * Math.cos((t - 14) * Math.PI / 8);
    const waveMissing = isSingleElement ? 1.8 * Math.sin(t * 0.5) : 1.5 * Math.cos(t * 0.6);
    const waveUnchecked = 1.2 * Math.sin((t - 2) * Math.PI / 10);

    const weights = [
      Math.max(45, base.usable + waveUsable + cityUsableDelta),
      Math.max(2, base.suspect + waveSus),
      Math.max(1.5, base.error + waveErr),
      Math.max(2, base.missing + waveMissing + cityMisDelta),
      Math.max(1.5, base.corrected + waveCor),
      Math.max(1.5, base.unchecked + waveUnchecked)
    ];

    const sum = weights.reduce((a, b) => a + b, 0);
    return {
      usable: weights[0] / sum,
      suspect: weights[1] / sum,
      error: weights[2] / sum,
      missing: weights[3] / sum,
      corrected: weights[4] / sum,
      unchecked: weights[5] / sum
    };
  }

  // 缓存站点状态计算，避免每帧重复计算
  const stationStatusCache = new Map();

  /**
   * 获取特定站点在当前切片下的质控状态 (返回 usable, suspect, error, missing, corrected, unchecked)
   */
  function getStationQualityStatus(stationOrId, provinceName, scope = '全国', period = '今日', minute = 1000, element = '综合') {
    const stationId = (typeof stationOrId === 'object' && stationOrId) ? (stationOrId.id || stationOrId.name) : String(stationOrId);
    const prov = provinceName || (typeof stationOrId === 'object' ? stationOrId.province : '') || scope || '全国';
    const cacheKey = `${stationId}|${prov}|${scope}|${period}|${minute}|${element}`;
    if (stationStatusCache.has(cacheKey)) {
      return stationStatusCache.get(cacheKey);
    }

    // 1. 核心重点站（与原始事件严格对应）
    const ev = typeof events !== 'undefined'
      ? events.find(e => e.station === stationId)
      : null;

    if (ev) {
      if (ev.status === '已闭环') {
        stationStatusCache.set(cacheKey, 'corrected');
        return 'corrected';
      }
      if (ev.type === '缺测') {
        stationStatusCache.set(cacheKey, 'missing');
        return 'missing';
      }
      if (ev.type === '界限值异常' || ev.level === '严重') {
        stationStatusCache.set(cacheKey, 'error');
        return 'error';
      }
      stationStatusCache.set(cacheKey, 'suspect');
      return 'suspect';
    }

    // 离线站点划归为缺失/离线
    if (typeof stationOrId === 'object' && stationOrId && stationOrId.baseStatus === 'offline') {
      stationStatusCache.set(cacheKey, 'missing');
      return 'missing';
    }

    // 2. 普通站点按六分类比例确定性哈希分配（固定基于站点所属省份，避免切换省域高亮时站点状态跳变）
    const ratios = calculateRatios(prov, period, minute, element);
    const stationHash = hash(stationId + '|' + prov + '|' + Math.floor(minute / 60));
    const normalized = (stationHash % 10000) / 10000;

    let res = 'usable';
    if (normalized < ratios.usable) {
      res = 'usable';
    } else if (normalized < ratios.usable + ratios.corrected) {
      res = 'corrected';
    } else if (normalized < ratios.usable + ratios.corrected + ratios.suspect) {
      res = 'suspect';
    } else if (normalized < ratios.usable + ratios.corrected + ratios.suspect + ratios.error) {
      res = 'error';
    } else if (normalized < ratios.usable + ratios.corrected + ratios.suspect + ratios.error + ratios.missing) {
      res = 'missing';
    } else {
      res = 'unchecked';
    }

    stationStatusCache.set(cacheKey, res);
    return res;
  }

  /**
   * 获取当前范围与时序切片下的站点聚合六分类统计
   * 保证: all === usable + suspect + error + missing + corrected + unchecked
   */
  function getQualityCounts(arg1, arg2, arg3, arg4, arg5) {
    let list;
    let scope = '全国';
    let period = '今日';
    let minute = 1000;
    let element = '综合';

    if (Array.isArray(arg1)) {
      list = arg1;
      scope = arg2 || '全国';
      period = arg3 || '今日';
      minute = arg4 ?? 1000;
      element = arg5 || '综合';
    } else {
      scope = arg1 || '全国';
      period = arg2 || '今日';
      element = arg3 || '综合';
      minute = arg4 ?? 1000;
      if (typeof networkStations !== 'undefined' && networkStations.length) {
        list = networkStations.filter(s => scope === '全国' || s.province === scope);
      } else {
        list = [];
      }
    }

    // 未接入数据的省份（如贵州、广东等），数据应当为 0
    if (scope !== '全国' && !isProvinceConnected(scope)) {
      return {
        all: 0,
        usable: 0,
        suspect: 0,
        error: 0,
        missing: 0,
        corrected: 0,
        unchecked: 0,
        usablePct: 0,
        suspectPct: 0,
        errorPct: 0,
        missingPct: 0,
        correctedPct: 0,
        uncheckedPct: 0,
        goodCount: 0,
        goodRate: '0.00%',
        abnormalCount: 0,
        abnormalRate: '0.00%',
        completeRate: '0.00%'
      };
    }

    const total = list.length || 1280;

    let usable = 0;
    let suspect = 0;
    let error = 0;
    let missing = 0;
    let corrected = 0;
    let unchecked = 0;

    if (list.length > 0) {
      for (const st of list) {
        const stId = st.id || st.stationId || st.name;
        const prov = st.province || st.p || scope;
        const status = getStationQualityStatus(st, prov, scope, period, minute, element);
        if (status === 'usable') usable++;
        else if (status === 'corrected') corrected++;
        else if (status === 'suspect') suspect++;
        else if (status === 'error') error++;
        else if (status === 'unchecked') unchecked++;
        else missing++;
      }
    } else {
      // 容错模拟分箱
      const ratios = calculateRatios(scope, period, minute, element);
      usable = Math.round(total * ratios.usable);
      corrected = Math.round(total * ratios.corrected);
      suspect = Math.round(total * ratios.suspect);
      error = Math.round(total * ratios.error);
      missing = Math.round(total * ratios.missing);
      unchecked = total - (usable + corrected + suspect + error + missing);
    }

    // 防御性校验，确保各项之和严格等于总数
    const sum = usable + suspect + error + missing + corrected + unchecked;
    if (sum !== total) {
      missing += (total - sum);
    }

    const usablePct = Number((usable / total * 100).toFixed(2));
    const correctedPct = Number((corrected / total * 100).toFixed(2));
    const suspectPct = Number((suspect / total * 100).toFixed(2));
    const errorPct = Number((error / total * 100).toFixed(2));
    const missingPct = Number((missing / total * 100).toFixed(2));
    const uncheckedPct = Number((100.00 - usablePct - correctedPct - suspectPct - errorPct - missingPct).toFixed(2));

    const goodCount = usable + corrected;
    const goodRate = ((goodCount / total) * 100).toFixed(2) + '%';
    const abnormalCount = suspect + error;
    const abnormalRate = ((abnormalCount / total) * 100).toFixed(2) + '%';
    const completeRate = (((total - missing) / total) * 100).toFixed(2) + '%';

    return {
      all: total,
      usable,
      suspect,
      error,
      missing,
      corrected,
      unchecked,
      usablePct,
      suspectPct,
      errorPct,
      missingPct,
      correctedPct,
      uncheckedPct,
      goodCount,
      goodRate,
      abnormalCount,
      abnormalRate,
      completeRate
    };
  }

  /**
   * 计算指定省级单位或地市的六分类明细与正确率
   * @param {string} provinceName 省份名称
   * @param {number} totalDevices 装置总数
   * @returns {{ total: number, usable: number, suspect: number, error: number, missing: number, corrected: number, unchecked: number, correctRate: number }}
   */
  function getProvinceQuality(provinceName, totalDevices) {
    const total = Math.max(0, Number(totalDevices) || 0);
    const prov = (provinceName || '').split('-')[0];

    // 未接入数据的省份及其地市，所有指标均为 0
    if (!isProvinceConnected(prov)) {
      return {
        total,
        usable: 0,
        corrected: 0,
        suspect: 0,
        error: 0,
        missing: 0,
        unchecked: 0,
        correctRate: 0.00,
        connected: false
      };
    }

    const minute = typeof S !== 'undefined' ? (S.currentMinute ?? 1000) : 1000;
    const period = typeof S !== 'undefined' ? (S.period || '今日') : '今日';
    const element = typeof S !== 'undefined' ? (S.element || '综合') : '综合';
    const ratios = calculateRatios(provinceName, period, minute, element);

    let u = Math.round(total * ratios.usable);
    let cor = Math.round(total * ratios.corrected);
    let sus = Math.round(total * ratios.suspect);
    let err = Math.round(total * ratios.error);
    let mis = Math.round(total * ratios.missing);
    let unch = total - (u + cor + sus + err + mis);

    if (unch < 0) {
      mis = Math.max(0, mis + unch);
      unch = total - (u + cor + sus + err + mis);
    }

    // 正确率：以 (正确 + 订正) 或 正确 为考核基准
    const correctRate = Number(((u + cor) / total * 100).toFixed(2));

    return {
      total,
      usable: u,
      corrected: cor,
      suspect: sus,
      error: err,
      missing: mis,
      unchecked: unch,
      correctRate
    };
  }

  /**
   * 生成时间趋势图表序列数据（供 ECharts 数据质量趋势严格按 4 层堆叠输出）：
   * 1. 正确&订正 (usable + corrected)
   * 2. 可疑 (suspect)
   * 3. 错误 (error)
   * 4. 缺失/离线/未质控 (missing + unchecked)
   */
  function generateTrendSeries(scope = '全国', period = '今日', element = '综合') {
    const isSingleDay = ['当前', '今日'].includes(period);
    const N = isSingleDay ? 25 : (period === '近3日' ? 3 : 7);

    const labels = [];
    const usable = [];
    const sus = [];
    const err = [];
    const missingSeries = [];

    // 若当前省份未接入数据，趋势序列全量为 0
    if (scope !== '全国' && !isProvinceConnected(scope)) {
      for (let step = 0; step < N; step++) {
        let label;
        if (isSingleDay) {
          label = String(step).padStart(2, '0') + ':00';
        } else {
          const dayOffset = N - 1 - step;
          const d = new Date(Date.UTC(2026, 9, 23 - dayOffset));
          label = `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        }
        labels.push(label);
        usable.push(0);
        sus.push(0);
        err.push(0);
        missingSeries.push(0);
      }
      return { labels, usable, sus, err, missingSeries };
    }

    for (let step = 0; step < N; step++) {
      let label;
      let minuteVal;
      if (isSingleDay) {
        label = String(step).padStart(2, '0') + ':00';
        minuteVal = step * 60;
      } else {
        const dayOffset = N - 1 - step;
        const d = new Date(Date.UTC(2026, 9, 23 - dayOffset));
        label = `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        minuteVal = 1000;
      }
      labels.push(label);

      const r = calculateRatios(scope, period, minuteVal, element);
      // 1. 正确&订正
      const uPct = Number(((r.usable + r.corrected) * 100).toFixed(2));
      // 2. 可疑
      const sPct = Number((r.suspect * 100).toFixed(2));
      // 3. 错误
      const ePct = Number((r.error * 100).toFixed(2));
      // 4. 缺失/离线/未质控
      const mPct = Number((100.00 - uPct - sPct - ePct).toFixed(2));

      usable.push(uPct);
      sus.push(sPct);
      err.push(ePct);
      missingSeries.push(mPct);
    }

    return {
      labels,
      usable, // 正确&订正
      sus,    // 可疑
      err,    // 错误
      missingSeries // 缺失/离线/未质控
    };
  }

  return {
    STATUS_CONFIG,
    CONNECTED_PROVINCES,
    isProvinceConnected,
    calculateRatios,
    getStationQualityStatus,
    getQualityCounts,
    getProvinceQuality,
    generateTrendSeries
  };
})();
