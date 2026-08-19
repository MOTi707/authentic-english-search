// 1. 多语言适配
const isChinese = navigator.language.toLowerCase().includes('zh');
const i18n = {
    title: isChinese ? "一键指定站点" : "Quick Site Search",
    showMore: isChinese ? "显示更多 »" : "Show More »",
    showLess: isChinese ? "收起 «" : "Show Less «"
};

// 2. 站点数据
const defaultPrimarySites = [
    { name: "The Economist", domain: "economist.com" },
    { name: "BBC", domain: "bbc.com" },
    { name: "Washington Post", domain: "washingtonpost.com" },
    { name: "Sixth Tone", domain: "sixthtone.com" },
    { name: "SCMP", domain: "scmp.com" }
];

const defaultSecondarySites = [
    { name: "Vox", domain: "vox.com" },
    { name: "The New York Times", domain: "nytimes.com" },
    { name: "Reuters", domain: "reuters.com" },
    { name: "ABC News", domain: "abcnews.go.com" },
    { name: "The Atlantic", domain: "theatlantic.com" },
    { name: "Wired", domain: "wired.com" },
    { name: "Smithsonian Magazine", domain: "smithsonianmag.com" },
    { name: "Slate", domain: "slate.com" }
];

let primarySites = [...defaultPrimarySites];
let secondarySites = [...defaultSecondarySites];
let customSites = [];

// 2.5 站点排序持久化（chrome.storage.sync）
let dragSrcDomain = null;
let dragSrcContainer = null;
let panelExpanded = true;
let keywordJumpEnabled = true;
let modernYear = 2020;
let quickSearchSlots = [[], [], []]; // 每个 slot 为 { name, domain } 数组（支持多选组合搜索）
let quickButtonModes = ['', '', '']; // 每个快捷按钮的搜索模式：'' 普通 / 'title' 标题 / 'modern' 现代 / 'both' 标题+现代

async function loadPanelState() {
    try {
        const result = await chrome.storage.local.get('panelExpanded');
        if (typeof result.panelExpanded === 'boolean') {
            panelExpanded = result.panelExpanded;
        }
    } catch (e) {}
}

function savePanelState() {
    try {
        chrome.storage.local.set({ panelExpanded: panelExpanded });
    } catch (e) {}
}

async function loadKeywordJumpSetting() {
    try {
        const result = await chrome.storage.local.get('keywordJumpEnabled');
        if (typeof result.keywordJumpEnabled === 'boolean') {
            keywordJumpEnabled = result.keywordJumpEnabled;
        }
    } catch (e) {}
}

function saveKeywordJumpSetting() {
    try {
        chrome.storage.local.set({ keywordJumpEnabled: keywordJumpEnabled });
    } catch (e) {}
}

async function loadModernYearSetting() {
    try {
        const result = await chrome.storage.local.get('modernYear');
        const y = parseInt(result.modernYear, 10);
        const thisYear = new Date().getFullYear();
        if (y && y >= 1990 && y <= thisYear) {
            modernYear = y;
        }
    } catch (e) {}
}

function saveModernYearSetting() {
    try {
        chrome.storage.local.set({ modernYear: modernYear });
    } catch (e) {}
}

function getAllSites() {
    return [...primarySites, ...secondarySites, ...customSites];
}

async function loadQuickSearchSlots() {
    try {
        const result = await chrome.storage.local.get(['quickSearchSlots', 'quickButtonModes']);
        const stored = result.quickSearchSlots;
        if (Array.isArray(stored) && stored.length === 3) {
            // 兼容旧格式（旧版为单个站点对象或 null）
            quickSearchSlots = stored.map(slot => {
                if (Array.isArray(slot)) return slot;
                if (slot && slot.domain) return [{ name: slot.name, domain: slot.domain }];
                return [];
            });
        }
        if (Array.isArray(result.quickButtonModes) && result.quickButtonModes.length === 3) {
            quickButtonModes = result.quickButtonModes.map(m => ['', 'title', 'modern', 'both'].includes(m) ? m : '');
        }
    } catch (e) {}
}

function saveQuickSearchSlots() {
    try {
        chrome.storage.local.set({
            quickSearchSlots: quickSearchSlots,
            quickButtonModes: quickButtonModes
        });
    } catch (e) {}
}

async function loadCustomSites() {
    try {
        const result = await chrome.storage.sync.get('customSites');
        if (result.customSites && Array.isArray(result.customSites)) {
            customSites = result.customSites;
        }
    } catch (e) {}
}

function saveCustomSites() {
    try {
        chrome.storage.sync.set({ customSites: customSites });
    } catch (e) {}
}

function addCustomSite(name, domain) {
    const cleanedDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!name.trim() || !cleanedDomain) return false;
    // 检查是否已存在
    const allSites = [...primarySites, ...secondarySites, ...customSites];
    if (allSites.some(s => s.domain === cleanedDomain)) return false;
    customSites.push({ name: name.trim(), domain: cleanedDomain });
    saveCustomSites();
    return true;
}

