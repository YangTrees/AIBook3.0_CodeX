import { useCallback, useEffect, useRef, useState } from 'react';

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSrc, setActiveSrc] = useState<string | null>(null);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    }
    setActiveSrc(null);
  }, []);

  const toggle = useCallback((src: string) => {
    if (activeSrc === src && audioRef.current && !audioRef.current.paused) {
      stop();
      return;
    }

    stop();
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioRef.current = audio;
    setActiveSrc(src);

    const finish = () => {
      if (audioRef.current === audio) {
        audioRef.current = null;
        setActiveSrc(null);
      }
    };
    audio.addEventListener('ended', finish, { once: true });
    audio.addEventListener('error', finish, { once: true });
    void audio.play().catch(finish);
  }, [activeSrc, stop]);

  useEffect(() => stop, [stop]);

  return { activeSrc, toggle, stop };
}
