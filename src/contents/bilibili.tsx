import styleText from 'data-text:./bilibili.scss';
import type { PlasmoCSConfig, PlasmoGetOverlayAnchor, PlasmoGetStyle } from 'plasmo';
import React, { useEffect, useState } from 'react';

import secondToTime from '~utils/secondToTime';

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement('style');
  style.textContent = styleText;
  return style;
};

export const config: PlasmoCSConfig = {
  run_at: 'document_end',
  matches: ['https://www.bilibili.com/video*'],
};

export const getOverlayAnchor: PlasmoGetOverlayAnchor = () => document.querySelector('#multi_page');

export const getShadowHostId = () => 'extension-private-bilibili-id';

const PlasmoInline = () => {
  const [current, setCurrent] = useState<number>(undefined);
  const [sum, setSum] = useState<number>(undefined);
  useEffect(() => {
    const timer = setInterval(() => {
      const elVideoList = document.querySelector('#multi_page > .cur-list >.list-box');
      if (!elVideoList) return;
      const elVideoLiList = elVideoList.querySelectorAll('li');
      if (!elVideoLiList || elVideoLiList.length === 0) return;

      const durationList = [];
      let currentDuration = 0;
      const elVideoActive = elVideoList.querySelector('li.on');
      if (!elVideoActive) return;

      for (let i = 0; i < elVideoLiList.length; i++) {
        const elVideoLi = elVideoLiList[i];
        const elDuration = elVideoLi.querySelector('.duration');
        if (!elDuration) return;
        const duration = elDuration?.innerHTML.split(':');
        const durationSecond = duration.reduce((pre, current, index) => {
          return pre + parseInt(current, 10) * Math.pow(60, duration.length - index - 1);
        }, 0);
        durationList.push(durationSecond);
      }
      const sumDuration = durationList.reduce((a, b) => a + b, 0);
      setSum(sumDuration);

      for (let i = 0; i < elVideoLiList.length; i++) {
        const elVideoLi = elVideoLiList[i];
        currentDuration += durationList[i];
        if (elVideoLi === elVideoActive) {
          break;
        }
      }
      setCurrent(currentDuration);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const handleIncreasePalyRate = () => {
    const elVideo = document.querySelector('video');
    if (!elVideo) return;
    elVideo.playbackRate += 1;
  };

  if (sum === undefined) {
    return null;
  }
  return (
    <div className="main">
      <span className="time">{secondToTime(current)} / </span>
      <span className="time">{secondToTime(sum)} </span>
      <span className="percent">{((current / sum) * 100).toFixed(2)}% </span>
      <button onClick={handleIncreasePalyRate}>+1 speed</button>
    </div>
  );
};
export default PlasmoInline;