function removeCustomSite(domain) {
    const idx = customSites.findIndex(s => s.domain === domain);
    if (idx !== -1) {
        customSites.splice(idx, 1);
        saveCustomSites();
    }
    // 若快捷搜索槽引用了该域名，同步清空
    let quickChanged = false;
    quickSearchSlots.forEach((slot, i) => {
        const idx = slot.findIndex(s => s.domain === domain);
        if (idx !== -1) {
            quickSearchSlots[i].splice(idx, 1);
            quickChanged = true;
        }
    });
    if (quickChanged) saveQuickSearchSlots();
}

async function loadSiteOrder() {
    try {
        const result = await chrome.storage.sync.get(['primarySitesOrder', 'secondarySitesOrder']);
        if (result.primarySitesOrder && Array.isArray(result.primarySitesOrder)) {
            const orderMap = {};
            result.primarySitesOrder.forEach((domain, i) => orderMap[domain] = i);
            primarySites.sort((a, b) => (orderMap[a.domain] ?? 999) - (orderMap[b.domain] ?? 999));
        }
        if (result.secondarySitesOrder && Array.isArray(result.secondarySitesOrder)) {
            const orderMap = {};
            result.secondarySitesOrder.forEach((domain, i) => orderMap[domain] = i);
            secondarySites.sort((a, b) => (orderMap[a.domain] ?? 999) - (orderMap[b.domain] ?? 999));
        }
    } catch (e) {}
}

function saveSiteOrder() {
    try {
        chrome.storage.sync.set({
            primarySitesOrder: primarySites.map(s => s.domain),
            secondarySitesOrder: secondarySites.map(s => s.domain)
        });
    } catch (e) {}
}

// 3. 核心功能：带 Base64 本地缓存的图标加载
async function loadIconWithCache(domain, imgElement) {
    const cacheKey = `site_icon_${domain}`;
    // 优先使用 chrome.storage.local 读取缓存
    try {
        const cached = await chrome.storage.local.get(cacheKey);
        if (cached[cacheKey]) {
            imgElement.src = cached[cacheKey];
            return;
        }
    } catch (e) {}
    const defaultUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
    imgElement.src = defaultUrl;
    try {
        const response = await fetch(defaultUrl);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result;
            try { chrome.storage.local.set({ [cacheKey]: base64data }); } catch (e) {}
        };
        reader.readAsDataURL(blob);
    } catch (error) {}
}

// 4. 状态检测逻辑
function getTimeFilterTbs() {
    return `cdr:1,cd_min:1/1/${modernYear}`;
}

function isTimeFilterActive() {
    const urlParams = new URLSearchParams(window.location.search);
    const host = window.location.host;
    if (host.includes('google')) return urlParams.get('tbs') === getTimeFilterTbs();
    return false;
}

