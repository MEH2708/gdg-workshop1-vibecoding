import React, { useEffect, useRef, useState } from 'react';
import { audioEngine, Track } from '../services/audioEngine';
import { Activity, BarChart2, Disc3 } from 'lucide-react';

interface AudioVisualizerProps {
  currentTrack: Track;
  isPlaying: boolean;
  compact?: boolean;
}

export type VisualizerMode = 'bars' | 'wave' | 'radial';

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  currentTrack,
  isPlaying,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisualizerMode>('bars');
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let barsPeaks: number[] = new Array(36).fill(0);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark glitch background
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal noise scanline
      const scanY = (performance.now() * 0.15) % height;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(0, scanY, width, 2);

      const analyser = audioEngine.analyser;
      let hasRealAudio = false;
      const bufferLength = analyser ? analyser.frequencyBinCount : 64;
      const dataArray = new Uint8Array(bufferLength);
      const waveArray = new Uint8Array(bufferLength);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        analyser.getByteTimeDomainData(waveArray);
        hasRealAudio = true;
      }

      const cyanColor = '#00f0ff';
      const magentaColor = '#ff007f';

      if (mode === 'bars') {
        const barCount = compact ? 22 : 32;
        const barWidth = Math.floor(width / barCount) - 2;
        const step = Math.floor(bufferLength / barCount) || 1;

        for (let i = 0; i < barCount; i++) {
          let value = 0;
          if (hasRealAudio) {
            value = dataArray[i * step] / 255;
          } else {
            const t = performance.now() * 0.004;
            value = 0.12 + Math.sin(t + i * 0.35) * 0.08;
          }

          const barHeight = Math.max(3, Math.floor(value * (height - 6)));
          const x = i * (barWidth + 2);
          const y = height - barHeight;

          if (value > (barsPeaks[i] || 0)) {
            barsPeaks[i] = value;
          } else {
            barsPeaks[i] = Math.max(0, (barsPeaks[i] || 0) - 0.02);
          }

          // Stepped raw pixel block effect
          const isMagenta = i % 2 === 1;
          ctx.fillStyle = isMagenta ? magentaColor : cyanColor;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Top peak block
          const peakY = height - Math.max(3, Math.floor((barsPeaks[i] || 0) * (height - 6)));
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, Math.max(0, peakY - 3), barWidth, 2);
        }
      } else if (mode === 'wave') {
        // Dual-line chromatic aberration wave (Cyan + Magenta offset)
        const sliceWidth = width / (bufferLength - 1);

        // Pass 1: Magenta offset
        ctx.lineWidth = 2;
        ctx.strokeStyle = magentaColor;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          let v = 0.5;
          if (hasRealAudio) {
            v = waveArray[i] / 255.0;
          } else {
            const t = performance.now() * 0.005;
            v = 0.5 + Math.sin(t + i * 0.2) * 0.15;
          }
          const y = v * height + 1.5; // slight glitch vertical offset
          const x = i * sliceWidth + 1.5; // slight horizontal offset
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Pass 2: Cyan trace
        ctx.lineWidth = 2;
        ctx.strokeStyle = cyanColor;
        ctx.beginPath();
        for (let i = 0; i < bufferLength; i++) {
          let v = 0.5;
          if (hasRealAudio) {
            v = waveArray[i] / 255.0;
          } else {
            const t = performance.now() * 0.005;
            v = 0.5 + Math.sin(t + i * 0.2) * 0.15;
          }
          const y = v * height - 1.5;
          const x = i * sliceWidth - 1.5;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (mode === 'radial') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.5;
        const count = compact ? 24 : 36;

        ctx.save();
        ctx.translate(centerX, centerY);

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          let val = 0.15;
          if (hasRealAudio) {
            val = (dataArray[i * 2] || 0) / 255;
          } else {
            const t = performance.now() * 0.004;
            val = 0.18 + Math.sin(t + i * 0.4) * 0.1;
          }

          const lineLen = 3 + val * (compact ? 18 : 30);
          const x1 = Math.cos(angle) * radius;
          const y1 = Math.sin(angle) * radius;
          const x2 = Math.cos(angle) * (radius + lineLen);
          const y2 = Math.sin(angle) * (radius + lineLen);

          ctx.strokeStyle = i % 2 === 0 ? cyanColor : magentaColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Inner polygon ring
        ctx.strokeStyle = cyanColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(-radius * 0.5, -radius * 0.5, radius, radius);
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [mode, isPlaying, currentTrack, compact]);

  return (
    <div className="relative flex flex-col items-center w-full">
      <div className="w-full flex items-center justify-between mb-1.5 px-0.5 font-terminal text-sm">
        <span className="text-cyan-400 tracking-widest uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#ff007f] inline-block animate-ping" />
          SPECTRUM_ANALYSIS://
        </span>
        <div className="flex items-center gap-1 bg-black border border-cyan-500/40 p-0.5">
          <button
            onClick={() => setMode('bars')}
            title="SPECTRAL BARS"
            className={`px-1.5 py-0.5 text-xs font-pixel transition-colors ${
              mode === 'bars' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            BARS
          </button>
          <button
            onClick={() => setMode('wave')}
            title="OSCILLOSCOPE"
            className={`px-1.5 py-0.5 text-xs font-pixel transition-colors ${
              mode === 'wave' ? 'bg-[#ff007f] text-white font-bold' : 'text-slate-400 hover:text-[#ff007f]'
            }`}
          >
            WAVE
          </button>
          <button
            onClick={() => setMode('radial')}
            title="RADIAL POLAR"
            className={`px-1.5 py-0.5 text-xs font-pixel transition-colors ${
              mode === 'radial' ? 'bg-cyan-400 text-black font-bold' : 'text-slate-400 hover:text-cyan-400'
            }`}
          >
            RING
          </button>
        </div>
      </div>

      <div className="w-full h-14 bg-black border-2 border-cyan-400/80 p-0.5 flex items-center justify-center relative overflow-hidden shadow-[2px_2px_0px_#ff007f]">
        <canvas
          ref={canvasRef}
          width={compact ? 240 : 360}
          height={compact ? 44 : 52}
          className="w-full h-full block image-rendering-pixelated"
        />
        <div className="scanline-beam" />
      </div>
    </div>
  );
};
