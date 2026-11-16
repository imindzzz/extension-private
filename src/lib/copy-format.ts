import type { CopyFormat } from './types';

/** Alt + C 的输出格式 */
export function formatCopyText(format: CopyFormat, title: string, url: string): string {
  switch (format) {
    case 'markdown':
      return `[${title}](${url})`;
    case 'url':
      return url;
    default:
      return `${title}\n${url}`;
  }
}
