import React from 'react';

export function ExplainabilityList({ bullets }: { bullets: string[] }) {
  if (!bullets || bullets.length === 0) return null;

  const iconOf = (s: string) => s[0];
  const rest   = (s: string) => s.slice(1).trim();
  const cls = (icon: string) =>
    icon === '✔' ? 'text-green-600' :
    icon === '⚠' ? 'text-amber-600' :
    icon === '✖' ? 'text-red-600'   :
    icon === 'ℹ' ? 'text-blue-600'  :
    icon === '→' ? 'text-brand-text font-bold' :
    'text-brand-muted';

  return (
    <ul className="space-y-2">
      {bullets.map((b, i) => (
        <li key={i} className="flex items-start gap-3 text-[11px] leading-relaxed">
          <span className={`${cls(iconOf(b))} text-sm leading-none mt-0.5 w-4 shrink-0 text-center`}>{iconOf(b)}</span>
          <span className="text-brand-text">{rest(b)}</span>
        </li>
      ))}
    </ul>
  );
}
