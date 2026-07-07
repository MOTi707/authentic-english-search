// 1. 多语言适配
const isChinese = navigator.language.toLowerCase().includes('zh');
const i18n = {
    title: isChinese ? "一键指定站点" : "Quick Site Search",
    showMore: isChinese ? "显示更多 »" : "Show More »",
    showLess: isChinese ? "收起 «" : "Show Less «"
};

// 2. 站点数据
const primarySites = [
    { name: "The Economist", domain: "economist.com" },
    { name: "BBC News", domain: "bbc.com" },
    { name: "Washington Post", domain: "washingtonpost.com" },
    { name: "Sixth Tone", domain: "sixthtone.com" },
    { name: "SCMP", domain: "scmp.com" }
];

const secondarySites = [
    { name: "Vox", domain: "vox.com" },
    { name: "The New York Times", domain: "nytimes.com" },
    { name: "Bloomberg", domain: "bloomberg.com" },
    { name: "Reuters", domain: "reuters.com" },
    { name: "The Guardian", domain: "theguardian.com" },
    { name: "ABC News", domain: "abcnews.com" },
    { name: "The Atlantic", domain: "theatlantic.com" },
    { name: "Wired", domain: "wired.com" },
    { name: "National Geographic", domain: "nationalgeographic.com" }
];

// 2.5 站点排序持久化（chrome.storage.sync）
let dragSrcDomain = null;
let dragSrcContainer = null;

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
function isTimeFilterActive() {
    const urlParams = new URLSearchParams(window.location.search);
    const host = window.location.host;
    if (host.includes('google')) return urlParams.get('tbs') === 'cdr:1,cd_min:1/1/2023';
    return false;
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

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.innerText = i18n.title;
    panel.appendChild(title);

    const createBtnDOM = (site, container) => {
        const btn = document.createElement('button');
        btn.className = 'site-search-btn';
        btn.dataset.domain = site.domain;
        btn.dataset.dragContainer = container;
        btn.draggable = true;

        // 拖拽事件
        btn.addEventListener('dragstart', (e) => {
            dragSrcDomain = site.domain;
            dragSrcContainer = container;
            btn.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        btn.addEventListener('dragend', () => {
            btn.classList.remove('dragging');
            panel.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });
        btn.addEventListener('dragover', (e) => {
            if (dragSrcContainer !== container) return;
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
            if (!dragSrcDomain || dragSrcDomain === site.domain || dragSrcContainer !== container) return;
            const sitesArr = container === 'primary' ? primarySites : secondarySites;
            const fromIdx = sitesArr.findIndex(s => s.domain === dragSrcDomain);
            const toIdx = sitesArr.findIndex(s => s.domain === site.domain);
            if (fromIdx === -1 || toIdx === -1) return;
            const [moved] = sitesArr.splice(fromIdx, 1);
            sitesArr.splice(toIdx, 0, moved);
            // 重新排列 DOM
            const parentEl = container === 'primary' ? panel : moreContainer;
            parentEl.querySelectorAll('.site-search-btn[data-drag-container="' + container + '"]').forEach(b => b.remove());
            const refNode = container === 'primary' ? searchInput : null;
            sitesArr.forEach(s => parentEl.insertBefore(createBtnDOM(s, container), refNode));
            saveSiteOrder();
            dragSrcDomain = null;
            dragSrcContainer = null;
        });

        const icon = document.createElement('img');
        icon.className = 'site-icon';
        loadIconWithCache(site.domain, icon);
        btn.appendChild(icon);
        const text = document.createElement('span');
        text.innerText = site.name;
        btn.appendChild(text);
        return btn;
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

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'site-search-btn toggle-btn';
    toggleBtn.innerText = i18n.showMore;
    toggleBtn.id = 'site-search-toggle-btn';
    panel.appendChild(toggleBtn);
    panel.appendChild(moreContainer);

    // 事件委托
    panel.addEventListener('click', (e) => {
        if (e.target.closest('#site-search-toggle-btn')) {
            const isHidden = moreContainer.style.display === '' || moreContainer.style.display === 'none';
            moreContainer.style.display = isHidden ? 'flex' : 'none';
            toggleBtn.innerText = isHidden ? i18n.showLess : i18n.showMore;
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
        url.searchParams.set('tbs', 'cdr:1,cd_min:1/1/2023');
    }
    
    url.searchParams.set('q', val);
    window.location.href = url.toString();
}

function toggleTimeFilter() {
    const url = new URL(window.location.href);
    const isActive = isTimeFilterActive();
    isActive ? url.searchParams.delete('tbs') : url.searchParams.set('tbs', 'cdr:1,cd_min:1/1/2023');
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

// 8. 初始化与高亮
async function init() {
    await loadSiteOrder();
    createFloatingPanel();
    enableAutoHighlight();
    let timeout = null;
    const observer = new MutationObserver(() => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            if (!document.getElementById('site-search-floating-panel')) createFloatingPanel();
        }, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function enableAutoHighlight() {
    document.addEventListener('click', function(e) {
        const targetLink = e.target.closest('a');
        if (targetLink && targetLink.href && targetLink.href.startsWith('http')) {
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