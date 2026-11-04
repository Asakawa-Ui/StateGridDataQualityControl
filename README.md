# 电力气象监测质控实验验证平台 (StateGridDataQualityControl)

本项目将原本约 3.2 MB 的单文件 `index.html` 拆分为职责清晰的模块化静态前端项目结构，同时完整保留全部业务交互、样式层叠顺序与内联事件绑定，支持直接双击打开或通过任意静态服务器预览。

## 目录结构

```text
StateGridDataQualityControl/
├── index.html                  # 应用主入口（按依赖与覆写顺序挂载样式与脚本）
├── README.md                   # 项目结构与运行说明
├── css/                        # 平台样式层（严格保持原有级联优先级）
│   ├── base.css                # 基础工作台、模态框与大屏基底样式
│   ├── layout.css              # 设计变量（Tokens）、地图容器与三分区栅格布局
│   ├── theme.css               # 深海玻璃质感、无障碍焦点/表单与青蓝全息 FUI 主题
│   ├── responsive.css          # 字体排版收束与视口自适应缩放（Viewport Scale）
│   ├── qc-workbench.css        # 业务流程二级导航与六模块质控工作台样式
│   ├── qc-overview.css         # 质控信息总览（体系流程、结果分布环、问题排行、热力矩阵）
│   ├── map-controls.css        # 地图悬浮筛选条、可收起图层面板与底栏状态
│   └── province-channel.css    # 紧凑顶栏、各省质量控制方式筛选栏与 27 省级目录样式
├── data/                       # 地理数据与业务标准常量
│   ├── prov-geo.js             # SVG 省份轮廓路径 (PROV_GEO) 与质心坐标 (PROV_CEN)
│   ├── province-geojson.js     # 全国省域 GeoJSON 多边形边界数据 (PROVINCE_GEOJSON)
│   ├── china-map-extent.js     # 中国地图外扩范围、国界线与遮罩数据 (CHINA_MAP_EXTENT)
│   └── qc-reference.js         # 气象质控参考标准（五类标识码、五类要素、八步检查、典型天气个例与算法目录）
├── js/                         # 业务与交互模块（按装饰器/覆写链路顺序加载）
│   ├── core.js                 # 图标库、核心样本数据、全局状态机 (S) 与基础工作台弹窗函数
│   ├── screen.js               # 大屏框架布局 (layout)、一级/二级导航与通用卡片构建器
│   ├── atlas.js                # MapLibre GL 瓦片底图、省域填色与全网站点分布图层 (tileView)
│   ├── refined-ui.js           # 精修指标卡、治理分布环、分级告警与重点站点列表组件
│   ├── a11y.js                 # 无障碍增强（ARIA 状态同步、键盘快捷键与弹窗焦点管理）
│   ├── holographic.js          # 全息 FUI 地图 HUD、动态光效开关与地图配色同步
│   ├── qc-province.js          # 各省质量控制方法模型、五类要素指标计算与省公司详情页
│   ├── qc-channel.js           # 27 个省级电网单位目录与原始通道缺测率监测
│   ├── qc-core.js              # 六大质控核心模块（质控结果、异常修正、质量评估、台账管理、实验验证）
│   ├── qc-overview.js          # 质控信息总览（五环流水线、五级标识分布环、高频问题与省份×要素热力图）
│   └── dashboard-charts.js     # ECharts 6 图表渲染（24h 合格率趋势、各省堆叠柱图、五维雷达、算法散点）与顶栏时钟
└── vendor/                     # 第三方运行时库与开源许可声明
    ├── maplibre-gl.css         # MapLibre GL JS v5.6.0 样式表
    ├── maplibre-gl.js          # MapLibre GL JS v5.6.0 引擎
    ├── echarts.min.js          # Apache ECharts v6.1.0 图表引擎
    └── THIRD-PARTY-NOTICES.txt # 第三方开源软件许可证声明
```

## 运行方式

1. **直接打开**：双击根目录下的 `index.html` 即可在支持 WebGL 的现代浏览器（Chrome / Edge / Firefox）中直接运行。
2. **本地静态服务（推荐）**：
   ```bash
   # 使用 Node.js (npx)
   npx serve .

   # 或使用 Python 3
   python -m http.server 8080
   ```
   随后在浏览器访问 `http://localhost:8080`。
