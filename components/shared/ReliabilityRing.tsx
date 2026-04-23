import React from 'react';

export function ReliabilityRing({ score, tier }: { score: number; tier: 'HIGH'|'MEDIUM'|'LOW' }) {
  const color = tier === 'HIGH' ? '#22C55E' : tier === 'MEDIUM' ? '#F59E0B' : '#E11D48';
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  
  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 72 72" className="w-full h-full -rotate-90">
        <circle cx="36" cy="36" r={r} strokeWidth="6" stroke="#F4F4F5" fill="none" />
        <circle 
          cx="36" cy="36" r={r} strokeWidth="6" stroke={color} fill="none"
          strokeDasharray={`${dash} ${c}`} 
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-lg font-black leading-none text-brand-text">{score}</div>
          <div className="text-[8px] font-black uppercase tracking-widest text-brand-muted">{tier}</div>
        </div>
      </div>
    </div>
  );
}
