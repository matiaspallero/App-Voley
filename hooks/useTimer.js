import { useState, useEffect, useCallback } from 'react';

export const useTimer = (initialTime = 0) => {
  const [time, setTime] = useState(initialTime);
  const [isActive, setIsActive] = useState(false);

  const startTimer = useCallback(() => setIsActive(true), []);
  const pauseTimer = useCallback(() => setIsActive(false), []);

  useEffect(() => {
    let interval = null;
    if (isActive) {
      interval = setInterval(() => {
        setTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const toggleTimer = useCallback(() => {
    setIsActive(prev => !prev); // This remains for the manual play/pause button
  }, []);

  const resetTimer = useCallback(() => {
    setTime(0);
    setIsActive(false);
  }, []);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return { time, isActive, toggleTimer, resetTimer, setTime, formatTime, startTimer, pauseTimer };
};
