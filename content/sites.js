// ============================================================
// sites.js — 站点数据 / 共享状态 / storage 持久化 / 图标缓存
// ============================================================

// 2. 站点数据
var defaultPrimarySites = [
    { name: "The Economist", domain: "economist.com" },
    { name: "BBC", domain: "bbc.com" },
    { name: "Sixth Tone", domain: "sixthtone.com" },
    { name: "SCMP", domain: "scmp.com" }
];

var defaultSecondarySites = [
    { name: "Vox", domain: "vox.com" },
    { name: "The New York Times", domain: "nytimes.com" },
    { name: "Reuters", domain: "reuters.com" },
    { name: "ABC News", domain: "abcnews.go.com" },
    { name: "The Atlantic", domain: "theatlantic.com" },
    { name: "Wired", domain: "wired.com" },
    { name: "Smithsonian Magazine", domain: "smithsonianmag.com" },
    { name: "Slate", domain: "slate.com" },
    { name: "Washington Post", domain: "washingtonpost.com" }
];

var primarySites = [...defaultPrimarySites];
var secondarySites = [...defaultSecondarySites];
var customSites = [];

// 2.5 站点排序持久化（chrome.storage.sync）
var dragSrcDomain = null;
var dragSrcContainer = null;
var panelExpanded = true;
var keywordJumpEnabled = true;
var modernYear = 2020;
var quickSearchSlots = [[], [], []]; // 每个 slot 为 { name, domain } 数组（支持多选组合搜索）
var quickButtonModes = ['', '', '']; // 每个快捷按钮的搜索模式：'' 普通 / 'title' 标题 / 'modern' 现代 / 'both' 标题+现代

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
