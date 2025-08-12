import { useState, useEffect, useCallback } from 'react';

export const useCountdown = (onFinish) => {
  const [countdown, setCountdown] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const onFinishCallback = useCallback(() => {
    if (onFinish) {
      onFinish();
    }
  }, [onFinish]);

  useEffect(() => {
    let interval = null;
    if (isActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (isActive && countdown === 0) {
      setIsActive(false);
      onFinishCallback();
    }

    return () => clearInterval(interval);
  }, [isActive, countdown, onFinishCallback]);

  const startCountdown = useCallback((seconds) => {
    setCountdown(seconds);
    setIsActive(true);
  }, []);

  const stopCountdown = useCallback(() => {
    setIsActive(false);
    setCountdown(0);
  }, []);

  return { countdown, isActive, startCountdown, stopCountdown };
};

