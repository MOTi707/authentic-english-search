# Authentic English Search - 地道英语搜

> 一键在权威外刊中查询单词/短语的真实用法，告别中式英语。

---

## 解决什么问题？

学英语最大的瓶颈之一，不是词汇量，而是**不知道一个词在真实语境中怎么用**。

词典给的例句往往生硬过时，Google 搜索又淹没在海量无关结果里。你想知道 `compelling` 在《经济学人》里怎么搭配、`break the ice` 在 BBC 报道中出现在什么语境——以前你需要手动输入 `"compelling" site:economist.com`，现在只需**点一下按钮**。

本扩展专为这类需求设计：在 Google 搜索页自动生成一个浮动面板，让你一键将搜索限定到全球顶级英语刊物，**1 秒内找到地道用法**。

<img width="277" height="421" alt="Screenshot 2026-07-07 101654" src="https://github.com/user-attachments/assets/62903499-d0f3-47fc-9a9f-aaed5fab9ce7" />


<img width="1155" height="893" alt="QQ20260707-101754" src="https://github.com/user-attachments/assets/c91d91a7-d6f4-4cdd-902f-5d32a200408d" />

---

## 功能一览

| 功能 | 说明 |
|------|------|
| **一键限定权威站点** | 点击按钮即刻将搜索限定到 The Economist、BBC、纽约时报等 14 家刊物，无需手输 `site:` 语法 |
| **标题限定（intitle）** | 只搜索标题中包含该词的页面，精准找到以该词为主题的深度文章 |
| **现代内容过滤** | 自动过滤 2023 年以前的旧内容，确保看到的是当下鲜活的用法 |
| **全选模式** | 一键同时开启「标题限定 + 现代过滤」，最严格地锁定高质量结果 |
| **快捷搜索框** | 面板内置搜索框，输入新词后按回车直接搜索，自动加引号精确匹配 |
| **拖拽排序** | 拖拽按钮调整刊物顺序，常用的排在前面，顺序跨设备自动同步 |
| **关键词高亮** | 点击搜索结果链接后，浏览器自动滚动到目标词并高亮显示，省去逐页查找 |
| **中英文自动切换** | 根据浏览器语言自动显示中文或英文界面 |

---

## 典型使用场景

**场景 1：查单词搭配**
你在写作时不确定 `nuanced` 怎么用地道。在 Google 搜索 `nuanced`，面板出现后点击 **The Economist** → 立刻看到经济学人文章中 `nuanced` 的真实搭配和上下文。

**场景 2：查短语语境**
你想学会 `push the envelope` 这个表达。搜索后点击 **BBC News** → 看到 BBC 记者如何在真实报道中使用这个短语。

**场景 3：精准查最新文章**
搜索 `resilience`，点击面板上的 **「全选」** → 自动限定标题包含该词 + 只看 2023 年后的内容 → 找到最新、最相关的深度文章。

---

## 安装方法

1. 点击浏览器右上角 `⋮` → **更多工具** → **扩展程序**（或地址栏输入 `chrome://extensions`）
2. 打开右上角的 **开发者模式** 开关
3. 点击 **加载已解压的扩展程序**
4. 选择本项目文件夹（包含 `manifest.json` 的目录）
5. 完成。在 Google 搜索任意英文词，浮动面板会自动出现

> 重装电脑后重新加载即可，站点排序偏好通过 Chrome 账号自动同步。

---

## 内置刊物（14 家）

**主面板（5 家）：**
The Economist、BBC News、Washington Post、Sixth Tone、SCMP

**展开更多（9 家）：**
Vox、The New York Times、Bloomberg、Reuters、The Guardian、ABC News、The Atlantic、Wired、National Geographic

---

## 支持的 Google 域名

google.com / google.co.uk / google.co.jp / google.com.hk / google.com.tw / google.com.au / google.com.sg / google.ca / google.de / google.fr

---

## 项目结构

```
├── manifest.json          # 扩展配置
├── icons/                 # 扩展图标（16/48/128）
└── content/
    ├── content.js         # 核心逻辑
    └── styles.css         # 面板样式
```

---

## 作者

**Milton Lee**  
[GitHub](https://github.com/MOTi707)
