// ============================================================
// ui.js — 面板 UI（createFloatingPanel）/ 初始化
// 依赖：internationalization.js → sites.js → search.js（按 manifest 顺序先加载）
// 巨型函数按段落用注释分节，后续可按需继续抽成子函数
// ============================================================

// 5. UI 创建逻辑
function createFloatingPanel() {
    if (document.getElementById('site-search-floating-panel')) return;

    // ---- 5.1 面板骨架 ----
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

    // ---- 5.2 站点按钮 DOM 构造（含拖拽） ----
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

    // ---- 5.3 拖拽移动逻辑 + 按钮重绘 ----
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
        // 一级按钮插到快捷搜索容器之前，保持「快捷按钮紧贴搜索框上方」的布局
        const primaryRef = quickSearchContainer || searchInput;
        primarySites.forEach(s => panel.insertBefore(createBtnDOM(s, 'primary'), primaryRef));
        moreContainer.querySelectorAll('.site-search-btn[data-drag-container="secondary"]').forEach(b => b.remove());
        // 插入到二级菜单中第一个非二级站点元素之前（自定义站点/设置按钮/设置页）
        const refNode = moreContainer.firstChild;
        secondarySites.forEach(s => moreContainer.insertBefore(createBtnDOM(s, 'secondary'), refNode));
    };

    primarySites.forEach(site => panel.appendChild(createBtnDOM(site, 'primary')));

    // ---- 5.4 搜索输入框 ----
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'site-search-input';
    searchInput.placeholder = "搜索";
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleNewSearch(searchInput.value.trim());
    });
    panel.appendChild(searchInput);

    // ---- 5.5 横向按钮组 A|B|C ----
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

    // ---- 5.6 二级菜单（moreContainer）骨架 ----
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

    // ---- 5.7 快捷搜索按钮（一级菜单搜索输入框上方，1/2/3 快速搜索） ----
    const quickSearchContainer = document.createElement('div');
    quickSearchContainer.className = 'quick-search-container';
    quickSearchContainer.id = 'site-search-quick-container';
    panel.insertBefore(quickSearchContainer, searchInput);

    const renderQuickSearchButtons = () => {
        quickSearchContainer.innerHTML = '';
        const allSites = getAllSites();
        const activeDomains = getActiveSiteDomains();
        // 固定渲染 3 个槽位：左 / 中 / 右；未分配的用不可见占位保持布局
        for (let idx = 0; idx < 3; idx++) {
            const slot = quickSearchSlots[idx] || [];
            const validSites = slot.filter(s => allSites.some(a => a.domain === s.domain));
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.slot = String(idx);
            if (!validSites.length) {
                btn.className = 'quick-search-btn quick-slot-placeholder';
                btn.disabled = true;
                btn.tabIndex = -1;
                quickSearchContainer.appendChild(btn);
                continue;
            }
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
            btn.innerText = String(idx + 1); // 始终显示编号 1/2/3
            const names = validSites.map(s => s.name).join(' + ');
            btn.title = isChinese
                ? `组合搜索：${names}`
                : `Combined: ${names}`;
            quickSearchContainer.appendChild(btn);
        }
    };
    renderQuickSearchButtons();

    // ---- 5.8 设置悬浮页 ----
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

    // 快捷搜索定制（1/2/3 号按钮：模式 + 站点多选），默认收起，点击展开按钮后才显示
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
            // 站点选择卡片（复用一级页面按钮样式，紧凑版）
            const sitesWrap = document.createElement('div');
            sitesWrap.className = 'quick-setting-sites';
            allSites.forEach(site => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'site-search-btn quick-setting-site-card';
                if (slot.some(s => s.domain === site.domain)) card.classList.add('site-active');
                const icon = document.createElement('img');
                icon.className = 'site-icon quick-setting-site-icon';
                icon.alt = '';
                loadIconWithCache(site.domain, icon);
                card.appendChild(icon);
                const text = document.createElement('span');
                text.innerText = site.name;
                card.appendChild(text);
                card.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const existing = quickSearchSlots[idx].findIndex(s => s.domain === site.domain);
                    if (existing === -1) {
                        quickSearchSlots[idx].push({ name: site.name, domain: site.domain });
                        card.classList.add('site-active');
                    } else {
                        quickSearchSlots[idx].splice(existing, 1);
                        card.classList.remove('site-active');
                    }
                    saveQuickSearchSlots();
                    renderQuickSearchButtons();
                });
                sitesWrap.appendChild(card);
            });
            section.appendChild(sitesWrap);
            quickSettingsContainer.appendChild(section);
        });
    };

    // + 添加站点按钮
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

    // 快捷按钮自定义（模式 + 站点多选）放在“+ 添加站点”下方
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

    // ---- 5.9 组装与事件委托 ----
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

// 8. 初始化
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

init().catch(console.error);
