/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SnakeGame } from './components/SnakeGame';
import { MusicPlayer } from './components/MusicPlayer';
import { TrackList } from './components/TrackList';
import { AudioVisualizer } from './components/AudioVisualizer';
import { audioEngine, Track, TRACKS } from './services/audioEngine';
import { 
  Play, 
  Pause, 
  Disc, 
  Terminal, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  Radio, 
  Sparkles,
  HelpCircle,
  Binary
} from 'lucide-react';

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<Track>(audioEngine.getCurrentTrack());
  const [isPlaying, setIsPlaying] = useState(audioEngine.getIsPlaying());
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() => {
      setCurrentTrack(audioEngine.getCurrentTrack());
      setIsPlaying(audioEngine.getIsPlaying());
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen bg-[#030305] text-[#e0f2fe] flex flex-col justify-between cyber-glitch-grid static-noise selection:bg-[#ff007f] selection:text-white">
      {/* 
        Top Bar: 1-line Wordmark, Nav links, 1 Primary Action
        Glitch Art visual style with Cyan vs Magenta contrasts and raw pixelated fonts
      */}
      <header className="flex items-center justify-between gap-6 px-6 py-3 border-b-2 border-cyan-400 bg-black sticky top-0 z-40 shadow-[0_2px_0px_#ff007f]">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/"
            className="text-base md:text-lg font-pixel font-bold text-white tracking-widest flex items-center gap-2 whitespace-nowrap glitch-text"
          >
            <span className="w-2.5 h-2.5 bg-[#ff007f] shadow-[1px_1px_0px_#00f0ff] animate-ping" />
            CYBER//NULL_0x7D
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 font-terminal text-sm tracking-wider text-slate-300">
          <a
            href="#arena"
            className="hover:text-cyan-400 hover:glitch-text transition-colors whitespace-nowrap shrink-0"
          >
            [EXEC_ARENA]
          </a>
          <button
            onClick={() => setIsPlaylistOpen(true)}
            className="hover:text-[#ff007f] hover:glitch-text transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            [DSP_QUEUE]
          </button>
          <button
            onClick={() => setShowHowToPlay(true)}
            className="hover:text-cyan-400 hover:glitch-text transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            [MANUAL_0x00]
          </button>
          <a
            href="#visualizer"
            className="hover:text-[#ff007f] hover:glitch-text transition-colors whitespace-nowrap shrink-0"
          >
            [SPECTRUM_BUS]
          </a>
        </nav>

        {/* Zone 3: Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0 font-pixel">
          <button
            onClick={() => audioEngine.togglePlay()}
            className={`px-3 py-1.5 text-xs font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
              isPlaying
                ? 'pixel-btn-magenta bg-[#ff007f] text-white shadow-[2px_2px_0px_#00f0ff]'
                : 'pixel-btn bg-cyan-400 text-black shadow-[2px_2px_0px_#ff007f]'
            }`}
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
        </div>
      </header>

      {/* Main Glitch Art Experience Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-5 md:py-6 flex flex-col justify-center">
        {/* 3-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Sector Audio Monitor & Realtime Oscilloscope */}
          <section className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-3 bg-black border-2 border-cyan-400 p-3.5 shadow-[4px_4px_0px_#ff007f] font-terminal">
            <div className="flex items-center justify-between border-b border-cyan-400/40 pb-1.5">
              <span className="text-xs uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-[#ff007f]" />
                CARRIER_BUS://CURRENT
              </span>
              <button
                onClick={() => setIsPlaylistOpen(true)}
                className="text-xs text-[#ff007f] hover:text-white font-pixel underline cursor-pointer"
              >
                QUEUE [3]
              </button>
            </div>

            {/* Album Cover Art with Glitch Border */}
            <div className="relative aspect-square w-full bg-black border-2 border-[#ff007f] overflow-hidden group shadow-[2px_2px_0px_#00f0ff]">
              <img
                src={currentTrack.coverArt}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover image-rendering-pixelated group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2.5">
                <h3 className="text-sm font-pixel font-bold text-white tracking-tight glitch-text-sm">
                  {currentTrack.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-cyan-400 font-terminal mt-0.5">
                  <span>{currentTrack.genre}</span>
                  <span className="text-[#ff007f]">::</span>
                  <span>{currentTrack.bpm} BPM</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-terminal">
              {currentTrack.description}
            </p>

            {/* Live Audio Visualizer */}
            <div id="visualizer" className="pt-2 border-t border-cyan-400/40">
              <AudioVisualizer currentTrack={currentTrack} isPlaying={isPlaying} />
            </div>

            {/* Machine Memory Tags */}
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-800 text-xs font-terminal text-cyan-400">
              {currentTrack.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-black border border-cyan-400/60"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </section>

          {/* Center Stage: The Snake Game Execution Matrix */}
          <section id="arena" className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-center">
            <SnakeGame />
          </section>

          {/* Right: Memory Banks & Machine Rules */}
          <section className="lg:col-span-3 order-3 flex flex-col gap-3 bg-black border-2 border-cyan-400 p-3.5 shadow-[4px_4px_0px_#ff007f] font-terminal">
            <div className="flex items-center justify-between border-b border-cyan-400/40 pb-1.5">
              <span className="text-xs uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#ff007f]" />
                SYSTEM_PROTOCOLS
              </span>
              <span className="text-xs font-mono text-slate-500">REV: 0x9A</span>
            </div>

            {/* Protocol breakdown */}
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-black border border-cyan-400/60 flex items-start gap-2">
                <div className="w-2.5 h-2.5 bg-cyan-400 mt-1 shrink-0 shadow-[1px_1px_0px_#ff007f]" />
                <div>
                  <div className="font-pixel text-[11px] font-bold text-white">CYAN_DATA_CORE</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    Accumulates +100 raw score. Increments snake segment array length.
                  </div>
                </div>
              </div>

              <div className="p-2 bg-black border border-[#ff007f]/80 flex items-start gap-2 shadow-[2px_2px_0px_#00f0ff]">
                <div className="w-2.5 h-2.5 bg-[#ff007f] mt-1 shrink-0 shadow-[1px_1px_0px_#00f0ff] animate-ping" />
                <div>
                  <div className="font-pixel text-[11px] font-bold text-[#ff007f]">OVERDRIVE_TRANSIENT</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    Decays in 8.5s! Awards +350 pts & locks bus in 2X multiplier clock.
                  </div>
                </div>
              </div>

              <div className="p-2 bg-black border border-cyan-400/60 flex items-start gap-2">
                <div className="w-2.5 h-2.5 bg-white mt-1 shrink-0" />
                <div>
                  <div className="font-pixel text-[11px] font-bold text-cyan-400">RHYTHMIC_SYNAPSE</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    Matrix perimeter jitters to the low-frequency kick drum of the active DSP.
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware Interrupts */}
            <div className="pt-2 border-t border-cyan-400/40">
              <h4 className="text-xs font-pixel uppercase tracking-wider text-cyan-400 mb-1.5">
                INTERRUPTS
              </h4>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-terminal">
                <div className="flex items-center justify-between px-1.5 py-0.5 bg-black border border-slate-800">
                  <span className="text-slate-500">VECTORS</span>
                  <span className="text-cyan-400">W-A-S-D</span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-0.5 bg-black border border-slate-800">
                  <span className="text-slate-500">HALT</span>
                  <span className="text-cyan-400">SPACE</span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-0.5 bg-black border border-slate-800">
                  <span className="text-slate-500">REBOOT</span>
                  <span className="text-cyan-400">R</span>
                </div>
                <div className="flex items-center justify-between px-1.5 py-0.5 bg-black border border-slate-800">
                  <span className="text-slate-500">MUTE</span>
                  <span className="text-cyan-400">M</span>
                </div>
              </div>
            </div>

            {/* DSP Carrier Jump Table */}
            <div className="pt-2 border-t border-cyan-400/40">
              <h4 className="text-xs font-pixel uppercase tracking-wider text-cyan-400 mb-1.5">
                CARRIER_PRESETS
              </h4>
              <div className="space-y-1">
                {TRACKS.map((t, index) => {
                  const isActive = currentTrack.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        audioEngine.setTrackIndex(index);
                        if (!isPlaying) audioEngine.play();
                      }}
                      className={`w-full text-left px-2 py-1 text-xs font-terminal flex items-center justify-between transition-colors cursor-pointer border ${
                        isActive
                          ? 'bg-cyan-400 text-black border-cyan-400 font-bold'
                          : 'bg-black text-slate-400 border-slate-800 hover:border-cyan-400 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-[10px] tabular-nums shrink-0">
                        {t.bpm} BPM
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Persistent Bottom Glitch Music Player Dock */}
      <MusicPlayer onOpenPlaylist={() => setIsPlaylistOpen(true)} />

      {/* Track Queue Modal */}
      <TrackList
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
      />

      {/* Machine Manual Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs font-terminal">
          <div className="w-full max-w-md bg-black border-2 border-cyan-400 p-5 shadow-[5px_5px_0px_#ff007f]">
            <h3 className="text-lg font-pixel font-bold text-white mb-2 glitch-text">
              SYSTEM_MANUAL://OP_GUIDE
            </h3>
            <div className="space-y-2.5 text-xs text-slate-300 font-terminal leading-normal">
              <p>
                <strong>0x01 DIRECTIVE:</strong> Navigate the digital entity across the matrix memory array. Consume Cyan energy cores to extend segment buffers.
              </p>
              <p>
                <strong>0x02 INPUT BUS:</strong> Steer with Arrow Keys or W-A-S-D. On-screen directional buttons provide manual override.
              </p>
              <p>
                <strong>0x03 OVERDRIVE:</strong> Transient Magenta cores spawn periodically. Harvest before decay to engage double clock multiplier.
              </p>
              <p>
                <strong>0x04 DSP AUDIO ENGINE:</strong> Multi-voice synthesizer runs in real time via Web Audio API. Equalizer and oscilloscope reflect live harmonic frequencies.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowHowToPlay(false)}
                className="px-4 py-1.5 pixel-btn bg-cyan-400 text-black font-pixel font-bold text-xs cursor-pointer"
              >
                RETURN_TO_MATRIX
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
