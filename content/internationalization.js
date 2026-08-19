// ============================================================
// internationalization.js — 多语言适配（国际化）
// 注意：MV3 内容脚本多文件按序拼接加载，跨文件共享的顶层状态
// 必须用 var 声明（let/const 仅限各自文件内可见；function 全局可见）
// ============================================================
var isChinese = navigator.language.toLowerCase().includes('zh');
var i18n = {
    title: isChinese ? "一键指定站点" : "Quick Site Search",
    showMore: isChinese ? "显示更多 »" : "Show More »",
    showLess: isChinese ? "收起 «" : "Show Less «"
};
