export type RuleSource = 'popup' | 'context-menu' | 'manager' | 'import';

export interface BlacklistRule {
  id: string;
  /**
   * 域名模式，只看主机名，不含协议与路径。
   * - `example.com`：精确匹配该域名
   * - `*.example.com`：匹配所有子域（不含 `example.com` 本身）
   * - `example.*`：`*` 可以出现在任意位置
   */
  domain: string;
  source: RuleSource;
  createdAt: number;
}

export type CopyFormat = 'title-url' | 'markdown' | 'url';

export interface Settings {
  /** Alt + C 复制成什么格式 */
  copyFormat: CopyFormat;
  /** B 站倍速按钮每次增加的步长 */
  playbackStep: number;
  /** 黑名单总开关 */
  blacklistEnabled: boolean;
  /** 命中后是否暂停页面上的音视频 */
  pauseMediaOnBlock: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  copyFormat: 'title-url',
  playbackStep: 1,
  blacklistEnabled: true,
  pauseMediaOnBlock: true,
};

export const COPY_FORMAT_LABELS: Record<CopyFormat, string> = {
  'title-url': '标题 + 链接',
  markdown: 'Markdown 链接',
  url: '仅链接',
};
