import type { ShadowRootContentScriptUi } from 'wxt/utils/content-script-ui/shadow-root';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';

import { findMatchingRule } from '@/lib/blacklist';
import { blacklistItem, settingsItem } from '@/lib/storage';

import { renderBlockedUi } from './blocked-ui';
// 用 ?inline 把样式打进 JS，避免通过 web_accessible_resources 向所有站点暴露一个可探测的文件
import blockedCss from './style.css?inline';

/** storage 读不出来时不能让页面一直白着 */
const GUARD_TIMEOUT_MS = 800;

/** 命中后观察媒体元素的时间，有些站点的播放器是后置插入的 */
const MEDIA_WATCH_MS = 5000;

const STYLE_HIDE = 'html { visibility: hidden !important; } html, body { overflow: hidden !important; }';
const STYLE_LOCK = 'html, body { overflow: hidden !important; }';

type Ui = ShadowRootContentScriptUi<void>;

function createGuard(): HTMLStyleElement {
  const style = document.createElement('style');
  style.id = 'extension-private-blacklist-guard';
  style.textContent = STYLE_HIDE;
  (document.head ?? document.documentElement).append(style);
  return style;
}

function setGuard(style: HTMLStyleElement, mode: 'hide' | 'lock' | 'off'): void {
  if (mode === 'off') {
    style.remove();
    return;
  }
  style.textContent = mode === 'hide' ? STYLE_HIDE : STYLE_LOCK;
}

function pauseMedia(): void {
  const stop = () => {
    for (const el of document.querySelectorAll('video, audio')) {
      const media = el as HTMLMediaElement;
      if (!media.paused) media.pause();
    }
  };

  stop();
  const observer = new MutationObserver(stop);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), MEDIA_WATCH_MS);
}

export default defineContentScript({
  matches: ['<all_urls>'],
  // 必须尽早：晚于首屏就可能先闪一下页面内容
  runAt: 'document_start',
  async main(ctx) {
    const guard = createGuard();

    const watchdog = setTimeout(() => setGuard(guard, 'off'), GUARD_TIMEOUT_MS);
    const release = () => {
      clearTimeout(watchdog);
      setGuard(guard, 'off');
    };

    let rules;
    let settings;
    try {
      settings = await settingsItem.getValue();
      if (!settings.blacklistEnabled) {
        release();
        return;
      }
      rules = await blacklistItem.getValue();
    } catch {
      // 读不到配置就当作不拦截，绝不能让页面卡在隐藏状态
      release();
      return;
    }
    clearTimeout(watchdog);

    const hit = findMatchingRule(location.href, rules);
    if (!hit) {
      release();
      return;
    }

    const removeRule = async (): Promise<void> => {
      const latest = await blacklistItem.getValue();
      await blacklistItem.setValue(latest.filter((rule) => rule.id !== hit.id));
    };

    // 用对象持有引用，让 close 能在 UI 创建之前定义
    const mounted: { ui?: Ui } = {};

    const close = (): void => {
      release();
      mounted.ui?.remove();
    };

    // 先准备好 UI 再解除隐藏，把「页面露出」压缩到 mount 的那一次同步调用内
    mounted.ui = await createShadowRootUi(ctx, {
      name: 'extension-private-blacklist',
      position: 'modal',
      zIndex: 2147483647,
      css: blockedCss,
      onMount: (container) => {
        renderBlockedUi(container, hit, {
          onAllowOnce: close,
          onRemoveRule: () => {
            void removeRule().finally(close);
          },
          onOpenManager: () => {
            void browser.tabs.create({ url: browser.runtime.getURL('/manager.html') });
          },
        });
      },
    });

    setGuard(guard, 'lock');
    mounted.ui.mount();

    if (settings.pauseMediaOnBlock) {
      pauseMedia();
    }
  },
});
