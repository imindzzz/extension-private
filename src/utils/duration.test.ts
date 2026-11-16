import { describe, expect, it } from 'vitest';

import { formatSeconds, parseDurationToSeconds, sumDurations, sumWatchedBefore } from './duration';

describe('parseDurationToSeconds', () => {
  it('解析 mm:ss', () => {
    expect(parseDurationToSeconds('12:34')).toBe(754);
    expect(parseDurationToSeconds('03:09')).toBe(189);
    expect(parseDurationToSeconds('00:00')).toBe(0);
  });

  it('解析 h:mm:ss', () => {
    expect(parseDurationToSeconds('1:02:03')).toBe(3723);
    expect(parseDurationToSeconds('10:00:00')).toBe(36000);
  });

  it('容忍前后空白', () => {
    expect(parseDurationToSeconds('  12:34 ')).toBe(754);
  });

  it('无法解析时返回 null', () => {
    expect(parseDurationToSeconds('')).toBeNull();
    expect(parseDurationToSeconds('ab:cd')).toBeNull();
    expect(parseDurationToSeconds('-1:30')).toBeNull();
    expect(parseDurationToSeconds('1:2:3:4')).toBeNull();
  });
});

describe('formatSeconds', () => {
  it('补零到 hh:mm:ss', () => {
    expect(formatSeconds(0)).toBe('00:00:00');
    expect(formatSeconds(754)).toBe('00:12:34');
    expect(formatSeconds(3723)).toBe('01:02:03');
  });

  it('超过 24 小时不进位成天', () => {
    expect(formatSeconds(90061)).toBe('25:01:01');
  });

  it('负数收敛到 0', () => {
    expect(formatSeconds(-5)).toBe('00:00:00');
  });
});

describe('sumDurations', () => {
  it('累加全部时长', () => {
    expect(sumDurations([100, 200, 300])).toBe(600);
    expect(sumDurations([])).toBe(0);
  });
});

describe('sumWatchedBefore', () => {
  const durations = [100, 200, 300];

  it('第一项时已看时长为 0（不含当前项自身）', () => {
    expect(sumWatchedBefore(durations, 0)).toBe(0);
  });

  it('只累加当前项之前的项', () => {
    expect(sumWatchedBefore(durations, 1)).toBe(100);
    expect(sumWatchedBefore(durations, 2)).toBe(300);
  });

  it('越界索引收敛到边界', () => {
    expect(sumWatchedBefore(durations, -1)).toBe(0);
    expect(sumWatchedBefore(durations, durations.length)).toBe(600);
    expect(sumWatchedBefore(durations, 99)).toBe(600);
  });
});
