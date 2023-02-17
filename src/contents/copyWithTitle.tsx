import type { PlasmoCSConfig } from 'plasmo';
import React from 'react';

import copyToClipboard from '~utils/copyToClipboard';

export const config: PlasmoCSConfig = {
  run_at: 'document_end',
  // world: 'ISOLATED',
  matches: ['<all_urls>'],
};

// export const getInlineAnchor: PlasmoGetInlineAnchor = () => document.querySelector('#supercharge > h3 > span');
// export const getShadowHostId = () => 'extension-private-copy-with-title-id';
const PlasmoInline = () => {
  return <span></span>;
};
export default PlasmoInline;

const handleKeyPress = async (e: KeyboardEvent) => {
  if (e.key === 'c' && e.altKey) {
    const text = `${document.title}\n${location.href}`;
    console.log('copying\n', text);
    copyToClipboard(text);
  }
};
window.addEventListener('keydown', handleKeyPress);
