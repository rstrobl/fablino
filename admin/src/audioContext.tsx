import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from 'react';

interface AudioCtx {
  storyId: string | null;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  load: (storyId: string, title: string) => void;
  play: (storyId: string, title: string) => void;
  stop: () => void;
  togglePlay: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  volume: number;
}

const Ctx = createContext<AudioCtx>(null!);
export const useAudio = () => useContext(Ctx);

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  const load = useCallback((id: string, t: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current!.currentTime);
      });
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current!.duration);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }
    // Only load if different story
    if (storyId !== id) {
      audioRef.current.src = `/api/audio/${id}?t=${Date.now()}`;
      audioRef.current.volume = volume;
      setStoryId(id);
      setTitle(t);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [volume, storyId]);

  const play = useCallback((id: string, t: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current!.currentTime);
      });
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current!.duration);
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }
    const audio = audioRef.current;
    audio.src = `/api/audio/${id}?t=${Date.now()}`;
    audio.volume = volume;
    audio.play();
    setStoryId(id);
    setTitle(t);
    setIsPlaying(true);
  }, [volume]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setStoryId(null);
    setTitle('');
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((t: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = t;
    setCurrentTime(t);
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  return (
    <Ctx.Provider value={{ storyId, title, isPlaying, currentTime, duration, load, play, stop, togglePlay, seek, setVolume, volume }}>
      {children}
    </Ctx.Provider>
  );
}
