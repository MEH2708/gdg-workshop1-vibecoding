import React, { useEffect, useState } from 'react';
import { audioEngine, Track } from '../services/audioEngine';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Radio, 
  Activity
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';

interface MusicPlayerProps {
  onOpenPlaylist?: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({ onOpenPlaylist }) => {
  const [currentTrack, setCurrentTrack] = useState<Track>(audioEngine.getCurrentTrack());
  const [isPlaying, setIsPlaying] = useState(audioEngine.getIsPlaying());
  const [volume, setVolume] = useState(audioEngine.getVolume());
  const [isMuted, setIsMuted] = useState(audioEngine.getIsMuted());
  const [currentTime, setCurrentTime] = useState(audioEngine.getCurrentTime());
  const [showEq, setShowEq] = useState(true);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() => {
      setCurrentTrack(audioEngine.getCurrentTrack());
      setIsPlaying(audioEngine.getIsPlaying());
      setVolume(audioEngine.getVolume());
      setIsMuted(audioEngine.getIsMuted());
      setCurrentTime(audioEngine.getCurrentTime());
    });
    return unsubscribe;
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioEngine.seek(val);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    audioEngine.setVolume(val);
  };

  const progressPercent = Math.min(100, (currentTime / (currentTrack.duration || 1)) * 100);

  return (
    <footer className="w-full bg-black border-t-2 border-cyan-400 px-4 py-2.5 z-40 font-terminal shadow-[0px_-2px_0px_#ff007f]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Track Information with Glitch Art Cover */}
        <div className="flex items-center gap-3 w-full md:w-80 shrink-0">
          <div className="relative w-12 h-12 bg-black border-2 border-cyan-400 shrink-0 shadow-[2px_2px_0px_#ff007f] overflow-hidden group">
            <img
              src={currentTrack.coverArt}
              alt={currentTrack.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover image-rendering-pixelated"
            />
            {isPlaying && (
              <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#ff007f] border border-black animate-ping" />
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-pixel font-bold text-white truncate tracking-tight glitch-text-sm">
                {currentTrack.title}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-cyan-400 font-terminal tracking-wider truncate mt-0.5">
              <span>{currentTrack.genre}</span>
              <span className="text-[#ff007f]">::</span>
              <span>{currentTrack.bpm}_BPM</span>
            </div>
          </div>
        </div>

        {/* Center: Playback Controls & Hard Pixel Scrubber */}
        <div className="flex flex-col items-center w-full max-w-xl">
          <div className="flex items-center gap-4 mb-1 font-pixel">
            <button
              onClick={() => audioEngine.skipPrev()}
              title="PREVIOUS_SECTOR"
              className="p-1.5 pixel-btn bg-black text-cyan-400 cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => audioEngine.togglePlay()}
              title={isPlaying ? 'HALT_CARRIER' : 'INITIALIZE_CARRIER'}
              className="px-4 py-1.5 text-xs pixel-btn-magenta bg-[#ff007f] text-white font-pixel font-bold flex items-center gap-1.5 cursor-pointer shadow-[3px_3px_0px_#00f0ff]"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>HALT_STREAM</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>INIT_STREAM</span>
                </>
              )}
            </button>

            <button
              onClick={() => audioEngine.skipNext()}
              title="NEXT_SECTOR"
              className="p-1.5 pixel-btn bg-black text-cyan-400 cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Scrubber Line */}
          <div className="w-full flex items-center gap-2 font-mono text-xs">
            <span className="text-cyan-400 tabular-nums w-12 text-right">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1 flex items-center py-1">
              <div className="w-full h-2 bg-slate-900 border border-cyan-400/60 relative overflow-hidden">
                <div
                  className="h-full bg-cyan-400"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <input
                type="range"
                min={0}
                max={currentTrack.duration}
                step={0.5}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>

            <span className="text-slate-400 tabular-nums w-12 text-left">
              {formatTime(currentTrack.duration)}
            </span>
          </div>
        </div>

        {/* Right: Modulation matrix toggle & Volume */}
        <div className="flex items-center justify-end gap-3 w-full md:w-80 shrink-0 font-pixel">
          <button
            onClick={() => setShowEq(!showEq)}
            title="MODULATION_DRAWER"
            className={`p-1.5 pixel-btn text-xs ${
              showEq ? 'bg-cyan-400 text-black font-bold' : 'bg-black text-slate-400'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>

          {onOpenPlaylist && (
            <button
              onClick={onOpenPlaylist}
              className="px-2.5 py-1 text-[11px] pixel-btn bg-black text-cyan-400 font-pixel"
            >
              QUEUE [3]
            </button>
          )}

          <div className="flex items-center gap-1.5 font-terminal text-sm">
            <button
              onClick={() => audioEngine.toggleMute()}
              className="p-1 text-slate-400 hover:text-cyan-400"
              title={isMuted ? 'UNMUTE_AUDIO' : 'MUTE_AUDIO'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-[#ff007f]" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1.5 bg-slate-800 accent-[#ff007f] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {showEq && (
        <div className="max-w-xl mx-auto mt-2 pt-2 border-t border-cyan-400/40">
          <AudioVisualizer currentTrack={currentTrack} isPlaying={isPlaying} compact />
        </div>
      )}
    </footer>
  );
};
