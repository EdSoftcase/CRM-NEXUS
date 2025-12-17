
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Badge, KPICard, SectionTitle } from '../components/Widgets';
import { HeartPulse, TrendingUp, AlertTriangle, CheckCircle, Clock, X, List, ArrowRight, Activity, Calendar, Zap, RefreshCw } from 'lucide-react';
import { Client } from '../types';
import { Client360 } from '../components/Client360';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, Legend } from 'recharts';

export const CustomerSuccess: React.FC = () => {
    const { clients, leads, tickets, invoices } = useData();
    const [selectedMetric, setSelectedMetric] = useState<'HEALTH' | 'NPS' | 'RISK' | 'ONBOARDING' | null>(null);
    
    // State for 360 Profile Modal
    const [selectedClientFor360, setSelectedClientFor360] = useState<Client | null>(null);

    // --- METRICS CALCULATION ---
    const activeClients = clients.filter(c => c.status === 'Active');
    const churnRiskClients = clients.filter(c => c.status === 'Churn Risk');
    
    const avgHealthScore = clients.length > 0 
        ? Math.round(clients.reduce((acc, curr) => acc + (curr.healthScore || 0), 0) / clients.length) 
        : 0;

    const avgNPS = clients.length > 0 
        ? Math.round(clients.reduce((acc, curr) => acc + (curr.nps || 0), 0) / clients.length) 
        : 0;

    const onboardingClients = clients.filter(c => c.onboardingStatus === 'In Progress');

    // LOGIC: Top 5 Lowest Health Score (Active or Risk clients only)
    const lowestHealthClients = [...clients]
        .filter(c => c.status === 'Active' || c.status === 'Churn Risk')
        .sort((a, b) => (a.healthScore || 0) - (b.healthScore || 0))
        .slice(0, 5);

    // LOGIC: Renewals Radar (Clients with contract ending in 60 days)
    // If contractEndDate is missing, assume 1 year from 'since'
    const renewalRadarClients = useMemo(() => {
        const today = new Date();
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(today.getDate() + 60);

        return clients.filter(c => {
            let endDate = c.contractEndDate ? new Date(c.contractEndDate) : new Date(new Date(c.since).setFullYear(new Date(c.since).getFullYear() + 1));
            return endDate >= today && endDate <= sixtyDaysFromNow;
        }).sort((a, b) => {
             let endA = a.contractEndDate ? new Date(a.contractEndDate).getTime() : 0;
             let endB = b.contractEndDate ? new Date(b.contractEndDate).getTime() : 0;
             return endA - endB;
        });
    }, [clients]);

    // LOGIC: Engagement Matrix Data
    // X: Tenure (Months), Y: Health Score, Z: LTV (Size)
    const scatterData = useMemo(() => {
        return clients.map(c => {
            const tenureMonths = Math.floor((new Date().getTime() - new Date(c.since).getTime()) / (1000 * 60 * 60 * 24 * 30));
            return {
                id: c.id,
                name: c.name,
                tenure: tenureMonths,
                health: c.healthScore || 50,
                ltv: c.ltv || 1000,
                status: c.status
            };
        });
    }, [clients]);

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    const getTouchpointStatus = (lastContactDate?: string) => {
        if (!lastContactDate) return 'red';
        const diffDays = Math.floor((new Date().getTime() - new Date(lastContactDate).getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 30) return 'green';
        if (diffDays <= 60) return 'yellow';
        return 'red';
    };

    // Helper to get data for modal based on selection
    const getModalData = () => {
        switch (selectedMetric) {
            case 'HEALTH':
                return {
                    title: 'Detalhamento de Health Score',
                    data: [...clients].sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0)),
                    description: 'Lista de clientes ordenada por saúde da conta.'
                };
            case 'NPS':
                return {
                    title: 'Detalhamento de NPS',
                    data: [...clients].sort((a, b) => (b.nps || 0) - (a.nps || 0)),
                    description: 'Lista de clientes ordenada por pontuação NPS.'
                };
            case 'RISK':
                return {
                    title: 'Clientes em Risco (Churn)',
                    data: churnRiskClients,
                    description: 'Clientes marcados com risco de cancelamento ou saúde crítica.'
                };
            case 'ONBOARDING':
                return {
                    title: 'Em Onboarding',
                    data: onboardingClients,
                    description: 'Clientes em fase de implementação.'
                };
            default:
                return { title: '', data: [], description: '' };
        }
    };

    const modalContent = getModalData();

    // Custom Tooltip for Scatter Chart
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl text-xs border border-slate-700">
                    <p className="font-bold text-sm mb-1">{data.name}</p>
                    <p>Tempo de Casa: {data.tenure} meses</p>
                    <p>Saúde: <span className={data.health < 50 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{data.health}</span></p>
                    <p>LTV: R$ {data.ltv.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col relative bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <HeartPulse className="text-pink-600"/> Sucesso do Cliente
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Monitoramento proativo de saúde, retenção e expansão.</p>
                </div>
                <div className="flex gap-2">
                     <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 text-xs shadow-sm">
                         <span className="w-2 h-2 rounded-full bg-green-500"></span> Contato &lt; 30d
                         <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2"></span> 30-60d
                         <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> &gt; 60d
                     </div>
                </div>
            </div>

            {/* KPI Grid - Clickable */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div onClick={() => setSelectedMetric('HEALTH')} className="cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                    <KPICard 
                        title="Health Score Médio" 
                        value={`${avgHealthScore}/100`} 
                        icon={Activity} 
                        color="bg-emerald-500"
                        trend={avgHealthScore > 70 ? "Saudável" : "Atenção"}
                        trendUp={avgHealthScore > 70}
                        tooltip="Média de saúde ponderada por tickets, financeiro e engajamento."
                    />
                </div>
                <div onClick={() => setSelectedMetric('NPS')} className="cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                    <KPICard 
                        title="NPS Global" 
                        value={avgNPS.toString()} 
                        icon={TrendingUp} 
                        color="bg-blue-500"
                        trend="Zona de Qualidade"
                        trendUp={true}
                        tooltip="Net Promoter Score da base ativa."
                    />
                </div>
                <div onClick={() => setSelectedMetric('RISK')} className="cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                    <KPICard 
                        title="Risco de Churn" 
                        value={churnRiskClients.length.toString()} 
                        icon={AlertTriangle} 
                        color="bg-red-500"
                        trend={`R$ ${churnRiskClients.reduce((acc, c) => acc + (c.ltv || 0), 0).toLocaleString()}`}
                        trendUp={false}
                        tooltip="Clientes com saúde crítica ou marcados manualmente."
                    />
                </div>
                <div onClick={() => setSelectedMetric('ONBOARDING')} className="cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                     <KPICard 
                        title="Em Implantação" 
                        value={onboardingClients.length.toString()} 
                        icon={Zap} 
                        color="bg-purple-500"
                        trend="Time-to-Value"
                        trendUp={true}
                        tooltip="Clientes na fase de setup inicial."
                    />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6">
                
                {/* 1. Matriz de Engajamento (Scatter Plot) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2 min-h-[350px] flex flex-col">
                    <SectionTitle title="Matriz de Engajamento" subtitle="Saúde vs. Tempo de Casa (Tamanho da bolha = LTV)" />
                    <div className="flex-1 w-full min-h-0 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false}/>
                                <XAxis type="number" dataKey="tenure" name="Tempo de Casa" unit="m" tick={{fontSize: 12, fill: '#94a3b8'}} label={{ value: 'Meses de Contrato', position: 'bottom', offset: 0, fontSize: 12, fill: '#64748b' }} />
                                <YAxis type="number" dataKey="health" name="Health Score" unit="" tick={{fontSize: 12, fill: '#94a3b8'}} domain={[0, 100]} label={{ value: 'Health Score', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }}/>
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                <Scatter name="Clientes" data={scatterData} fill="#8884d8" onClick={(data) => { const client = clients.find(c => c.id === data.id); if(client) setSelectedClientFor360(client); }}>
                                    {scatterData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.health < 50 ? '#ef4444' : entry.health < 80 ? '#f59e0b' : '#10b981'} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Radar de Renovações */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[350px]">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><RefreshCw size={18} className="text-blue-500"/> Radar de Renovações</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Vencendo nos próximos 60 dias</p>
                        </div>
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold px-2 py-1 rounded-full">{renewalRadarClients.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                        {renewalRadarClients.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                <Calendar size={40} className="mb-2 opacity-30"/>
                                <p className="text-sm text-center">Nenhum contrato vencendo em breve.</p>
                             </div>
                        ) : (
                            renewalRadarClients.map(client => {
                                const endDate = client.contractEndDate ? new Date(client.contractEndDate) : new Date(new Date(client.since).setFullYear(new Date(client.since).getFullYear() + 1));
                                const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                                
                                return (
                                    <div key={client.id} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700 hover:border-blue-300 transition cursor-pointer group" onClick={() => setSelectedClientFor360(client)}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-blue-600 transition">{client.name}</h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${daysLeft < 30 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {daysLeft} dias
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                            <span>R$ {(client.ltv || 0).toLocaleString()}</span>
                                            <span className="flex items-center gap-1">Renovar <ArrowRight size={10}/></span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* 3. Jornada de Onboarding */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-1 min-h-[300px] flex flex-col">
                     <SectionTitle title="Jornada de Onboarding" subtitle="Clientes em fase de implantação" />
                     <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
                        {onboardingClients.length === 0 ? (
                            <div className="text-center text-slate-400 py-10">
                                <Zap size={40} className="mx-auto mb-2 opacity-30" />
                                <p>Nenhum onboarding ativo.</p>
                            </div>
                        ) : (
                            onboardingClients.map(client => {
                                // Simulating progress based on random for demo, or real data if available
                                const progress = 60; // Mock fixed progress for visual
                                return (
                                    <div key={client.id} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition" onClick={() => setSelectedClientFor360(client)}>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">{client.name}</h4>
                                            <span className="text-xs font-mono text-slate-500">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2 mb-2 overflow-hidden">
                                            <div className="bg-purple-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                            <span>Kick-off</span>
                                            <span className="text-purple-600 dark:text-purple-400">Treinamento</span>
                                            <span>Go-Live</span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                     </div>
                </div>

                {/* 4. Health Alerts & Touchpoints */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2 min-h-[300px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <SectionTitle title="Alerta de Saúde & Contato" subtitle="Prioridade de ação baseada em risco" />
                    </div>
                    
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs font-bold">
                                <tr>
                                    <th className="p-3">Cliente</th>
                                    <th className="p-3 text-center">Touchpoint</th>
                                    <th className="p-3 text-center">Health Score</th>
                                    <th className="p-3 text-center">NPS</th>
                                    <th className="p-3 text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {lowestHealthClients.map(client => {
                                    const touchStatus = getTouchpointStatus(client.lastContact);
                                    const touchColor = touchStatus === 'green' ? 'bg-green-500' : touchStatus === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
                                    
                                    return (
                                        <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => setSelectedClientFor360(client)}>
                                            <td className="p-3 font-medium text-slate-800 dark:text-white">
                                                {client.name}
                                                <p className="text-[10px] text-slate-400 font-normal">{client.segment}</p>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2" title={`Último contato: ${client.lastContact ? new Date(client.lastContact).toLocaleDateString() : 'Nunca'}`}>
                                                    <span className={`w-3 h-3 rounded-full ${touchColor} shadow-sm`}></span>
                                                    <span className="text-xs text-slate-500 dark:text-slate-400">{client.lastContact ? new Date(client.lastContact).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${getHealthColor(client.healthScore || 0)}`}>
                                                    {client.healthScore}/100
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`font-bold ${!client.nps ? 'text-slate-400' : client.nps > 8 ? 'text-green-500' : client.nps > 6 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                    {client.nps || '-'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold flex items-center justify-end gap-1">
                                                    Ver 360 <ArrowRight size={12}/>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Metric Modal (Kept for compatibility with KPI Cards) */}
            {selectedMetric && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{modalContent.title}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{modalContent.description}</p>
                            </div>
                            <button onClick={() => setSelectedMetric(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium sticky top-0">
                                    <tr>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4 text-center">Health Score</th>
                                        <th className="p-4 text-center">NPS</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {modalContent.data.map(client => (
                                        <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{client.name}</td>
                                            <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300">{client.healthScore}</td>
                                            <td className="p-4 text-center text-slate-700 dark:text-slate-300">{client.nps || '-'}</td>
                                            <td className="p-4 text-center"><Badge color={client.status === 'Active' ? 'green' : 'red'}>{client.status}</Badge></td>
                                            <td className="p-4 text-right">
                                                <button onClick={() => { setSelectedMetric(null); setSelectedClientFor360(client); }} className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-xs">
                                                    Ver 360°
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Client 360 Modal */}
            {selectedClientFor360 && (
                <Client360 
                    client={selectedClientFor360}
                    leads={leads}
                    tickets={tickets}
                    invoices={invoices}
                    onClose={() => setSelectedClientFor360(null)}
                />
            )}
        </div>
    );
};