// 读取当前 URL 中已激活的 site: 域名（与"现代"按钮同色高亮选中站点用）
function getActiveSiteDomain() {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';
    const m = q.match(/site:([^\s"]+)/i);
    return m ? m[1].toLowerCase() : null;
}

// 读取当前 URL 中所有已激活的 site: 域名（组合搜索高亮用）
function getActiveSiteDomains() {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';
    const matches = q.match(/site:([^\s"]+)/gi) || [];
    return matches.map(m => m.replace(/site:/i, '').toLowerCase());
}

// 修改起始年份后，将已激活的 URL 过滤参数同步为新年份（不触发跳转）
function applyModernYearToUrl() {
    const url = new URL(window.location.href);
    const tbs = url.searchParams.get('tbs');
    if (tbs && tbs.startsWith('cdr:1,cd_min:')) {
        url.searchParams.set('tbs', getTimeFilterTbs());
        window.history.replaceState(null, '', url.toString());
    }
    const modernBtn = document.querySelector('.modern-content-btn');
    if (modernBtn) modernBtn.classList.toggle('time-filter-active', isTimeFilterActive());
}

function isTitleSearchActive() {
    const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
    if (searchBox && /intitle:/i.test(searchBox.value)) return true;
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q') || '';
    return /intitle:/i.test(q);
}

// 5. UI 创建逻辑
function createFloatingPanel() {
    if (document.getElementById('site-search-floating-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'site-search-floating-panel';

    // 缩小面板按钮
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'panel-minimize-btn';
    minimizeBtn.innerText = '−';
    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panelExpanded = !panelExpanded;
        panel.classList.toggle('panel-collapsed', !panelExpanded);
        savePanelState();
    });
    panel.appendChild(minimizeBtn);

    // 缩小状态显示的扩展图标（fetch + blob URL 绕过 CSP）
    const collapsedIcon = document.createElement('img');
    collapsedIcon.className = 'panel-collapsed-icon';
    const iconUrl = chrome.runtime.getURL('icons/icon128.png');
    fetch(iconUrl)
        .then(r => r.blob())
        .then(blob => { collapsedIcon.src = URL.createObjectURL(blob); })
        .catch(() => {});
    panel.appendChild(collapsedIcon);

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerText = i18n.title;
    panel.appendChild(title);

    const createBtnDOM = (site, container) => {
        const isCustom = container === 'custom';
        const btn = document.createElement('button');
        btn.className = 'site-search-btn';
        btn.dataset.domain = site.domain;
        btn.dataset.dragContainer = container;
        btn.draggable = true;

        // 高亮当前选中的站点（与"现代"按钮同色边框）
        if (site.domain.toLowerCase() === getActiveSiteDomain()) {
            btn.classList.add('site-active');
        }

        // 拖拽事件（内置 + 自定义站点均支持，可跨级移动）
        btn.addEventListener('dragstart', (e) => {
            dragSrcDomain = site.domain;
            dragSrcContainer = container;
            btn.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        btn.addEventListener('dragend', () => {
            btn.classList.remove('dragging');
            panel.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            dragSrcDomain = null;
            dragSrcContainer = null;
        });
        btn.addEventListener('dragover', (e) => {
            if (!dragSrcDomain) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            btn.classList.add('drag-over');
        });
        btn.addEventListener('dragleave', () => {
            btn.classList.remove('drag-over');
        });
        btn.addEventListener('drop', (e) => {
            e.preventDefault();
            btn.classList.remove('drag-over');
            if (!dragSrcDomain || dragSrcDomain === site.domain) return;
            moveSite(dragSrcContainer, container, dragSrcDomain, site.domain);
        });

        const icon = document.createElement('img');
        icon.className = 'site-icon';
        loadIconWithCache(site.domain, icon);
        btn.appendChild(icon);
        const text = document.createElement('span');
        text.innerText = site.name;
        btn.appendChild(text);

        // 自定义站点添加删除按钮
        if (isCustom) {
            const delBtn = document.createElement('span');
            delBtn.className = 'site-delete-btn';
            delBtn.innerText = '×';
            delBtn.title = isChinese ? '删除站点' : 'Remove site';
            btn.appendChild(delBtn);
        }
        return btn;
    };

    // 站点拖动逻辑：同级别内部排序 + 一级↔二级↔自定义互相移动
    const moveSite = (fromContainer, toContainer, fromDomain, toDomain) => {
        const getArr = c => c === 'primary' ? primarySites : c === 'secondary' ? secondarySites : customSites;
        const fromArr = getArr(fromContainer);
        const toArr = getArr(toContainer);
        const fromIdx = fromArr.findIndex(s => s.domain === fromDomain);
        const toIdx = toArr.findIndex(s => s.domain === toDomain);
        if (fromIdx === -1 || toIdx === -1) return;
        const [moved] = fromArr.splice(fromIdx, 1);
        // 插入到目标元素之前（与顶部指示线语义一致）
        const insertIdx = (fromContainer === toContainer && fromIdx < toIdx) ? toIdx - 1 : toIdx;
        toArr.splice(insertIdx, 0, moved);
        renderSiteButtons();
        renderSecondaryCustomButtons();
        renderCustomSitesList();
        saveSiteOrder();
        saveCustomSites();
        dragSrcDomain = null;
        dragSrcContainer = null;
    };

    // 重绘一级/二级站点按钮（保持二级菜单内原有元素顺序）
    const renderSiteButtons = () => {
        panel.querySelectorAll('.site-search-btn[data-drag-container="primary"]').forEach(b => b.remove());
        primarySites.forEach(s => panel.insertBefore(createBtnDOM(s, 'primary'), searchInput));
        moreContainer.querySelectorAll('.site-search-btn[data-drag-container="secondary"]').forEach(b => b.remove());
        // 插入到二级菜单中第一个非二级站点元素之前（自定义站点/设置按钮/设置页）
        const refNode = moreContainer.firstChild;
        secondarySites.forEach(s => moreContainer.insertBefore(createBtnDOM(s, 'secondary'), refNode));
    };

    primarySites.forEach(site => panel.appendChild(createBtnDOM(site, 'primary')));

    // 搜索输入框
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'site-search-input';
    searchInput.placeholder = "搜索";
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleNewSearch(searchInput.value.trim());
    });
    panel.appendChild(searchInput);

    // --- 横向按钮组 A|B|C ---
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    // A: 标题限定
    const titleBtn = document.createElement('button');
    titleBtn.className = 'site-search-btn title-search-btn';
    titleBtn.innerText = isChinese ? "标题" : "Title";
    if (isTitleSearchActive()) titleBtn.classList.add('time-filter-active');

    // B: 现代内容
    const modernBtn = document.createElement('button');
    modernBtn.className = 'site-search-btn modern-content-btn';
    modernBtn.innerText = isChinese ? "现代" : "Modern";
    if (isTimeFilterActive()) modernBtn.classList.add('time-filter-active');

    // C: 全选按钮 (永远不高亮，只作为触发器)
    const allBtn = document.createElement('button');
    allBtn.className = 'site-search-btn select-all-btn';
    allBtn.innerText = isChinese ? "全选" : "All";

    btnGroup.appendChild(titleBtn);
    btnGroup.appendChild(modernBtn);
    btnGroup.appendChild(allBtn);
    panel.appendChild(btnGroup);

    // 展开更多按钮
    const moreContainer = document.createElement('div');
    moreContainer.id = 'more-sites-container';
    secondarySites.forEach(site => moreContainer.appendChild(createBtnDOM(site, 'secondary')));

    // 自定义站点（搜索按钮）
    customSites.forEach(site => moreContainer.appendChild(createBtnDOM(site, 'custom')));

    // 设置按钮（二级菜单底部）
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'site-search-btn toggle-btn';
    settingsBtn.id = 'site-search-settings-btn';
    settingsBtn.innerText = isChinese ? '设置' : 'Settings';
    moreContainer.appendChild(settingsBtn);

    // 快捷搜索按钮（设置按钮上方，1/2/3 快速搜索）
    const quickSearchContainer = document.createElement('div');
    quickSearchContainer.className = 'quick-search-container';
    quickSearchContainer.id = 'site-search-quick-container';
    moreContainer.insertBefore(quickSearchContainer, settingsBtn);

    const renderQuickSearchButtons = () => {
        quickSearchContainer.innerHTML = '';
        const allSites = getAllSites();
        const activeDomains = getActiveSiteDomains();
        quickSearchSlots.forEach((slot, idx) => {
            if (!slot || !slot.length) return; // 未分配则隐藏
            // slot 中可能包含已被删除的站点，过滤掉无效项
            const validSites = slot.filter(s => allSites.some(a => a.domain === s.domain));
            if (!validSites.length) return;
            const btn = document.createElement('button');
            // 每个槽位固定配色：1 红 / 2 黑 / 3 蓝（NPR 色调）
            btn.className = 'quick-search-btn quick-slot-' + idx;
            // 当组合内的所有站点都已在当前 URL 生效，且模式匹配时，视为激活高亮
            const slotDomains = validSites.map(s => s.domain.toLowerCase());
            const allActive = slotDomains.length > 0 && slotDomains.every(d => activeDomains.includes(d));
            const mode = quickButtonModes[idx] || '';
            let modeOk = true;
            if (mode === 'title') modeOk = isTitleSearchActive();
            else if (mode === 'modern') modeOk = isTimeFilterActive();
            else if (mode === 'both') modeOk = isTitleSearchActive() && isTimeFilterActive();
            if (allActive && modeOk) btn.classList.add('site-active');
            // 按钮文字：显示模式（无模式则显示编号）
            const modeText = {
                '': null,
                title: isChinese ? '标题' : 'Title',
                modern: isChinese ? '现代' : 'Modern',
                both: isChinese ? '全部' : 'All'
            }[mode];
            btn.innerText = modeText || String(idx + 1);
            const names = validSites.map(s => s.name).join(' + ');
            btn.title = isChinese
                ? `组合搜索：${names}`
                : `Combined: ${names}`;
            btn.dataset.slot = String(idx);
            quickSearchContainer.appendChild(btn);
        });
    };
    renderQuickSearchButtons();

    // ---- 设置悬浮页（点击“设置”后打开） ----
    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'site-search-settings-panel';

    // 头部：标题 + 关闭按钮
    const settingsHeader = document.createElement('div');
    settingsHeader.className = 'settings-header';
    const settingsTitle = document.createElement('span');
    settingsTitle.className = 'settings-title';
    settingsTitle.innerText = isChinese ? '设置' : 'Settings';
    const settingsCloseBtn = document.createElement('button');
    settingsCloseBtn.className = 'settings-close-btn';
    settingsCloseBtn.innerText = '×';
    settingsCloseBtn.title = isChinese ? '关闭' : 'Close';
    settingsCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsPanel.classList.remove('settings-visible');
    });
    settingsHeader.appendChild(settingsTitle);
    settingsHeader.appendChild(settingsCloseBtn);
    settingsPanel.appendChild(settingsHeader);

    // 关键词跳转开关
    const settingRow = document.createElement('div');
    settingRow.className = 'setting-row';
    const settingLabel = document.createElement('span');
    settingLabel.className = 'setting-label';
    settingLabel.innerText = isChinese ? '关键词跳转' : 'Keyword jump';
    const keywordToggle = document.createElement('button');
    keywordToggle.className = 'switch-toggle' + (keywordJumpEnabled ? ' switch-on' : '');
    keywordToggle.id = 'site-search-keyword-toggle';
    keywordToggle.setAttribute('role', 'switch');
    keywordToggle.setAttribute('aria-checked', keywordJumpEnabled ? 'true' : 'false');
    keywordToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        keywordJumpEnabled = !keywordJumpEnabled;
        keywordToggle.classList.toggle('switch-on', keywordJumpEnabled);
        keywordToggle.setAttribute('aria-checked', keywordJumpEnabled ? 'true' : 'false');
        saveKeywordJumpSetting();
    });
    settingRow.appendChild(settingLabel);
    settingRow.appendChild(keywordToggle);
    settingsPanel.appendChild(settingRow);

    // 现代内容起始年份
    const modernRow = document.createElement('div');
    modernRow.className = 'setting-row';
    const modernLabel = document.createElement('span');
    modernLabel.className = 'setting-label';
    modernLabel.innerText = isChinese ? '现代内容起始年份' : 'Modern filter since';
    const modernInput = document.createElement('input');
    modernInput.type = 'number';
    modernInput.className = 'site-search-input modern-year-input';
    modernInput.min = '1990';
    modernInput.max = String(new Date().getFullYear());
    modernInput.value = String(modernYear);
    modernInput.title = isChinese ? '只搜索该年份之后的内容' : 'Only show results after this year';
    modernInput.addEventListener('change', () => {
        const y = parseInt(modernInput.value, 10);
        const thisYear = new Date().getFullYear();
        if (!y || y < 1990 || y > thisYear) {
            modernInput.value = String(modernYear);
            return;
        }
        modernYear = y;
        saveModernYearSetting();
        applyModernYearToUrl();
    });
    modernRow.appendChild(modernLabel);
    modernRow.appendChild(modernInput);
    settingsPanel.appendChild(modernRow);

    // 快捷搜索定制（1/2/3 号按钮：标题 + 站点多选），默认收起，点击展开按钮后才显示
    let quickSettingsExpanded = false;
    const quickSettingsContainer = document.createElement('div');
    quickSettingsContainer.id = 'site-search-quick-settings';
    quickSettingsContainer.style.display = 'none';

    const renderQuickSearchSettings = () => {
        quickSettingsContainer.innerHTML = '';
        const allSites = getAllSites();
        quickSearchSlots.forEach((slot, idx) => {
            // 级联显示：上一栏未设置时隐藏当前栏（按钮 1 始终显示）
            if (idx > 0 && !quickSearchSlots[idx - 1].length) return;
            const section = document.createElement('div');
            section.className = 'quick-setting-section';
            const header = document.createElement('div');
            header.className = 'quick-setting-header';
            header.innerText = `${isChinese ? '按钮' : 'Btn'} ${idx + 1}`;
            section.appendChild(header);
            // 搜索模式：标题 / 现代（可多选，样式与一级页面按钮组一致）
            const modeRow = document.createElement('div');
            modeRow.className = 'quick-setting-mode-row';
            const modeLabel = document.createElement('span');
            modeLabel.className = 'quick-setting-mode-label';
            modeLabel.innerText = isChinese ? '模式' : 'Mode';
            modeRow.appendChild(modeLabel);
            const modeGroup = document.createElement('div');
            modeGroup.className = 'btn-group quick-setting-mode-group';
            const isModeOn = (m, part) => m === part || m === 'both';
            const syncModeBtns = () => {
                const m = quickButtonModes[idx] || '';
                titleModeBtn.classList.toggle('time-filter-active', isModeOn(m, 'title'));
                modernModeBtn.classList.toggle('time-filter-active', isModeOn(m, 'modern'));
            };
            const titleModeBtn = document.createElement('button');
            titleModeBtn.type = 'button';
            titleModeBtn.className = 'site-search-btn';
            titleModeBtn.innerText = isChinese ? '标题' : 'Title';
            titleModeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const m = quickButtonModes[idx] || '';
                const titleOn = isModeOn(m, 'title');
                const modernOn = isModeOn(m, 'modern');
                const next = titleOn ? (modernOn ? 'modern' : '') : (modernOn ? 'both' : 'title');
                quickButtonModes[idx] = next;
                saveQuickSearchSlots();
                renderQuickSearchButtons();
                syncModeBtns();
            });
            const modernModeBtn = document.createElement('button');
            modernModeBtn.type = 'button';
            modernModeBtn.className = 'site-search-btn';
            modernModeBtn.innerText = isChinese ? '现代' : 'Modern';
            modernModeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const m = quickButtonModes[idx] || '';
                const titleOn = isModeOn(m, 'title');
                const modernOn = isModeOn(m, 'modern');
                const next = modernOn ? (titleOn ? 'title' : '') : (titleOn ? 'both' : 'modern');
                quickButtonModes[idx] = next;
                saveQuickSearchSlots();
                renderQuickSearchButtons();
                syncModeBtns();
            });
            modeGroup.appendChild(titleModeBtn);
            modeGroup.appendChild(modernModeBtn);
            syncModeBtns();
            modeRow.appendChild(modeGroup);
            section.appendChild(modeRow);
            allSites.forEach(site => {
                const cbRow = document.createElement('label');
                cbRow.className = 'quick-setting-check';
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = slot.some(s => s.domain === site.domain);
                cb.addEventListener('change', () => {
                    const existing = quickSearchSlots[idx].findIndex(s => s.domain === site.domain);
                    if (cb.checked && existing === -1) {
                        quickSearchSlots[idx].push({ name: site.name, domain: site.domain });
                    } else if (!cb.checked && existing !== -1) {
                        quickSearchSlots[idx].splice(existing, 1);
                    }
                    saveQuickSearchSlots();
                    renderQuickSearchButtons();
                });
                const cbText = document.createElement('span');
                cbText.innerText = site.name;
                // 站点图标（复用带缓存的 favicon 加载）
                const icon = document.createElement('img');
                icon.className = 'site-icon quick-setting-site-icon';
                icon.alt = '';
                loadIconWithCache(site.domain, icon);
                cbRow.appendChild(cb);
                cbRow.appendChild(icon);
                cbRow.appendChild(cbText);
                section.appendChild(cbRow);
            });
            quickSettingsContainer.appendChild(section);
        });
    };

    const addSiteBtn = document.createElement('button');
    addSiteBtn.className = 'site-search-btn toggle-btn';
    addSiteBtn.innerText = isChinese ? '+ 添加站点' : '+ Add site';
    addSiteBtn.id = 'site-search-add-btn';
    settingsPanel.appendChild(addSiteBtn);

    // 添加站点表单
    const addForm = document.createElement('div');
    addForm.className = 'add-site-form';
    addForm.style.display = 'none';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'site-search-input';
    nameInput.placeholder = isChinese ? '站点名称 (如 CNN)' : 'Site name (e.g. CNN)';
    const domainInput = document.createElement('input');
    domainInput.type = 'text';
    domainInput.className = 'site-search-input';
    domainInput.placeholder = isChinese ? '域名 (如 cnn.com)' : 'Domain (e.g. cnn.com)';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'site-search-btn toggle-btn';
    confirmBtn.innerText = isChinese ? '确认添加' : 'Add';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'site-search-btn';
    cancelBtn.innerText = isChinese ? '取消' : 'Cancel';
    addForm.appendChild(nameInput);
    addForm.appendChild(domainInput);
    const formBtns = document.createElement('div');
    formBtns.className = 'form-btn-group';
    formBtns.appendChild(confirmBtn);
    formBtns.appendChild(cancelBtn);
    addForm.appendChild(formBtns);
    settingsPanel.appendChild(addForm);

    const customList = document.createElement('div');
    customList.id = 'site-search-custom-list';
    settingsPanel.appendChild(customList);

    // 快捷按钮自定义（标题 + 站点多选）放在“+ 添加站点”下方
    const quickSettingsToggle = document.createElement('div');
    quickSettingsToggle.className = 'quick-settings-toggle';
    const toggleTitle = document.createElement('span');
    toggleTitle.className = 'quick-settings-toggle-title';
    toggleTitle.innerText = isChinese ? '快捷搜索定制' : 'Quick search customize';
    const toggleState = document.createElement('span');
    toggleState.className = 'quick-settings-toggle-state';
    toggleState.innerText = isChinese ? '展开' : 'Expand';
    quickSettingsToggle.appendChild(toggleTitle);
    quickSettingsToggle.appendChild(toggleState);
    quickSettingsToggle.addEventListener('click', () => {
        quickSettingsExpanded = !quickSettingsExpanded;
        quickSettingsContainer.style.display = quickSettingsExpanded ? 'block' : 'none';
        toggleState.innerText = quickSettingsExpanded
            ? (isChinese ? '收起' : 'Collapse')
            : (isChinese ? '展开' : 'Expand');
    });
    settingsPanel.appendChild(quickSettingsToggle);
    settingsPanel.appendChild(quickSettingsContainer);

    // 渲染设置页内的自定义站点列表
    const renderCustomSitesList = () => {
        customList.innerHTML = '';
        if (!customSites.length) return;
        customSites.forEach(site => {
            const row = document.createElement('div');
            row.className = 'custom-site-row';
            const icon = document.createElement('img');
            icon.className = 'site-icon';
            loadIconWithCache(site.domain, icon);
            row.appendChild(icon);
            const nameSpan = document.createElement('span');
            nameSpan.className = 'custom-site-name';
            nameSpan.innerText = site.name;
            row.appendChild(nameSpan);
            const domainSpan = document.createElement('span');
            domainSpan.className = 'custom-site-domain';
            domainSpan.innerText = site.domain;
            row.appendChild(domainSpan);
            const delBtn = document.createElement('button');
            delBtn.className = 'custom-site-del-btn';
            delBtn.innerText = '×';
            delBtn.title = isChinese ? '删除站点' : 'Remove site';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeCustomSite(site.domain);
                renderCustomSitesList();
                renderSecondaryCustomButtons();
                renderQuickSearchButtons();
            });
            row.appendChild(delBtn);
            customList.appendChild(row);
        });
    };

    // 渲染二级菜单中的自定义站点搜索按钮（保持在设置按钮之前）
    const renderSecondaryCustomButtons = () => {
        moreContainer.querySelectorAll('[data-drag-container="custom"]').forEach(b => b.remove());
        customSites.forEach(s => moreContainer.insertBefore(createBtnDOM(s, 'custom'), settingsBtn));
    };

    moreContainer.appendChild(settingsPanel);
    renderCustomSitesList();

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'site-search-btn toggle-btn';
    toggleBtn.innerText = i18n.showMore;
    toggleBtn.id = 'site-search-toggle-btn';
    panel.appendChild(toggleBtn);
    panel.appendChild(moreContainer);

    // 根据初始状态初始化面板
    if (!panelExpanded) {
        panel.classList.add('panel-collapsed');
    }

    // 事件委托
    panel.addEventListener('click', (e) => {
        // 缩小状态下点击展开面板
        if (panel.classList.contains('panel-collapsed')) {
            panelExpanded = true;
            panel.classList.remove('panel-collapsed');
            savePanelState();
            return;
        }
        if (e.target.closest('#site-search-toggle-btn')) {
            const isHidden = moreContainer.style.display === '' || moreContainer.style.display === 'none';
            moreContainer.style.display = isHidden ? 'flex' : 'none';
            toggleBtn.innerText = isHidden ? i18n.showLess : i18n.showMore;
            return;
        }
        if (e.target.closest('#site-search-settings-btn')) {
            // 打开/关闭设置悬浮页
            const isVisible = settingsPanel.classList.toggle('settings-visible');
            if (isVisible) {
                renderCustomSitesList();
                renderQuickSearchSettings();
            }
            return;
        }
        if (e.target.closest('#site-search-add-btn')) {
            const isFormHidden = addForm.style.display === 'none';
            addForm.style.display = isFormHidden ? 'flex' : 'none';
            if (isFormHidden) nameInput.focus();
            return;
        }
        if (e.target.closest('.add-site-form .toggle-btn')) {
            // 确认添加
            const success = addCustomSite(nameInput.value, domainInput.value);
            if (success) {
                nameInput.value = '';
                domainInput.value = '';
                addForm.style.display = 'none';
                renderSecondaryCustomButtons();
                renderCustomSitesList();
            }
            return;
        }
        if (e.target.closest('.add-site-form .site-search-btn:not(.toggle-btn)')) {
            // 取消
            addForm.style.display = 'none';
            nameInput.value = '';
            domainInput.value = '';
            return;
        }
        if (e.target.closest('.site-delete-btn')) {
            // 删除自定义站点
            const delSiteBtn = e.target.closest('.site-search-btn');
            if (delSiteBtn && delSiteBtn.dataset.domain) {
                removeCustomSite(delSiteBtn.dataset.domain);
                delSiteBtn.remove();
                renderCustomSitesList();
                renderQuickSearchButtons();
            }
            return;
        }
        const quickBtn = e.target.closest('.quick-search-btn');
        if (quickBtn && quickBtn.dataset.slot) {
            // 组合搜索：把该按钮分配的所有站点用 OR 组合，并按模式叠加标题/现代过滤
            const slotIdx = parseInt(quickBtn.dataset.slot, 10);
            const slot = quickSearchSlots[slotIdx];
            if (slot && slot.length) {
                const domains = slot
                    .filter(s => getAllSites().some(a => a.domain === s.domain))
                    .map(s => s.domain);
                if (domains.length) appendSitesToSearch(domains, quickButtonModes[slotIdx] || '');
            }
            return;
        }

        if (e.target.closest('.title-search-btn')) { toggleTitleSearch(); return; }
        if (e.target.closest('.modern-content-btn')) { toggleTimeFilter(); return; }
        if (e.target.closest('.select-all-btn')) { toggleSelectAll(); return; }

        const siteBtn = e.target.closest('.site-search-btn');
        if (siteBtn && siteBtn.dataset.domain) appendSiteToSearch(siteBtn.dataset.domain);
    });

    document.body.appendChild(panel);
}

