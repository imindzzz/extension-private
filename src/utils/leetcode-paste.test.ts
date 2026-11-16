import { describe, expect, it } from 'vitest';

import { extractMarkedCode } from './leetcode-paste';

const sample = [
  '#include <iostream>',
  '// leetcode start',
  'class Solution {};',
  '#include "debug.h" // leetcode ignore',
  '// leetcode end',
  'int main() { return 0; }',
].join('\n');

describe('extractMarkedCode', () => {
  it('只保留 start 与 end 之间的非 ignore 行', () => {
    const { matched, code } = extractMarkedCode(sample);
    expect(matched).toBe(true);
    expect(code).toBe('class Solution {};');
  });

  it('未命中标记时原样返回，交由调用方放弃干预', () => {
    const plain = 'a\nb';
    expect(extractMarkedCode(plain)).toEqual({ matched: false, code: plain });
  });

  it('缺少 end 标记时取到末尾', () => {
    const { code } = extractMarkedCode(['// leetcode start', 'x', 'y'].join('\n'));
    expect(code).toBe('x\ny');
  });

  it('保留缩进与空行', () => {
    const input = ['// leetcode start', 'function a() {', '', '  return 1;', '}', '// leetcode end'].join('\n');
    expect(extractMarkedCode(input).code).toBe('function a() {\n\n  return 1;\n}');
  });
});
