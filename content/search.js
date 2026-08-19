// ============================================================
// search.js — 状态检测 / 查询切换 / 搜索执行 / 高亮 / 快捷键
// ============================================================

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

// 8b. 快捷键与高亮
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
