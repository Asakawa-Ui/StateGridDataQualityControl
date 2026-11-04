'use strict';

/**
 * ==========================================================
 * 全局自定义下拉选择组件 (Custom Select Component)
 * 美术风格严格对齐电力气象深色青蓝科技大屏
 * ==========================================================
 */

// 确保 .ds-custom-select 容器原生具备 .value 读写属性，完全平替原生 <select>
if (!('value' in HTMLDivElement.prototype)) {
  try {
    Object.defineProperty(HTMLDivElement.prototype, 'value', {
      configurable: true,
      get() {
        if (this.classList && this.classList.contains('ds-custom-select')) {
          return this.dataset.value;
        }
        return undefined;
      },
      set(v) {
        if (this.classList && this.classList.contains('ds-custom-select')) {
          this.dataset.value = v;
          const opt = this.querySelector(`.ds-cs-option[data-value="${v}"]`);
          if (opt) {
            const lbl = this.querySelector('.ds-cs-label');
            if (lbl) lbl.textContent = opt.querySelector('.ds-cs-opt-text')?.textContent || v;
            this.querySelectorAll('.ds-cs-option').forEach(o => {
              const isSel = o === opt;
              o.classList.toggle('selected', isSel);
              o.setAttribute('aria-selected', String(isSel));
            });
          }
        }
      }
    });
  } catch (e) {}
}

let dsCsSequence = 0;

/**
 * 渲染自定义下拉选择器 HTML
 * @param {Object} config
 * @param {string} [config.id] - 唯一标识符
 * @param {string|number} [config.value] - 当前选中的值
 * @param {Array<string|number|Object>} config.options - 选项列表，支持字符串数组或 [{value, label}]
 * @param {string} [config.onchange] - 触发的 JS 代码（如 "changeScope(this.value)" 或 "qcoSetModalFilter('period', this.value)"）
 * @param {string} [config.className] - 附加 CSS 类名（如 "atlas-scope-cs", "qco-filter-cs"）
 * @param {string} [config.ariaLabel] - 无障碍标签
 * @param {string} [config.placeholder] - 占位文本
 * @param {string|number} [config.width] - 宽度（如 "120px"）
 * @param {string|number} [config.maxHeight] - 菜单滚动区最大高度
 * @returns {string} HTML 字符串
 */
function dsRenderSelect(config) {
  const cfg = config || {};
  const id = cfg.id || ('ds-cs-' + (++dsCsSequence));
  const rawOpts = cfg.options || [];

  const options = rawOpts.map(opt => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: String(opt.value != null ? opt.value : opt.label),
        label: String(opt.label != null ? opt.label : opt.value)
      };
    }
    return { value: String(opt), label: String(opt) };
  });

  const curVal = cfg.value != null ? String(cfg.value) : (options[0]?.value ?? '');
  const activeOpt = options.find(o => o.value === curVal) || options[0] || { value: '', label: cfg.placeholder || '请选择' };
  const customClass = cfg.className ? (' ' + cfg.className) : '';
  const styleAttr = cfg.width ? ` style="width:${typeof cfg.width === 'number' ? cfg.width + 'px' : cfg.width};"` : '';
  const onchangeAttr = cfg.onchange ? ` data-onchange="${esc(cfg.onchange)}"` : '';
  const scrollStyle = cfg.maxHeight ? ` style="max-height:${typeof cfg.maxHeight === 'number' ? cfg.maxHeight + 'px' : cfg.maxHeight};"` : '';

  const downIcon = typeof icon === 'function' ? icon('down') : '<svg class="icon" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>';

  return `
    <div class="ds-custom-select${customClass}" id="${id}" data-value="${esc(activeOpt.value)}"${onchangeAttr}${styleAttr}>
      <button type="button" class="ds-cs-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(cfg.ariaLabel || activeOpt.label)}" onclick="dsToggleCustomSelect('${id}', event)">
        <span class="ds-cs-label">${esc(activeOpt.label)}</span>
        <span class="ds-cs-arrow" aria-hidden="true">${downIcon}</span>
      </button>
      <div class="ds-cs-menu" role="listbox" aria-label="${esc(cfg.ariaLabel || '选项列表')}">
        <div class="ds-cs-scroll"${scrollStyle}>
          ${options.map(opt => {
            const isSelected = opt.value === curVal;
            return `
              <div class="ds-cs-option ${isSelected ? 'selected' : ''}" role="option" aria-selected="${isSelected}" data-value="${esc(opt.value)}" onclick="dsSelectCustomOption('${id}', this.dataset.value, this.querySelector('.ds-cs-opt-text')?.textContent || this.dataset.value, event)">
                <span class="ds-cs-opt-text">${esc(opt.label)}</span>
                <span class="ds-cs-opt-indicator" aria-hidden="true"></span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * 切换下拉展开/收起
 */
function dsToggleCustomSelect(id, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const el = document.getElementById(id);
  if (!el) return;

  const wasOpen = el.classList.contains('is-open');

  // 先收起所有已打开的下拉
  dsCloseAllCustomSelects();

  if (!wasOpen) {
    // 智能防越界检测（视口高度不足时向上弹出）
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < 250 && spaceAbove > spaceBelow) {
      el.classList.add('pop-up');
    } else {
      el.classList.remove('pop-up');
    }

    el.classList.add('is-open');
    const trigger = el.querySelector('.ds-cs-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    // 自动将当前选中项滚入视区
    const selectedOpt = el.querySelector('.ds-cs-option.selected');
    if (selectedOpt) {
      setTimeout(() => {
        selectedOpt.scrollIntoView({ block: 'nearest' });
      }, 20);
    }
  }
}

