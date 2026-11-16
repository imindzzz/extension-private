import { useCallback, useEffect, useState } from 'react';
import type { WxtStorageItem } from 'wxt/utils/storage';

/**
 * 订阅一个 storage item：首次读取 + 其他上下文（popup / content script）改动时实时同步。
 */
export function useStorageItem<TValue>(item: WxtStorageItem<TValue, Record<string, unknown>>) {
  const [value, setValue] = useState<TValue | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    void item.getValue().then((next) => {
      if (!alive) return;
      setValue(next);
      setLoaded(true);
    });

    const unwatch = item.watch((next) => {
      if (alive) setValue(next);
    });

    return () => {
      alive = false;
      unwatch();
    };
  }, [item]);

  const update = useCallback((next: TValue) => item.setValue(next), [item]);

  return { value, update, loaded };
}
