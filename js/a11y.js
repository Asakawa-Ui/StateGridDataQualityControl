'use strict';

// 与视觉选中态同步的语义状态及键盘焦点管理。
function enhanceInterface() {
  const selectedGroups = '.ds-map-mode button,.atlas-state-filter button,.ds-inline-segments button,.ds-filter-stage,.ds-filter,.ds-report-item,.ds-scope-chip,.qcc-segments button,.qcc-methods button,.qcc-map-flags button,.atlas-map-period button';
  document.querySelectorAll(selectedGroups).forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active') || button.classList.contains('selected')));
  });
  document.querySelectorAll('button[aria-label]').forEach(button => {
    if (!button.title) button.title = button.getAttribute('aria-label');
  });
  document.querySelectorAll('button .icon,.card-symbol .icon').forEach(svg => svg.setAttribute('aria-hidden', 'true'));
  document.querySelectorAll('#action-note').forEach(input => {
    input.setAttribute('aria-describedby', 'form-error');
    input.setAttribute('minlength', '5');
  });
  updateMapControls();
}

function updateMapControls() {
  const map = tileView.map;
  if (!map || !tileView.loaded) return;
  const zoom = map.getZoom();
  const plus = document.querySelector('[aria-label="放大地图"]');
  const minus = document.querySelector('[aria-label="缩小地图"]');
  if (plus) plus.disabled = zoom >= map.getMaxZoom() - .02;
  if (minus) minus.disabled = zoom <= map.getMinZoom() + .02;
}

const interfaceRender = render;
render = function () {
  const active = document.activeElement;
  const group = ['.ds-subnav', '.ds-primary', '.ds-map-mode', '.atlas-state-filter', '.ds-inline-segments', '.ds-network-overview', '.qcc-segments', '.qcc-methods', '.qcc-map-flags', '.atlas-map-period'].find(selector => active?.closest?.(selector));
  const action = group && active?.getAttribute('onclick');
  const selectLabel = active?.matches?.('select.ds-select') ? active.getAttribute('aria-label') : null;
  const searchLabel = active?.matches?.('input.qcc-input') ? active.getAttribute('aria-label') : null;
  interfaceRender();
  enhanceInterface();
  if (document.querySelector('.modal')) return;
  let target;
  if (action) target = [...document.querySelectorAll(group + ' button')].find(button => button.getAttribute('onclick') === action);
  if (selectLabel) target = [...document.querySelectorAll('select.ds-select')].find(select => select.getAttribute('aria-label') === selectLabel);
  if (searchLabel) target = [...document.querySelectorAll('input.qcc-input')].find(input => input.getAttribute('aria-label') === searchLabel);
  target?.focus({preventScroll: true});
};

const interfaceCloseModal = window.closeModal || (typeof closeModal === 'function' ? closeModal : () => {});
window.closeModal = function () {
  const wasOpen = !!document.querySelector('.modal');
  document.getElementById('app').inert = false;
  if (!wasOpen) { S.detail = null; return; }
  interfaceCloseModal();
  if (wasOpen && document.activeElement === document.body) document.querySelector('.ds-subnav [aria-current]')?.focus({preventScroll: true});
};

const interfaceAdvanceEvent = advanceEvent;
advanceEvent = function (id) {
  interfaceAdvanceEvent(id);
  const error = document.getElementById('form-error');
  const message = error?.textContent.trim();
  if (!message) return;
  const input = document.getElementById(message.includes('期限') ? 'due-date' : 'action-note');
  input?.setAttribute('aria-invalid', 'true');
  input?.setAttribute('aria-describedby', 'form-error');
  input?.focus();
};

document.getElementById('overlay').addEventListener('input', event => {
  const input = event.target;
  if (!input.matches('input,select,textarea')) return;
  input.removeAttribute('aria-invalid');
  if (input.id === 'action-note' && input.value.trim().length >= 5) {
    const error = document.getElementById('form-error');
    if (error?.textContent.includes('处理依据')) error.textContent = '';
  }
  if (input.id === 'due-date') {
    const error = document.getElementById('form-error');
    if (error?.textContent.includes('期限')) error.textContent = '';
  }
});

new MutationObserver(() => {
  const modal = document.querySelector('.modal');
  document.getElementById('app').inert = !!modal;
  if (modal) enhanceInterface();
}).observe(document.getElementById('overlay'), {childList: true, subtree: true});

enhanceInterface();
