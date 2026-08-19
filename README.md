# Authentic English Search - 地道英语搜

> 一键在权威外刊中查询单词/短语的真实用法，告别中式英语。
> **当前版本 v1.3** · 更新于 2026-08-19

---

## 解决什么问题？

学英语最大的瓶颈之一，不是词汇量，而是**不知道一个词在真实语境中怎么用**。

词典给的例句往往生硬过时，Google 搜索又淹没在海量无关结果里。你想知道 `compelling` 在《经济学人》里怎么搭配、`break the ice` 在 BBC 报道中出现在什么语境——以前你需要手动输入 `"compelling" site:economist.com`，现在只需**点一下按钮**。

本扩展专为这类需求设计：在 Google 搜索页自动生成一个浮动面板，让你一键将搜索限定到全球顶级英语刊物，**1 秒内找到地道用法**。

<img width="277" height="421" alt="Screenshot 2026-07-07 101654" src="https://github.com/user-attachments/assets/62903499-d0f3-47fc-9a9f-aaed5fab9ce7" />


<img width="1155" height="893" alt="QQ20260707-101754" src="https://github.com/user-attachments/assets/c91d91a7-d6f4-4cdd-902f-5d32a200408d" />

<img width="1043" height="786" alt="image" src="https://github.com/user-attachments/assets/09ebae16-86c6-4437-a8bd-2d6328dafa62" />


---

## 功能一览

| 功能 | 说明 |
|------|------|
| **一键限定权威站点** | 点击按钮即刻将搜索限定到 The Economist、BBC、纽约时报等 13 家刊物，无需手输 `site:` 语法 |
| **多站点组合搜索** | 快捷按钮（1/2/3，固定左/中/右三个槽位）可在设置中勾选多家刊物，一次生成 `(site:A OR site:B)` 组合查询，一次搜遍多家 |
| **快捷搜索模式** | 每个快捷按钮可配置「标题 / 现代」搜索模式（可多选），点击按钮时自动叠加 `intitle:` 与时间过滤 |
| **标题限定（intitle）** | 只搜索标题中包含该词的页面，精准找到以该词为主题的深度文章 |
| **现代内容过滤** | 默认过滤 2020 年以前的旧内容（起始年份可在设置中自定义），确保看到的是当下鲜活的用法 |
| **全选模式** | 一键同时开启「标题限定 + 现代过滤」，最严格地锁定高质量结果 |
| **快捷搜索框** | 面板内置搜索框，输入新词后按回车直接搜索，自动加引号精确匹配 |
| **设置悬浮页** | 独立设置面板：关键词跳转开关、现代内容年份、添加/删除自定义站点、快捷按钮定制 |
| **自定义站点** | 可在设置中添加任意站点，支持拖拽排序、跨菜单移动 |
| **拖拽排序** | 一级/二级菜单之间可互相拖动站点，顺序跨设备自动同步 |
| **当前站点高亮** | 正在生效的站点按钮以蓝色边框高亮，一眼看出搜索限定范围 |
| **关键词高亮** | 点击搜索结果链接后，浏览器自动滚动到目标词并高亮显示（仅作用于搜索结果区） |
| **中英文自动切换** | 根据浏览器语言自动显示中文或英文界面 |

---

## 典型使用场景

**场景 1：查单词搭配**
你在写作时不确定 `nuanced` 怎么用地道。在 Google 搜索 `nuanced`，面板出现后点击 **The Economist** → 立刻看到经济学人文章中 `nuanced` 的真实搭配和上下文。

**场景 2：查短语语境**
你想学会 `push the envelope` 这个表达。搜索后点击 **BBC** → 看到 BBC 记者如何在真实报道中使用这个短语。

**场景 3：一次对比多家刊物的用法**
给快捷按钮 1 勾选上 BBC、The Economist、Slate 三家 → 点击圆形按钮 → 一次搜索同时返回三家刊物中该词的用法，对比各家措辞风格。

**场景 4：精准查最新文章**
搜索 `resilience`，点击面板上的 **「全选」** → 自动限定标题包含该词 + 只看 2020 年后的内容 → 找到最新、最相关的深度文章。

