import { Pause, Volume2 } from 'lucide-react';

interface AudioPlayButtonProps {
  audioSrc: string;
  isPlaying: boolean;
  onToggle: (src: string) => void;
  label?: string;
}

export default function AudioPlayButton({ audioSrc, isPlaying, onToggle, label = '播放讲解' }: AudioPlayButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(audioSrc)}
      aria-label={isPlaying ? '停止播放' : label}
      title={isPlaying ? '停止播放' : label}
      style={{
        flexShrink: 0,
        width: 42,
        height: 42,
        borderRadius: '50%',
        border: `1.5px solid ${isPlaying ? 'var(--kid-blue-400)' : 'var(--kid-blue-200)'}`,
        background: isPlaying ? 'var(--kid-blue-400)' : '#fff',
        color: isPlaying ? '#fff' : 'var(--kid-blue-500)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: isPlaying ? '0 4px 14px rgba(33,133,208,0.3)' : '0 3px 10px rgba(33,133,208,0.12)',
        transition: 'all 0.18s ease',
      }}
    >
      {isPlaying ? <Pause size={19} fill="currentColor" /> : <Volume2 size={20} />}
    </button>
  );
}
