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

/** 问后台「这个站点是否已本次放行」，后台没响应就按未放行处理 */
const ALLOW_QUERY_TIMEOUT_MS = 300;

const MSG_IS_ALLOWED = 'net:is-allowed';
const MSG_ALLOW = 'net:allow';
const MSG_UNBLOCK = 'net:unblock';

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
  // 看门狗可能已经把它摘掉了，这里要能重新挂回去
  if (!style.isConnected) {
    (document.head ?? document.documentElement).append(style);
  }
}

/**
 * 把宿主元素送进 top layer。
 *
 * 只设 `z-index: 2147483647` 是不够的：只要页面上任意祖先带 `transform`、`filter`、
 * `will-change` 或 `contain`，就会新建层叠上下文，`position: fixed` 也会改为相对那个
 * 祖先定位，宿主给的最大 z-index 只在这个小圈子里比较，照样被盖住。
 * top layer 由浏览器保证渲染在所有普通内容之上，且不受祖先层叠上下文影响。
 */
function promoteToTopLayer(host: HTMLElement): void {
  host.setAttribute('popover', 'manual');

  const style = host.style;
  // popover 的 UA 样式带 margin: auto / border / padding / background，逐个顶掉
  style.setProperty('position', 'fixed', 'important');
  style.setProperty('inset', '0', 'important');
  style.setProperty('width', '100%', 'important');
  style.setProperty('height', '100%', 'important');
  style.setProperty('margin', '0', 'important');
  style.setProperty('padding', '0', 'important');
  style.setProperty('border', '0', 'important');
  style.setProperty('background', 'transparent', 'important');
  style.setProperty('overflow', 'hidden', 'important');
  // 祖先若有 visibility: hidden，子元素显式声明 visible 仍可显示
  style.setProperty('visibility', 'visible', 'important');
  style.setProperty('z-index', '2147483647', 'important');

  try {
    host.showPopover();
  } catch {
    // 浏览器不支持 popover 时退回 fixed + 最高 z-index 的降级表现
  }
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

async function requestBackground(type: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await browser.runtime.sendMessage({ type, ...payload });
    return response === true;
  } catch {
    return false;
  }
}

async function isAllowedForSession(hostname: string): Promise<boolean> {
  const query = requestBackground(MSG_IS_ALLOWED, { host: hostname });
  const timeout = new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), ALLOW_QUERY_TIMEOUT_MS);
  });
  return Promise.race([query, timeout]);
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

    const hit = findMatchingRule(location.href, rules);
    if (!hit) {
      release();
      return;
    }

    // 已经点过「本次仍要访问」，allowAllRequests 规则还生效着，不要再拦一次
    if (await isAllowedForSession(location.hostname)) {
      release();
      return;
    }

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
          onAllowOnce: () => {
            void (async () => {
              const allowed = await requestBackground(MSG_ALLOW, { host: location.hostname });
              // 放行失败就只撤掉遮罩，重载会立刻又被拦，变成死循环
              if (allowed) location.reload();
              else close();
            })();
          },
          onRemoveRule: () => {
            void (async () => {
              const removed = await requestBackground(MSG_UNBLOCK, { ruleId: hit.id });
              // 规则删掉后必须重载：首次加载时子资源已经被拦掉了
              if (removed) location.reload();
              else close();
            })();
          },
          onOpenManager: () => {
            void browser.tabs.create({ url: browser.runtime.getURL('/manager.html') });
          },
        });
      },
    });

    setGuard(guard, 'lock');
    mounted.ui.mount();
    promoteToTopLayer(mounted.ui.shadowHost);
    clearTimeout(watchdog);

    if (settings.pauseMediaOnBlock) {
      pauseMedia();
    }
  },
});
