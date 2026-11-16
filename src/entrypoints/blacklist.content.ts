import { defineContentScript } from 'wxt/utils/define-content-script';

/**
 * 黑名单站点拦截（骨架，尚未实现）。
 *
 * 必须 `document_start`：如果要抹掉页面内容，得赶在首屏渲染之前。
 * 匹配范围暂时保留 `<all_urls>`，等真正实现时再收窄或改为运行时注册。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    // TODO: 读取 storage 中的黑名单规则，命中后拦截页面
  },
});
