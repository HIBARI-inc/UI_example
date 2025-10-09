// シンプルなハンバーガーメニューの開閉とフォーカス管理
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('nav-toggle');
  const drawer = document.getElementById('nav-drawer');
  const overlay = document.getElementById('nav-overlay');
  const menuJson = '/integration/menu.json';

  if (!toggle || !drawer) return;

  // メニューを外部JSONから構築
  const buildMenuFromJson = async () => {
    try {
      const resp = await fetch(menuJson, { cache: 'no-cache' });
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data || !Array.isArray(data.items)) return;

      const ul = document.createElement('ul');
      data.items.forEach((item) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.label;
        a.setAttribute('role', 'menuitem');
        li.appendChild(a);
        ul.appendChild(li);
      });

      // 既存のリストを置き換える（ある場合）
      const existing = drawer.querySelector('ul');
      if (existing) existing.replaceWith(ul);
      else drawer.appendChild(ul);

      // 閉じるボタン（右上の ×）を追加して、スクリーンリーダー向けにラベルを付与
      // 既に存在する場合は再作成しない
      if (!drawer.querySelector('.nav-close-button')) {
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'nav-close-button';
        closeBtn.setAttribute('aria-label', 'メニューを閉じる');
        closeBtn.innerHTML = '&times;';
        // 見た目は CSS 側で整える
        // ボタンはリストの直前に配置（右上に浮かせるスタイル想定）
        drawer.insertBefore(closeBtn, drawer.firstChild);
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeDrawer();
        });
      }
    } catch (err) {
      // フェールセーフ: 何もしない
      console.error('menu.json の読み込みに失敗しました', err);
    }
  };

  // フォーカストラップ: メニュー開時に Tab をメニュー内に閉じる
  const trapFocus = (container) => {
    const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(container.querySelectorAll(focusableSelector)).filter((el) => el.offsetParent !== null);
    if (focusable.length === 0) return () => {};

    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];

    const handleKey = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  };

  let removeTrap = null;

  const openDrawer = () => {
    drawer.classList.add('is-open');
    overlay && overlay.classList.add('is-active');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
    // 最初のフォーカス可能要素にフォーカス（遅延して DOM 反映を待つ）
    setTimeout(() => {
      const first = drawer.querySelector('a, button');
      first && first.focus();
      removeTrap = trapFocus(drawer);
    }, 50);
  };

  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    overlay && overlay.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
    document.body.classList.remove('nav-open');
    if (typeof removeTrap === 'function') removeTrap();
    removeTrap = null;
  };

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
  });

  overlay && overlay.addEventListener('click', closeDrawer);

  // ESC で閉じる
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  // 初期化: menu.json を読み込んでメニュー構築
  buildMenuFromJson();
});
