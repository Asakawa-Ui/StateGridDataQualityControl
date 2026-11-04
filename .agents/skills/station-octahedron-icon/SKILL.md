---
name: station-octahedron-icon
description: >-
  气象装置与气象站点八面体状态图标处理规范。涵盖 RGBA 透明背景 WebP 多尺寸档位（256px、128px、64px）、六大质控状态映射规则（normal/suspicious/error/missing_offline/corrected/unchecked）以及 MapLibre/Mapbox WebGL 地图晶体悬浮光环渲染注意事项。
---

# Skill: 气象装置/气象站点八面体状态图标处理规范

## 1. 资产基本信息与存放路径

- **资产物理路径（Windows 环境）**：
  `E:\demo\StateGridDataQualityControl\src\assets\images\station_icon\`
- **相对工程路径**：
  `src/assets/images/station_icon/`
- **格式**：RGBA 透明背景 WebP (`.webp`)
- **比例特征**：细长八面体晶体主体 + 底部/周身悬浮光环
- **尺寸档位（宽度 px，保持等比细长高度）**：
  - `256px`：高清特写档（弹窗详情、大幅站点卡片、高分屏特写）
  - `128px`：标准渲染档（中高缩放级别地图标记、站点概览面板）
  - `64px`：密集聚合档（全网宏观大屏、小缩放级别海量站点渲染）

### 标准文件命名规范
```text
src/assets/images/station_icon/
├── station_normal_256.webp
├── station_normal_128.webp
├── station_normal_64.webp
├── station_suspicious_256.webp
├── station_suspicious_128.webp
├── station_suspicious_64.webp
├── station_error_256.webp
├── station_error_128.webp
├── station_error_64.webp
├── station_missing_offline_256.webp
├── station_missing_offline_128.webp
├── station_missing_offline_64.webp
├── station_corrected_256.webp
├── station_corrected_128.webp
├── station_corrected_64.webp
├── station_unchecked_256.webp
├── station_unchecked_128.webp
└── station_unchecked_64.webp
```

---

## 2. 状态映射规则 (Status Mapping)

当编写涉及气象站点、装置状态及质控结果的代码时，必须严格执行以下映射规则：

| 状态代码 (Key) | 业务含义 | 视觉色系 | 代表色值 (Hex) | 符号语义 |
| :--- | :--- | :--- | :--- | :--- |
| `normal` | 正常 | 绿色 | `#1fc79a` | 观测正常且质控合格 |
| `suspicious` | 可疑 | 橙黄色 | `#f0ad4e` | 触发阈值或空间协同疑似异常 |
| `error` | 错误 | 红色 | `#ee5a52` | 超限或确认错误数据 |
| `missing_offline` | 缺失/离线 | 蓝色 | `#6f93ba` | 缺测或通信链路离线 |
| `corrected` | 订正 | 青色 | `#36b3d9` | 已执行算法或人工业务订正 |
| `unchecked` | 未质控 | 浅青绿色 | `#78c5c4` | 原始接入待流转质控检查 |

### 质控微数据库 (QcDatabase) 状态双向映射转换器
```javascript
// 与平台质控库六分类状态双向兼容转换
const OCTAHEDRON_STATUS_MAP = {
  // 平台质控原始状态 -> 八面体图标规范状态
  fromQc: {
    usable: 'normal',
    normal: 'normal',
    suspect: 'suspicious',
    suspicious: 'suspicious',
    error: 'error',
    missing: 'missing_offline',
    offline: 'missing_offline',
    missing_offline: 'missing_offline',
    corrected: 'corrected',
    unchecked: 'unchecked'
  },
  // 八面体规范状态 -> 平台质控原始状态
  toQc: {
    normal: 'usable',
    suspicious: 'suspect',
    error: 'error',
    missing_offline: 'missing',
    corrected: 'corrected',
    unchecked: 'unchecked'
  }
};

/**
 * 获取标准八面体图标状态代码
 * @param {string} rawStatus - 原始状态字符串
 * @returns {string} 标准规范状态代码
 */
function getOctahedronStatus(rawStatus) {
  return OCTAHEDRON_STATUS_MAP.fromQc[rawStatus] || 'normal';
}

/**
 * 获取对应尺寸的标准 WebP 图标路径
 * @param {string} status - 状态代码
 * @param {number|string} [size=128] - 尺寸档位 (256, 128, 64)
 * @returns {string} 图标资源相对 URL
 */
function getOctahedronIconUrl(status, size = 128) {
  const s = getOctahedronStatus(status);
  const targetSize = [256, 128, 64].includes(Number(size)) ? size : 128;
  return `./src/assets/images/station_icon/station_${s}_${targetSize}.webp`;
}
```

---

## 3. 渲染注意事项 (Rendering & Shading)

### 3.1 晶体与悬浮光环视网膜适配
- 源图主体为**晶体八面体**，周身与底部具有**悬浮光环**，边缘带有半透明柔光。
- **避免边缘抗锯齿模糊**：在 WebGL（MapLibre / Mapbox）中注册图片时，应显式指定设备像素比：
  ```javascript
  map.loadImage(getOctahedronIconUrl('normal', 128), (error, image) => {
    if (error) throw error;
    if (!map.hasImage('station-normal')) {
      // 传入 pixelRatio: 2 可确保柔光与晶体在高分屏上锐利清透
      map.addImage('station-normal', image, { pixelRatio: 2 });
    }
  });
  ```

### 3.2 动态缩放曲线配置 (MapLibre Symbol Layer)
由于图标包含光环柔光，在小比例尺下若缩放过小会导致柔光叠加糊化，因此地图层级需要平滑插值：
```javascript
const stationOctahedronLayer = {
  id: 'station-octahedron-points',
  type: 'symbol',
  source: 'stations-source',
  layout: {
    'icon-image': ['concat', 'station-', ['get', 'octahedron_status']],
    'icon-allow-overlap': true,
    'icon-ignore-placement': true,
    'icon-anchor': 'bottom', // 锚点定在悬浮光环正下方
    'icon-size': [
      'interpolate',
      ['linear'],
      ['zoom'],
      3, 0.28,   // 全国宏观视图：紧凑微型晶体
      6, 0.45,   // 省级视图：标准尺寸晶体
      10, 0.75,  // 地市视图：舒展晶体与柔光
      14, 1.00   // 站址级视图：1:1 满比例展示
    ]
  }
};
```

### 3.3 DOM 标记回退渲染 (CSS Marker)
当采用 DOM Marker 渲染时，采用 `object-fit: contain` 并加入微交互动画：
```css
.station-octahedron-marker {
  width: 32px;
  height: 48px;
  display: block;
  object-fit: contain;
  pointer-events: auto;
  cursor: pointer;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.45));
  transition: transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), filter 0.2s ease;
}
.station-octahedron-marker:hover {
  transform: translateY(-4px) scale(1.15);
  filter: drop-shadow(0 8px 16px rgba(92, 226, 200, 0.5));
}
```
