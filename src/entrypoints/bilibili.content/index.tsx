import { createRoot } from 'react-dom/client';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';

import Progress from './Progress';
import './style.css';

/**
 * 在 B 站视频页的分 P 列表下方展示「已看多久 / 总时长 / 百分比」，并提供 +1 倍速按钮。
 */
export default defineContentScript({
  matches: ['https://www.bilibili.com/video*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'extension-private-bilibili-progress',
      position: 'inline',
      anchor: '#multi_page',
      append: 'last',
      onMount: (container) => {
        // container 是 body 级元素时 React 会告警，所以再包一层
        const app = document.createElement('div');
        container.append(app);
        const root = createRoot(app);
        root.render(<Progress />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    // 分 P 列表是异步渲染的，等它出现再挂载
    ui.autoMount();
  },
});
