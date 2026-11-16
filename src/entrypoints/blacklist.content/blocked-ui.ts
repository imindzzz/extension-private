import type { BlacklistRule } from '@/lib/types';

export interface BlockedUiHandlers {
  /** 本次放行，刷新后继续拦截 */
  onAllowOnce: () => void;
  /** 删除命中的那条规则 */
  onRemoveRule: () => void;
  onOpenManager: () => void;
}

/**
 * 拦截页。刻意不引入 React：这个脚本注入到所有页面，体积直接影响每次导航的开销。
 */
export function renderBlockedUi(container: HTMLElement, rule: BlacklistRule, handlers: BlockedUiHandlers): void {
  container.replaceChildren();

  const wrap = document.createElement('div');
  wrap.className = 'blocked';

  const card = document.createElement('div');
  card.className = 'blocked__card';

  const badge = document.createElement('p');
  badge.className = 'blocked__badge';
  badge.textContent = '已拦截';

  const host = document.createElement('h1');
  host.className = 'blocked__host';
  host.textContent = location.hostname;

  const desc = document.createElement('p');
  desc.className = 'blocked__desc';
  desc.textContent = `命中黑名单规则：${rule.domain}`;

  const actions = document.createElement('div');
  actions.className = 'blocked__actions';

  const allowOnce = document.createElement('button');
  allowOnce.type = 'button';
  allowOnce.className = 'blocked__btn blocked__btn--primary';
  allowOnce.textContent = '本次仍要访问';
  allowOnce.addEventListener('click', handlers.onAllowOnce);

  const removeRule = document.createElement('button');
  removeRule.type = 'button';
  removeRule.className = 'blocked__btn';
  removeRule.textContent = '移出黑名单';
  removeRule.addEventListener('click', handlers.onRemoveRule);

  const manager = document.createElement('button');
  manager.type = 'button';
  manager.className = 'blocked__btn';
  manager.textContent = '打开管理界面';
  manager.addEventListener('click', handlers.onOpenManager);

  actions.append(allowOnce, removeRule, manager);
  card.append(badge, host, desc, actions);
  wrap.append(card);
  container.append(wrap);
}