/**
 * 选中某项选项
 */
function dsSelectCustomOption(id, value, label, event) {
  if (event) {
    event.stopPropagation();
  }
  const el = document.getElementById(id);
  if (!el) return;

  // 更新 trigger 文本与数据集
  const labelEl = el.querySelector('.ds-cs-label');
  if (labelEl) labelEl.textContent = label;

  el.dataset.value = value;
  // 确保 this.value 属性访问与 this.dataset.value 一致
  el.value = value;

  // 更新各选项状态
  el.querySelectorAll('.ds-cs-option').forEach(opt => {
    const isSel = opt.dataset.value === String(value);
    opt.classList.toggle('selected', isSel);
    opt.setAttribute('aria-selected', String(isSel));
  });

  // 收起菜单
  dsCloseCustomSelect(el);

  // 触发 onchange 逻辑
  const onchangeCode = el.dataset.onchange;
  if (onchangeCode) {
    try {
      const fn = new Function('event', onchangeCode);
      fn.call(el, event);
    } catch (err) {
      console.error('dsSelectCustomOption onchange error:', err);
    }
  }

  // 触发标准 DOM 自定义 change 事件
  el.dispatchEvent(new CustomEvent('change', {
    detail: { value, label },
    bubbles: true
  }));
}

/**
 * 关闭单个下拉
 */
function dsCloseCustomSelect(el) {
  if (!el) return;
  el.classList.remove('is-open');
  const trigger = el.querySelector('.ds-cs-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

/**
 * 关闭页面所有已打开的自定义下拉
 */
function dsCloseAllCustomSelects() {
  document.querySelectorAll('.ds-custom-select.is-open').forEach(el => {
    dsCloseCustomSelect(el);
  });
}

// 全局监听：点击外部自动收起
document.addEventListener('click', e => {
  if (!e.target.closest('.ds-custom-select')) {
    dsCloseAllCustomSelects();
  }
});

// 全局监听：按 ESC 自动收起
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    dsCloseAllCustomSelects();
  }
});

/**
 * 将原生 select 转换为自定义下拉（针对表单等场景的渐进增强）
 */
function dsEnhanceNativeSelect(nativeEl) {
  if (!nativeEl || nativeEl.dataset.dsEnhanced === 'true') return;

  const id = nativeEl.id || ('ds-enh-' + (++dsCsSequence));
  const options = Array.from(nativeEl.options).map(opt => ({
    value: opt.value,
    label: opt.textContent.trim()
  }));
  const curVal = nativeEl.value;
  const ariaLabel = nativeEl.getAttribute('aria-label') || '';
  const className = nativeEl.className || '';

  const wrapper = document.createElement('div');
  wrapper.innerHTML = dsRenderSelect({
    id: id + '-cs',
    value: curVal,
    options,
    className: className,
    ariaLabel: ariaLabel,
    onchange: `
      const n = document.getElementById('${id}');
      if (n) {
        n.value = this.dataset.value;
        n.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `
  });

  const customEl = wrapper.firstElementChild;
  nativeEl.id = id;
  nativeEl.dataset.dsEnhanced = 'true';
  nativeEl.style.display = 'none';
  nativeEl.parentNode.insertBefore(customEl, nativeEl.nextSibling);

  // 监听原生 select 外部程序赋值更新
  nativeEl.addEventListener('change', () => {
    const newVal = nativeEl.value;
    const optObj = options.find(o => o.value === newVal);
    if (optObj && customEl) {
      customEl.dataset.value = newVal;
      customEl.value = newVal;
      const lbl = customEl.querySelector('.ds-cs-label');
      if (lbl) lbl.textContent = optObj.label;
      customEl.querySelectorAll('.ds-cs-option').forEach(opt => {
        const isSel = opt.dataset.value === String(newVal);
        opt.classList.toggle('selected', isSel);
        opt.setAttribute('aria-selected', String(isSel));
      });
    }
  });
}

/**
 * 自动增强指定容器内的所有原生 select
 */
function dsEnhanceAllSelects(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const selects = root.querySelectorAll('select:not([data-ds-enhanced="true"])');
  selects.forEach(s => dsEnhanceNativeSelect(s));
}

// 自动监听与增强页面及弹窗中动态载入的原生 select
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => dsEnhanceAllSelects());
  } else {
    dsEnhanceAllSelects();
  }

  if (typeof MutationObserver !== 'undefined') {
    const dsSelectObserver = new MutationObserver((mutations) => {
      let hasSelect = false;
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              if (node.tagName === 'SELECT' || node.querySelector?.('select:not([data-ds-enhanced="true"])')) {
                hasSelect = true;
                break;
              }
            }
          }
        }
        if (hasSelect) break;
      }
      if (hasSelect) {
        dsEnhanceAllSelects();
      }
    });

    const targetBody = document.body || document.documentElement;
    if (targetBody) {
      dsSelectObserver.observe(targetBody, { childList: true, subtree: true });
    }
  }
}
