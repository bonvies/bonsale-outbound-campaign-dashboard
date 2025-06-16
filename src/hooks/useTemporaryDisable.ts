import { useState, useCallback, useRef, useEffect } from 'react';

export default function useTemporaryDisable<T extends string | number | symbol = string>(timeout = 1000) {
  const [disabledMap, setDisabledMap] = useState<Record<T, boolean>>({} as Record<T, boolean>);
  const timerRef = useRef<Record<T, number>>({} as Record<T, number>);
  const timers = timerRef.current;

  const triggerDisable = useCallback((key: T) => {
    setDisabledMap(prev => ({ ...prev, [key]: true }));
    if (timerRef.current[key]) {
      clearTimeout(timerRef.current[key]);
    }
    timerRef.current[key] = window.setTimeout(() => {
      setDisabledMap(prev => ({ ...prev, [key]: false }));
      delete timerRef.current[key];
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    return () => {
      // 清理所有 timeout
      Object.values(timers).forEach(id => clearTimeout(id as number));
    };
  }, [timers]);

  return { disabledMap, triggerDisable };
}