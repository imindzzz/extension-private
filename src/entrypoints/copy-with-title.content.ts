import { defineContentScript } from 'wxt/utils/define-content-script';

import { copyToClipboard } from '@/utils/copy-to-clipboard';

/**
 * Alt + C 复制「页面标题 + 链接」，方便贴到聊天窗口时保留出处。
 */
export default defineContentScript({
  matches: ['<all_urls>'],
  // 官方推荐默认值：DOM 就绪且不阻塞页面加载
  runAt: 'document_idle',
  main(ctx) {
    ctx.addEventListener(window, 'keydown', (event) => {
      if (event.key !== 'c' || !event.altKey) return;
      // 让出 Ctrl / ⌘ / Shift 组合键，避免和站点快捷键打架
      if (event.ctrlKey || event.metaKey || event.shiftKey) return;

      void copyToClipboard(`${document.title}\n${location.href}`);
    });
  },
});