---

## 安装方法

1. 点击浏览器右上角 `⋮` → **更多工具** → **扩展程序**（或地址栏输入 `chrome://extensions`）
2. 打开右上角的 **开发者模式** 开关
3. 点击 **加载已解压的扩展程序**
4. 选择本项目文件夹（包含 `manifest.json` 的目录）
5. 完成。在 Google 搜索任意英文词，浮动面板会自动出现

> 重装电脑后重新加载即可，站点排序偏好通过 Chrome 账号自动同步。

---

## 内置刊物（13 家）

**主面板（5 家）：**
The Economist、BBC、Washington Post、Sixth Tone、SCMP

**展开更多（8 家）：**
Vox、The New York Times、Reuters、ABC News、The Atlantic、Wired、Smithsonian Magazine、Slate

---

## 支持的 Google 域名

google.com / google.co.uk / google.co.jp / google.com.hk / google.com.tw / google.com.au / google.com.sg / google.ca / google.de / google.fr

---

## 项目结构

```
├── manifest.json          # 扩展配置（content_scripts 按序加载 4 个 JS）
├── icons/                 # 扩展图标（16/48/128）
└── content/
    ├── internationalization.js  # 多语言适配（语言检测 + 文案）
    ├── sites.js           # 站点数据 / 共享状态 / storage 持久化 / 图标缓存
    ├── search.js          # 状态检测 / 查询切换 / 搜索执行 / 高亮 / 快捷键
    ├── ui.js              # 面板 UI（createFloatingPanel）/ 初始化入口
    └── styles.css         # 面板样式
```

---

## 更新日志

### v1.3.1（2026-08-19）
- **修复快捷搜索组合查询损坏**：在已应用 `(site:A OR site:B)` 组合搜索后，再次于面板快捷搜索框输入关键词（或切换「标题」/「全选」）会生成 `site:A site:B)` 这类残缺查询（括号与 OR 丢失）。新增 `extractSiteDomains` / `buildSiteGroup` / `stripSiteFilters` 辅助函数，统一提取-重建-移除 site 组合逻辑
- **高亮与清理正则加固**：域名匹配正则排除括号，避免 `scmp.com)` 的 `)` 被吞进域名导致快捷按钮高亮失效；`-site:xxx` 排除写法不再被误删

### v1.3（2026-08-19）
- **快捷搜索定制**：设置页新增「快捷搜索定制」折叠区，支持为 1/2/3 号快捷按钮配置多选站点组合搜索（`(site:A OR site:B)`）与搜索模式（标题/现代可多选）
- **快捷按钮增强**：统一浅蓝色调圆形按钮（固定显示 1/2/3）、位置移至一级菜单搜索框上方、左/中/右三个预分配槽位
- **设置悬浮页**：关键词跳转开关、添加/删除自定义站点、现代内容起始年份配置
- **自定义站点强化**：自定义站点可拖拽排序、跨菜单移动，与内置站点一致
- **一级/二级菜单互相拖拽**：站点可跨菜单移动并持久化
- **当前站点高亮**：正在生效的站点以蓝色边框高亮（与「现代」按钮同款）
- **ABC News 域名修复**：`abcnews.com` → `abcnews.go.com`
- **现代内容年份可配置**：默认起始年份改为 2020，可在设置中调整
- **关键词高亮收敛**：仅作用于 Google 搜索结果区（`#rso`）内的链接
- **设置面板精简**：移除冗余标题与分隔线
- **代码模块化**：`content.js` 拆分为 4 个模块文件（`internationalization.js` / `sites.js` / `search.js` / `ui.js`），按序加载
- 内置刊物更新：BBC News → BBC，移除 National Geographic，新增 Smithsonian Magazine、Slate，Washington Post 移入二级菜单

### v1.2（2026-07-07）
- 初始发布：一键限定权威站点搜索、标题限定、现代过滤、全选模式、快捷搜索框、关键词高亮、中英文切换

---

## 作者

**Milton Lee**  
[GitHub](https://github.com/MOTi707)
