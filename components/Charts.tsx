
import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, LabelList, Cell
} from 'recharts';

interface ChartProps {
  data: any[];
}

export const RevenueChart: React.FC<ChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
      return (
          <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 min-h-[200px]">
              <p className="text-sm">Sem dados financeiros suficientes para o gráfico.</p>
          </div>
      );
  }

  return (
    <div className="h-full w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `R$${value/1000}k`} />
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            itemStyle={{ color: '#1e293b' }}
            formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Receita']}
          />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" name="Receita" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export const PipelineFunnel: React.FC<ChartProps> = ({ data }) => {
  // Cores gradient do topo (Frio/Novo) para o fundo (Quente/Fechamento)
  const GRADIENT_IDS = ['gradNew', 'gradQual', 'gradProp', 'gradNeg', 'gradWon'];
  const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#10b981']; 

  if (!data || data.every(d => d.value === 0)) {
      return (
          <div className="h-full w-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200 min-h-[200px]">
              <p className="text-sm">O pipeline de vendas está vazio.</p>
          </div>
      );
  }

  return (
    <div className="h-full w-full min-h-[200px]">
       <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <defs>
            {GRADIENT_IDS.map((id, index) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={COLORS[index]} stopOpacity={0.6}/>
                    <stop offset="100%" stopColor={COLORS[index]} stopOpacity={1}/>
                </linearGradient>
            ))}
          </defs>
          <Tooltip 
            formatter={(value: number, name: string) => [value, name]}
            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive
          >
            <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontSize={11} fontWeight="bold"/>
             {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={`url(#${GRADIENT_IDS[index % GRADIENT_IDS.length]})`} stroke="none"/>
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
};
