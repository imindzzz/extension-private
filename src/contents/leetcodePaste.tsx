import type { PlasmoCSConfig } from 'plasmo';
import React from 'react';

/**
 * 粘贴到 leetcode 的代码，自动剔除多余代码，如测试用例和输出。
 * 只保留 以 leetcode start 开始，leetcode end 结束。剔除 leetcode ignore
 * 如 https://github.com/imindzzz/leetcode/blob/master/best-poker-hand/main.cpp
 */
export const config: PlasmoCSConfig = {
  run_at: 'document_end',
  // world: 'ISOLATED',
  matches: ['https://leetcode.cn/problems/*'],
};

// export const getInlineAnchor: PlasmoGetInlineAnchor = () => document.querySelector('#supercharge > h3 > span');
// export const getShadowHostId = () => 'extension-private-copy-with-title-id';
const PlasmoInline = () => {
  return <span></span>;
};
export default PlasmoInline;

document.addEventListener(
  'paste',
  (event) => {
    console.log('paste', event);
    const content = event.clipboardData.getData('text');
    const lines = content.split('\n');
    const resultLines: string[] = [];
    let isStart = false; // 是否需要处理粘贴的内容

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!isStart && line.includes('leetcode start')) {
        isStart = true;
        continue;
      }
      if (!isStart) continue;

      if (line.includes('leetcode ignore')) continue;
      if (line.includes('leetcode end')) break;

      resultLines.push(line);
    }

    console.log(isStart ? resultLines.join('\n') : content);

    // 从未开始的不处理
    if (isStart && (event.target as HTMLTextAreaElement).className.includes('monaco')) {
      event.stopPropagation();
      event.preventDefault();
      // const selection = window.getSelection();
      // if (!selection.rangeCount) return false;
      // selection.deleteFromDocument();
      // selection.getRangeAt(0).insertNode(document.createTextNode(resultLines.join('\n')));
      // (event.target as HTMLTextAreaElement).value = resultLines.join('\n');

      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', resultLines.join('\n'));
      event.target.dispatchEvent(new ClipboardEvent('paste', { clipboardData: clipboardData }));
    }
  },
  { capture: true }
);

// const handleKeyPress = async (e: KeyboardEvent) => {
//   if (e.key === 'v' && e.ctrlKey) {
//     e.stopPropagation();
//     e.preventDefault();
//   }
// };
// window.addEventListener('keydown', handleKeyPress, { capture: true });
