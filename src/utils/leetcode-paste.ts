export interface MarkerExtraction {
  /** 是否命中 `leetcode start` 标记；未命中时 `code` 为原文，调用方应放弃干预 */
  matched: boolean;
  code: string;
}

const START_MARK = 'leetcode start';
const END_MARK = 'leetcode end';
const IGNORE_MARK = 'leetcode ignore';

/**
 * 从粘贴内容中只保留 `leetcode start` 与 `leetcode end` 之间的代码，
 * 并剔除带 `leetcode ignore` 的行（通常是本地调试用的测试用例与输出）。
 *
 * @see https://github.com/imindzzz/leetcode/blob/master/best-poker-hand/main.cpp
 */
export function extractMarkedCode(text: string): MarkerExtraction {
  const lines = text.split('\n');
  const kept: string[] = [];
  let matched = false;

  for (const line of lines) {
    if (!matched) {
      if (line.includes(START_MARK)) matched = true;
      continue;
    }
    if (line.includes(END_MARK)) break;
    if (line.includes(IGNORE_MARK)) continue;
    kept.push(line);
  }

  return matched ? { matched, code: kept.join('\n') } : { matched, code: text };
}
