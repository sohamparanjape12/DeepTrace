'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { day: 'Mon', detections: 12, resolutions: 8 },
  { day: 'Tue', detections: 18, resolutions: 12 },
  { day: 'Wed', detections: 11, resolutions: 14 },
  { day: 'Thu', detections: 22, resolutions: 18 },
  { day: 'Fri', detections: 19, resolutions: 22 },
  { day: 'Sat', detections: 8, resolutions: 10 },
  { day: 'Sun', detections: 5, resolutions: 7 },
];

export function TrendAnalysis() {
  return (
    <div className="bento-card p-8 min-h-[350px] h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Enforcement Pipeline</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-brand-accent" />
            <span className="text-[10px] font-black uppercase text-brand-muted">Detections</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-zinc-200" />
            <span className="text-[10px] font-black uppercase text-brand-muted">Resolved</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorDet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E11D48" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', fill: '#787774' }}
              dy={10}
            />
            <YAxis
              hide={true}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #E4E4E7',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                textTransform: 'uppercase',
                fontSize: '10px',
                fontWeight: '900'
              }}
            />
            <Area
              type="monotone"
              dataKey="detections"
              stroke="#E11D48"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDet)"
            />
            <Area
              type="monotone"
              dataKey="resolutions"
              stroke="#D4D4D8"
              strokeWidth={2}
              fillOpacity={0}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
