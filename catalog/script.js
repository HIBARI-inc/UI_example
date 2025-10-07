const defaultQuestions = (name) => [
  `${name}の概要と主要な仕様を教えてください。`,
  `${name}を導入する際の注意点や必要な周辺機器はありますか？`,
  `${name}の活用事例やおすすめの運用方法を知りたいです。`
];

let currentFolderKey = null;
let catalogIndex = new Map();
let catalogLoaded = false;

const categoryImageMap = {
  supply: 'assets/supply.svg',
  measurement: 'assets/measurement.svg',
  transport: 'assets/transport.svg',
  storage: 'assets/storage.svg',
  disposal: 'assets/disposal.svg',
  extraction: 'assets/extraction.svg',
  equipment: 'assets/equipment.svg',
  plant: 'assets/plant.svg',
  maintenance: 'assets/maintenance.svg'
};

const categoryButtons = document.querySelectorAll('.category');
const itemsContainer = document.getElementById('catalog-items');
const titleElement = document.getElementById('catalog-list-title');
const descriptionElement = document.getElementById('catalog-list-description');

const placeholder = document.getElementById('insight-placeholder');
const content = document.getElementById('insight-content');
const imageElement = document.getElementById('insight-image');
const captionElement = document.getElementById('insight-caption');
const titleDetail = document.getElementById('insight-title');
const summaryDetail = document.getElementById('insight-summary');
const metaDetail = document.getElementById('insight-meta');
const suggestionsContainer = document.getElementById('insight-suggestions');

function normalizeMeta(value) {
  if (typeof value !== 'string') {
    return value || '';
  }
  return value.replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeSvgText(text = '') {
  return text.replace(/[&<>'"]/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case '\'':
        return '&#39;';
      default:
        return char;
    }
  });
}

function createImageData({ label = 'Catalog Preview' } = {}) {
  const safeLabel = escapeSvgText(label);
  const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3f72ff"/><stop offset="100%" stop-color="#a855f7"/></linearGradient></defs><rect width="480" height="320" rx="36" fill="url(#bg)"/><g fill="rgba(255,255,255,0.4)"><rect x="64" y="96" width="160" height="128" rx="22"/><rect x="252" y="108" width="168" height="20" rx="10"/><rect x="252" y="142" width="144" height="20" rx="10"/><rect x="252" y="176" width="188" height="20" rx="10"/></g><text x="64" y="254" font-family="'Hiragino Sans','Noto Sans JP',sans-serif" font-weight="700" font-size="48" fill="#ffffff">${safeLabel}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function clearSuggestions() {
  suggestionsContainer.innerHTML = '';
  suggestionsContainer.classList.add('is-hidden');
}

function showPlaceholder() {
  placeholder.classList.remove('is-hidden');
  content.classList.add('is-hidden');
  clearSuggestions();
}

function setActiveCategory(activeButton) {
  categoryButtons.forEach((button) => {
    button.classList.toggle('is-active', button === activeButton);
  });
}

function setActiveItem(index) {
  const itemButtons = itemsContainer.querySelectorAll('.catalog-item');
  itemButtons.forEach((btn) => {
    const btnIndex = Number(btn.dataset.index);
    btn.classList.toggle('is-active', btnIndex === index);
  });
}

function getFolder(folderKey) {
  return catalogIndex.get(folderKey);
}

function renderSuggestions(file, folderKey) {
  const suggestions = Array.isArray(file.questions) && file.questions.length
    ? file.questions
    : defaultQuestions(file.name || folderKey);

  clearSuggestions();

  if (!suggestions.length) {
    return;
  }

  suggestions.forEach((question) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = question;
    button.addEventListener('click', () => {
      suggestionsContainer.querySelectorAll('button').forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');
      window.dispatchEvent(new CustomEvent('catalog-question-select', {
        detail: {
          question,
          folder: folderKey,
          title: file.name
        }
      }));
    });
    suggestionsContainer.appendChild(button);
  });

  suggestionsContainer.classList.remove('is-hidden');
}

