'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Commercial', value: 65, color: '#E11D48' },
  { name: 'Editorial',   value: 20, color: '#1A1A1A' },
  { name: 'Internal',    value: 15, color: '#D4D4D8' },
];

export function RightsDistribution() {
  return (
    <div className="bento-card p-8 flex flex-col gap-6">
      <div className="space-y-1">
        <h3 className="font-display font-black uppercase text-sm tracking-tight text-brand-text">Leakage by Rights Tier</h3>
        <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Revenue Impact Distribution</p>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
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
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-brand-muted">{item.name}</span>
            </div>
            <span className="text-brand-text">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
