import { defineContentScript } from 'wxt/utils/define-content-script';

import { extractMarkedCode } from '@/utils/leetcode-paste';

/**
 * 监控页面内的粘贴事件，把带 `leetcode start / end / ignore` 标记的代码裁剪后
 * 重新派发一次粘贴，这样 Monaco 编辑器收到的是干净版本。
 */
export default defineContentScript({
  matches: ['https://leetcode.cn/problems/*'],
  // 越早绑定捕获阶段的 paste 监听越不容易漏事件
  runAt: 'document_start',
  main(ctx) {
    ctx.addEventListener(
      document,
      'paste',
      (event) => {
        const target = event.target;
        // Monaco 的输入层是 textarea.inputarea.monaco-mouse-cursor-text
        if (!(target instanceof HTMLElement) || !target.className.includes('monaco')) return;

        const { matched, code } = extractMarkedCode(event.clipboardData?.getData('text') ?? '');
        if (!matched) return;

        // 拦下原始粘贴，改为派发裁剪后的事件
        event.stopPropagation();
        event.preventDefault();

        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', code);
        target.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }));
      },
      { capture: true }
    );
  },
});
