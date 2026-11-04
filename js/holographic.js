'use strict';

// 地图全息科技 FUI 美术装饰图层（高精经纬网格、中国轮廓发光外晕与科幻HUD标尺）
let holographicMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
try { if (localStorage.getItem('meteo-holographic-motion') === 'off') holographicMotion = false; } catch {}

function holographicMapHud() {
  return '';
}

function decorateHolographicScreen() {
  document.querySelectorAll('.holo-map-hud').forEach(el => el.remove());
}

function applyHolographicAtlas() {
  const map = typeof tileView !== 'undefined' ? tileView.map : null;
  if (!map || !tileView.loaded) return;

  // 1. 发光与轮廓强化
  try {
    if (map.getLayer('china-only-mask')) map.setPaintProperty('china-only-mask', 'fill-color', '#061425');
    if (map.getLayer('base-background')) map.setPaintProperty('base-background', 'background-color', '#061425');
    if (map.getLayer('raster-tiles')) map.setPaintProperty('raster-tiles', 'raster-opacity', .55);
    if (map.getLayer('province-border')) {
      map.setPaintProperty('province-border', 'line-color', '#8fe2f1');
      map.setPaintProperty('province-border', 'line-opacity', .7);
    }
    if (map.getLayer('province-glow')) {
      map.setPaintProperty('province-glow', 'line-color', '#54d9fa');
      map.setPaintProperty('province-glow', 'line-opacity', .25);
    }
    if (map.getLayer('china-outline-glow')) {
      map.setPaintProperty('china-outline-glow', 'line-color', '#43cffa');
      map.setPaintProperty('china-outline-glow', 'line-width', 8);
      map.setPaintProperty('china-outline-glow', 'line-blur', 5);
      map.setPaintProperty('china-outline-glow', 'line-opacity', .44);
    }
  } catch(e) {}

  // 2. 中国立体轮廓
  if (!map.getLayer('country-depth-shadow') && map.getSource('china-outline')) {
    map.addLayer({id: 'country-depth-shadow', type: 'line', source: 'china-outline', paint: {'line-color': '#010815', 'line-width': 12, 'line-translate': [0, 9], 'line-translate-anchor': 'viewport', 'line-blur': 3, 'line-opacity': .9}}, 'province-color');
    map.addLayer({id: 'country-depth-edge', type: 'line', source: 'china-outline', paint: {'line-color': '#167197', 'line-width': 5, 'line-translate': [0, 5], 'line-translate-anchor': 'viewport', 'line-opacity': .8}}, 'province-color');
    map.addLayer({id: 'country-luminous-rim', type: 'line', source: 'china-outline', paint: {'line-color': '#a5f6ff', 'line-width': 1.25, 'line-opacity': .82}}, 'station-halos');
  }
}

if (typeof createAtlasLayers === 'function') {
  const holographicCreateLayers = createAtlasLayers;
  createAtlasLayers = function () {
    holographicCreateLayers();
    applyHolographicAtlas();
  };
}

if (typeof render === 'function') {
  const holographicRender = render;
  render = function () {
    holographicRender();
    decorateHolographicScreen();
  };
}

applyHolographicAtlas();
decorateHolographicScreen();
