'use client';

// @ts-ignore
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';

interface TrendData {
  day: string;
  detections: number;
  resolutions: number;
}

interface TrendAnalysisProps {
  data?: TrendData[];
  timeRange: number;
  onTimeRangeChange: (range: number) => void;
}

export function TrendAnalysis({ data, timeRange, onTimeRangeChange }: TrendAnalysisProps) {
  const chartData = data && data.length > 0 ? data : [
    { day: 'Mon', detections: 0, resolutions: 0 },
    { day: 'Tue', detections: 0, resolutions: 0 },
    { day: 'Wed', detections: 0, resolutions: 0 },
    { day: 'Thu', detections: 0, resolutions: 0 },
    { day: 'Fri', detections: 0, resolutions: 0 },
    { day: 'Sat', detections: 0, resolutions: 0 },
    { day: 'Sun', detections: 0, resolutions: 0 },
  ];

  return (
    <div className="bento-card p-8 min-h-[400px] h-full flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Enforcement Pipeline</h3>
          <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Growth Analytics</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-brand-border pr-6">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-accent" />
              <span className="text-[10px] font-black uppercase text-brand-muted">Detections</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-muted/40" />
              <span className="text-[10px] font-black uppercase text-brand-muted">Resolved</span>
            </div>
          </div>

          <div className="flex items-center bg-brand-bg rounded-lg p-1 border border-brand-border">
            {[7, 30, 90].map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={clsx(
                  "px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded transition-all",
                  timeRange === range 
                    ? "bg-brand-surface text-brand-text shadow-sm ring-1 ring-brand-border" 
                    : "text-brand-muted hover:text-brand-text"
                )}
              >
                {range}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 pt-4">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={chartData} margin={{ left: -20 }}>
            <defs>
              <linearGradient id="colorDet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E11D48" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#E11D48" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 900, fill: '#A1A1AA' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 9, fontWeight: 900, fill: '#A1A1AA' }}
              dx={-10}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: 'var(--brand-border)', strokeWidth: 1 }}
              contentStyle={{
                borderRadius: '12px',
                backgroundColor: 'var(--brand-surface)',
                border: '1px solid var(--brand-border)',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                textTransform: 'uppercase',
                fontSize: '10px',
                fontWeight: '900',
                color: 'var(--brand-text)',
                padding: '12px'
              }}
              itemStyle={{ color: 'var(--brand-text)', padding: '2px 0' }}
            />
            <Area
              type="monotone"
              dataKey="detections"
              stroke="#E11D48"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDet)"
              animationDuration={1500}
            />
            <Area
              type="monotone"
              dataKey="resolutions"
              stroke="var(--brand-muted)"
              strokeWidth={2}
              fillOpacity={0}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
