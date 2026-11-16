import { useCallback, useEffect, useState } from 'react';

import { formatSeconds, parseDurationToSeconds, sumDurations, sumWatchedBefore } from '@/utils/duration';

interface ProgressState {
  watched: number;
  total: number;
  rate: number;
}

const LIST_SELECTOR = '#multi_page .cur-list .list-box';
const MAX_PLAYBACK_RATE = 16;

/**
 * 读取分 P 列表：每项时长 + 当前播放项的下标。
 * 任何一项时长解析失败就放弃刷新，避免展示一个错误的总时长。
 */
function readPlaylist(): { durations: number[]; activeIndex: number } | null {
  const listBox = document.querySelector(LIST_SELECTOR);
  if (!listBox) return null;

  const items = [...listBox.querySelectorAll('li')];
  if (items.length === 0) return null;

  const durations: number[] = [];
  for (const item of items) {
    const seconds = parseDurationToSeconds(item.querySelector('.duration')?.textContent ?? '');
    if (seconds === null) return null;
    durations.push(seconds);
  }

  const activeIndex = items.findIndex((item) => item.classList.contains('on'));
  if (activeIndex < 0) return null;

  return { durations, activeIndex };
}

function readProgress(): ProgressState | null {
  const playlist = readPlaylist();
  if (!playlist) return null;

  const video = document.querySelector('video');
  return {
    watched: sumWatchedBefore(playlist.durations, playlist.activeIndex),
    total: sumDurations(playlist.durations),
    rate: video?.playbackRate ?? 1,
  };
}

function Progress() {
  // 惰性初始化：首帧直接读 DOM，避免在 effect 里同步 setState 造成级联渲染
  const [state, setState] = useState<ProgressState | null>(readProgress);

  useEffect(() => {
    const timer = window.setInterval(() => setState(readProgress()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const increaseRate = useCallback(() => {
    const video = document.querySelector('video');
    if (!video) return;
    video.playbackRate = Math.min(video.playbackRate + 1, MAX_PLAYBACK_RATE);
    setState(readProgress());
  }, []);

  if (!state) return null;

  const percent = state.total > 0 ? (state.watched / state.total) * 100 : 0;

  return (
    <div className="progress">
      <span className="progress__time">
        {formatSeconds(state.watched)} / {formatSeconds(state.total)}
      </span>
      <span className="progress__percent">{percent.toFixed(2)}%</span>
      <button className="progress__action" type="button" onClick={increaseRate}>
        +1 速（{state.rate}x）
      </button>
    </div>
  );
}

export default Progress;
