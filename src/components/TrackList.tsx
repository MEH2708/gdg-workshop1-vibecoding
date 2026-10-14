import React from 'react';
import { audioEngine, TRACKS, Track } from '../services/audioEngine';
import { Play, Pause, X, Disc, Terminal } from 'lucide-react';

interface TrackListProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: Track;
  isPlaying: boolean;
}

export const TrackList: React.FC<TrackListProps> = ({
  isOpen,
  onClose,
  currentTrack,
  isPlaying,
}) => {
  if (!isOpen) return null;

  const handleSelectTrack = (index: number) => {
    audioEngine.setTrackIndex(index);
    if (!isPlaying) {
      audioEngine.play();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-terminal">
      <div 
        className="w-full max-w-lg bg-black border-2 border-cyan-400 shadow-[5px_5px_0px_#ff007f] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-cyan-400 bg-black">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#ff007f]" />
            <div>
              <h3 className="text-sm font-pixel font-bold text-white glitch-text-sm">
                SYNTH_BUFFER_INDEX://
              </h3>
              <p className="text-xs text-cyan-400 font-terminal">
                3 PROCEDURAL DSP CARRIERS IN RAM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 pixel-btn bg-black text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tracks List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {TRACKS.map((track, idx) => {
            const isCurrent = currentTrack.id === track.id;
            return (
              <div
                key={track.id}
                onClick={() => handleSelectTrack(idx)}
                className={`flex items-start gap-3 p-3 border-2 transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-[#ff007f] bg-black shadow-[3px_3px_0px_#00f0ff]'
                    : 'border-slate-800 bg-black/60 hover:border-cyan-400/80 hover:shadow-[2px_2px_0px_#ff007f]'
                }`}
              >
                {/* Thumbnail Art */}
                <div className="relative w-14 h-14 bg-black border border-cyan-400/60 shrink-0 overflow-hidden group">
                  <img
                    src={track.coverArt}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover image-rendering-pixelated"
                  />
                  <div
                    className={`absolute inset-0 flex items-center justify-center bg-black/60 ${
                      isCurrent && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isCurrent && isPlaying ? (
                      <Pause className="w-5 h-5 text-[#ff007f] fill-current" />
                    ) : (
                      <Play className="w-5 h-5 text-cyan-400 fill-current ml-0.5" />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-pixel font-bold truncate ${isCurrent ? 'text-cyan-400 glitch-text-sm' : 'text-white'}`}>
                      {track.title}
                    </h4>
                    <span className="text-xs font-mono text-slate-400 tabular-nums shrink-0">
                      [{formatTime(track.duration)}]
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 font-terminal">
                    {track.description}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-xs text-cyan-400/80 font-terminal">
                    <span className="text-[#ff007f] font-bold">{track.genre}</span>
                    <span>::</span>
                    <span>{track.bpm} BPM</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t-2 border-cyan-400 bg-black flex items-center justify-between text-xs text-slate-400 font-terminal">
          <span className="text-cyan-400">STATUS: WEB_AUDIO_DSP_ACTIVE</span>
          <button
            onClick={onClose}
            className="px-3 py-1 pixel-btn bg-black text-cyan-400 text-xs font-pixel"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
