// components/MiniChart.tsx

import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface MiniChartProps {
  data: any[];
  dataKey: string;
  color: string;
}

export default function MiniChart({ data, dataKey, color }: MiniChartProps) {
  return (
    <div className="h-24 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`color-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1E1F23', border: '1px solid #374151', borderRadius: '8px' }}
            itemStyle={{ color: '#E5E7EB' }}
            labelStyle={{ display: 'none' }}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#color-${dataKey})`} 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
