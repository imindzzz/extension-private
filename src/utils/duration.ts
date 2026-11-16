/**
 * B 站分 P 列表的时长文本形如 `12:34` 或 `1:02:03`，统一解析成秒。
 * 解析失败返回 `null`，交给调用方决定跳过还是中断。
 */
export function parseDurationToSeconds(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length === 0 || parts.length > 3) return null;

  let seconds = 0;
  for (const part of parts) {
    const value = Number.parseInt(part, 10);
    if (Number.isNaN(value) || value < 0) return null;
    seconds = seconds * 60 + value;
  }
  return seconds;
}

/**
 * 秒 → `hh:mm:ss`，用于展示。
 */
export function formatSeconds(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * 播放列表总时长。
 */
export function sumDurations(durations: readonly number[]): number {
  return durations.reduce((total, duration) => total + duration, 0);
}

/**
 * 当前这一 P 之前已经看完的累计时长。
 *
 * 注意边界：`activeIndex` 指向正在播放的那一项，它自己尚未看完，
 * 因此只累加它之前的项。传入越界索引时按「大于等于列表长度即为全部看完」处理。
 */
export function sumWatchedBefore(durations: readonly number[], activeIndex: number): number {
  const end = Math.min(Math.max(activeIndex, 0), durations.length);
  let total = 0;
  for (let i = 0; i < end; i++) {
    total += durations[i] ?? 0;
  }
  return total;
}
