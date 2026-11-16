import { describe, expect, it } from 'vitest';

import { formatCopyText } from './copy-format';

const title = '示例标题';
const url = 'https://example.com/a';

describe('formatCopyText', () => {
  it('默认输出标题换行加链接', () => {
    expect(formatCopyText('title-url', title, url)).toBe('示例标题\nhttps://example.com/a');
  });

  it('markdown 输出链接语法', () => {
    expect(formatCopyText('markdown', title, url)).toBe('[示例标题](https://example.com/a)');
  });

  it('url 只输出链接', () => {
    expect(formatCopyText('url', title, url)).toBe(url);
  });

  it('标题为空时仍保持结构', () => {
    expect(formatCopyText('title-url', '', url)).toBe('\nhttps://example.com/a');
    expect(formatCopyText('markdown', '', url)).toBe('[](https://example.com/a)');
  });
});