function renderDetail(folderKey, index) {
  const folder = getFolder(folderKey);
  const file = folder?.files?.[index];

  if (!file) {
    showPlaceholder();
    return;
  }

  placeholder.classList.add('is-hidden');
  content.classList.remove('is-hidden');

  const imageSrc = file.image?.src
    || folder?.image
    || categoryImageMap[folderKey]
    || createImageData({ label: file.name });
  const normalizedMeta = normalizeMeta(file.meta);

  imageElement.src = imageSrc;
  imageElement.alt = `${file.name}の参照イメージ`;
  captionElement.textContent = file.image?.caption || normalizedMeta || '';

  titleDetail.textContent = file.name;
  summaryDetail.textContent = file.summary || '';

  metaDetail.innerHTML = '';

  if (file.meta) {
    const metaText = document.createElement('span');
    metaText.textContent = normalizedMeta;
    metaDetail.appendChild(metaText);
  }

  if (file.file) {
    const link = document.createElement('a');
    link.href = file.file;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '資料を開く';
    metaDetail.appendChild(link);
  }

  renderSuggestions(file, folderKey);
}

function renderItems(folderKey) {
  const folder = getFolder(folderKey);
  currentFolderKey = folderKey;

  if (!folder) {
    titleElement.textContent = '資料カテゴリーが見つかりません';
    descriptionElement.textContent = '資料リストが正しく読み込まれていない可能性があります。';
    itemsContainer.innerHTML = '';
    showPlaceholder();
    return;
  }

  titleElement.textContent = folder.title || '';
  descriptionElement.textContent = folder.description || '';

  itemsContainer.innerHTML = '';

  const files = Array.isArray(folder.files) ? folder.files : [];

  if (!files.length) {
    const empty = document.createElement('li');
    empty.className = 'catalog-items__empty';
    empty.textContent = '資料が登録されていません。';
    itemsContainer.appendChild(empty);
    showPlaceholder();
    return;
  }

  files.forEach((file, index) => {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'catalog-item';
    button.dataset.index = String(index);
    button.dataset.file = file.file || '';
    button.textContent = file.name;
    if (file.meta) {
      button.title = normalizeMeta(file.meta);
    }

    button.addEventListener('click', () => {
      setActiveItem(index);
      renderDetail(folderKey, index);
    });

    button.addEventListener('focus', () => setActiveItem(index));

    listItem.appendChild(button);
    itemsContainer.appendChild(listItem);
  });

  setActiveItem(0);
  renderDetail(folderKey, 0);
}

function showLoadError(message) {
  titleElement.textContent = '資料を読み込めませんでした';
  descriptionElement.textContent = message;
  itemsContainer.innerHTML = '';
  showPlaceholder();
}

function toggleCategoryButtons(disabled) {
  categoryButtons.forEach((button) => {
    button.disabled = disabled;
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  });
}

function setCatalogData(rawData) {
  catalogIndex = new Map();

  if (!rawData || !Array.isArray(rawData.categories)) {
    return;
  }

  rawData.categories.forEach((category) => {
    if (!category?.id) {
      return;
    }

    const files = Array.isArray(category.files)
      ? category.files.map((file) => ({ ...file }))
      : [];

    catalogIndex.set(category.id, {
      ...category,
      files
    });
  });
}

async function initializeCatalog() {
  toggleCategoryButtons(true);
  titleElement.textContent = '資料を読み込み中...';
  descriptionElement.textContent = 'しばらくお待ちください。';
  showPlaceholder();

  try {
    const response = await fetch('docs/catalog.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch catalog.json: ${response.status}`);
    }

    const data = await response.json();
    setCatalogData(data);

    if (!catalogIndex.size) {
      throw new Error('No catalog categories were loaded.');
    }

    catalogLoaded = true;
    toggleCategoryButtons(false);

    const firstAvailableButton = Array.from(categoryButtons).find((button) => {
      const key = button.dataset.folder;
      return key && catalogIndex.has(key);
    });

    if (firstAvailableButton) {
      setActiveCategory(firstAvailableButton);
      renderItems(firstAvailableButton.dataset.folder);
    } else {
      showLoadError('利用可能なカテゴリーが見つかりませんでした。');
    }
  } catch (error) {
    console.error('[catalog] load failed', error);
    catalogLoaded = false;
    toggleCategoryButtons(false);
    showLoadError('資料リストの取得に失敗しました。リロードして再試行してください。');
  }
}

categoryButtons.forEach((button) => {
  const folderKey = button.dataset.folder;
  if (!folderKey) {
    return;
  }

  const activate = () => {
    if (!catalogLoaded) {
      return;
    }

    setActiveCategory(button);
    renderItems(folderKey);
  };

  button.addEventListener('mouseenter', activate);
  button.addEventListener('focus', activate);
  button.addEventListener('click', activate);
});

initializeCatalog();
