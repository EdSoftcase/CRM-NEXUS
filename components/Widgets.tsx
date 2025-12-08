
import React from 'react';
import { LucideIcon, Info } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  icon: LucideIcon;
  color: string;
  tooltip?: string; // Nova propriedade opcional
}

export const KPICard: React.FC<KPICardProps> = ({ title, value, trend, trendUp, icon: Icon, color, tooltip }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative group/card hover:shadow-md transition-all duration-200 grid grid-cols-[1fr_auto] gap-x-4 items-start">
      
      {/* Coluna 1: Título e Valor */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate" title={title}>{title}</p>
          {tooltip && (
              <div className="relative group/tooltip shrink-0">
                  <Info size={14} className="text-slate-400 dark:text-slate-500 cursor-help hover:text-blue-500 dark:hover:text-blue-400 transition-colors" />
                  {/* Tooltip Popup */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/tooltip:block w-48 p-2.5 bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none animate-fade-in border dark:border-slate-700">
                      {tooltip}
                      {/* Arrow */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-900"></div>
                  </div>
              </div>
          )}
        </div>
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white truncate" title={value}>{value}</h3>
      </div>

      {/* Coluna 2: Ícone */}
      <div className={`p-2 rounded-lg ${color} shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
      </div>

      {/* Linha 2 (Opcional): Tendência (Ocupa toda a largura) */}
      {trend && (
        <div className="col-span-2 mt-4 flex items-center text-sm pt-1">
          <span className={`font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {trendUp ? '+' : ''}{trend}
          </span>
          <span className="text-slate-400 dark:text-slate-500 ml-2 truncate">vs. mês anterior</span>
        </div>
      )}
    </div>
  );
};

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
    {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | 'purple' }> = ({ children, color = 'gray' }) => {
  const styles = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
    gray: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[color]}`}>
      {children}
    </span>
  );
};
