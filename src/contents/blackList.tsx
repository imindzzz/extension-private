import type { PlasmoCSConfig } from 'plasmo';
import React from 'react';

export const config: PlasmoCSConfig = {
  run_at: 'document_start',
  // world: 'ISOLATED',
  matches: ['<all_urls>'],
};

// export const getInlineAnchor: PlasmoGetInlineAnchor = () => document.querySelector('#supercharge > h3 > span');
// export const getShadowHostId = () => 'extension-private-copy-with-title-id';
const PlasmoInline = () => {
  return <span></span>;
};
export default PlasmoInline;

console.log('blackList.tsx', location.href);