// 6. 切换逻辑
function toggleSelectAll() {
    const titleActive = isTitleSearchActive();
    const timeActive = isTimeFilterActive();
    const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
    if (!searchBox) return;
    
    let url = new URL(window.location.href);
    let val = searchBox.value.trim();
    
    if (titleActive && timeActive) {
        // 全部关闭
        val = val.replace(/intitle:/gi, '').trim();
        url.searchParams.delete('tbs');
    } else {
        // 全部开启
        if (!titleActive) {
            let core = val.replace(/\s*site:[^\s]+/gi, '').trim();
            if (core && !/^".+"$/.test(core)) core = `"${core}"`;
            if (core) val = val.replace(core, `intitle:${core}`);
        }
        url.searchParams.set('tbs', getTimeFilterTbs());
    }
    
    url.searchParams.set('q', val);
    window.location.href = url.toString();
}

function toggleTimeFilter() {
    const url = new URL(window.location.href);
    const isActive = isTimeFilterActive();
    isActive ? url.searchParams.delete('tbs') : url.searchParams.set('tbs', getTimeFilterTbs());
    window.location.href = url.toString();
}

function toggleTitleSearch() {
    const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
    if (!searchBox) return;
    let val = searchBox.value.trim();
    if (!val) return;
    
    const siteMatch = val.match(/site:[^\s]+/gi);
    const siteStr = siteMatch ? siteMatch.join(' ') : '';
    let core = val.replace(/\s*site:[^\s]+/gi, '').replace(/intitle:/gi, '').trim();
    
    if (!/intitle:/i.test(val)) {
        if (core && !/^".+"$/.test(core)) core = `"${core}"`;
        core = `intitle:${core}`;
    } else {
        if (core && !/^".+"$/.test(core)) core = `"${core}"`;
    }
    
    searchBox.value = `${core} ${siteStr}`.trim();
    const form = searchBox.closest('form');
    if (form) {
        const urlParams = new URLSearchParams(window.location.search);
        const tbs = urlParams.get('tbs');
        if (tbs && !form.querySelector('input[name="tbs"]')) {
            const i = document.createElement('input'); i.type = 'hidden'; i.name = 'tbs'; i.value = tbs; form.appendChild(i);
        }
        form.submit();
    } else {
        searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
}

// 7. 执行搜索逻辑
function handleNewSearch(newKeyword) {
    if (!newKeyword) return;
    const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
    if (!searchBox) return;

    const siteMatch = searchBox.value.match(/site:[^\s]+/gi);
    const titleActive = document.querySelector('.title-search-btn')?.classList.contains('time-filter-active');

    let nextQuery = /^".+"$/.test(newKeyword) ? newKeyword : `"${newKeyword}"`;
    if (titleActive) nextQuery = `intitle:${nextQuery}`;
    if (siteMatch) nextQuery = `${nextQuery} ${siteMatch.join(' ')}`;

    searchBox.value = nextQuery;
    
    const form = searchBox.closest('form');
    if (form) {
        const urlParams = new URLSearchParams(window.location.search);
        const v = urlParams.get('tbs');
        if (v && !form.querySelector('input[name="tbs"]')) {
            const i = document.createElement('input'); i.type = 'hidden'; i.name = 'tbs'; i.value = v;
            form.appendChild(i);
        }
        form.submit();
    } else {
        searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
}

function appendSiteToSearch(domain) {
    const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
    if (searchBox) {
        let val = searchBox.value.trim();
        val = val.replace(/\s*site:[^\s]+/gi, '').trim();
        if (val && !(/^".+"$/.test(val)) && !val.toLowerCase().includes('intitle:')) val = `"${val}"`;
        searchBox.value = `${val} site:${domain}`;
        const form = searchBox.closest('form');
        form ? form.submit() : searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
}

// 组合搜索：把多个站点用 OR 组合成 (site:A OR site:B OR site:C)，可叠加标题/现代模式
function appendSitesToSearch(domains, mode) {
    if (!domains || !domains.length) return;
    const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
    if (!searchBox) return;
    let val = searchBox.value.trim();
    // 去掉已有的 site: 限制、intitle 与多余引号，重新组合
    val = val.replace(/\s*site:[^\s]+/gi, '').replace(/intitle:/gi, '').trim();
    if (val && !(/^".+"$/.test(val))) val = `"${val}"`;
    const combined = '(' + domains.map(d => `site:${d}`).join(' OR ') + ')';
    let finalVal = val ? `${val} ${combined}` : combined;
    // 标题模式：对关键词加 intitle:
    if ((mode === 'title' || mode === 'both') && val) {
        finalVal = `intitle:${val} ${combined}`;
    }
    searchBox.value = finalVal;
    const form = searchBox.closest('form');
    if (form) {
        // 现代模式：确保 tbs 参数随表单提交
        if (mode === 'modern' || mode === 'both') {
            if (!form.querySelector('input[name="tbs"]')) {
                const i = document.createElement('input');
                i.type = 'hidden';
                i.name = 'tbs';
                i.value = getTimeFilterTbs();
                form.appendChild(i);
            }
        }
        form.submit();
    } else {
        searchBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
}

// 8. 初始化与高亮
async function init() {
    await loadCustomSites();
    await loadSiteOrder();
    await loadPanelState();
    await loadKeywordJumpSetting();
    await loadModernYearSetting();
    await loadQuickSearchSlots();
    createFloatingPanel();
    enableAutoHighlight();
    enableShortcut();
    let timeout = null;
    const observer = new MutationObserver(() => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (!document.getElementById('site-search-floating-panel')) createFloatingPanel();
        }, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function enableShortcut() {
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            const panel = document.getElementById('site-search-floating-panel');
            if (!panel) return;
            panelExpanded = !panelExpanded;
            panel.classList.toggle('panel-collapsed', !panelExpanded);
            savePanelState();
        }
    });
}

function enableAutoHighlight() {
    document.addEventListener('click', function(e) {
        if (!keywordJumpEnabled) return;
        const targetLink = e.target.closest('a');
        // 仅作用于搜索结果区（#rso）内的链接，避免干扰页面其他链接
        if (targetLink && targetLink.href && targetLink.href.startsWith('http') && targetLink.closest('#rso')) {
            const searchBox = document.querySelector('textarea[name="q"], input[name="q"]');
            if (!searchBox) return;
            let query = searchBox.value.trim().replace(/\s*site:[^\s]+/gi, '').replace(/intitle:/gi, '').replace(/^"|"$/g, '').trim();
            if (query) {
                const encoded = encodeURIComponent(query);
                if (!targetLink.href.includes('#:~:text=')) {
                    const sep = targetLink.href.includes('#') ? '&' : '#';
                    targetLink.href = `${targetLink.href}${sep}:~:text=${encoded}`;
                }
            }
        }
    }, true); 
}

init().catch(console.error);