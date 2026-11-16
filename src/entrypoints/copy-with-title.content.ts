import { defineContentScript } from 'wxt/utils/define-content-script';

import { formatCopyText } from '@/lib/copy-format';
import { settingsItem } from '@/lib/storage';
import { copyToClipboard } from '@/utils/copy-to-clipboard';

/**
 * Alt + C 复制当前页面，格式由设置决定（标题+链接 / Markdown / 仅链接）。
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

      void (async () => {
        // 每次按键都读一次设置，保证管理界面里改完立刻生效
        const { copyFormat } = await settingsItem.getValue();
        await copyToClipboard(formatCopyText(copyFormat, document.title, location.href));
      })();
    });
  },
});
