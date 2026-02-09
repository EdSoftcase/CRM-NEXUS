
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { TechnicalVisit, VisitStatus, Lead, Client } from '../types';
import { 
    ClipboardCheck, Plus, Search, Calendar, User, 
    Wrench, ArrowRight, Zap, CheckCircle, X, Save, 
    LayoutList, MapPin, Loader2, Sparkles, Building2,
    Briefcase
} from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';

export const TechnicalVisits: React.FC = () => {
    const { technicalVisits, leads, clients, addTechnicalVisit, updateTechnicalVisit, products, addSystemNotification } = useData();
    const { currentUser } = useAuth();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVisit, setSelectedVisit] = useState<TechnicalVisit | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<TechnicalVisit>>({
        status: VisitStatus.SCHEDULED,
        report: '',
        infrastructureNotes: '',
        suggestedItems: []
    });

    const filteredVisits = useMemo(() => {
        return technicalVisits.filter(v => 
            v.targetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.technicianName.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
    }, [technicalVisits, searchTerm]);

    const allTargets = useMemo(() => {
        const lList = leads.map(l => ({ id: l.id, name: l.company || l.name, type: 'lead' as const }));
        const cList = clients.map(c => ({ id: c.id, name: c.name, type: 'client' as const }));
        return [...lList, ...cList];
    }, [leads, clients]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const visit: TechnicalVisit = {
                id: selectedVisit?.id || `VIS-${Date.now()}`,
                targetId: formData.targetId || '',
                targetName: formData.targetName || '',
                targetType: formData.targetType || 'lead',
                scheduledDate: formData.scheduledDate || new Date().toISOString(),
                technicianName: formData.technicianName || currentUser.name,
                status: formData.status as VisitStatus,
                report: formData.report || '',
                infrastructureNotes: formData.infrastructureNotes || '',
                suggestedItems: formData.suggestedItems || [],
                organizationId: currentUser.organizationId
            };

            if (selectedVisit) await updateTechnicalVisit(currentUser, visit);
            else await addTechnicalVisit(currentUser, visit);

            addSystemNotification("Sucesso", "Vistoria registrada.", "success");
            setIsModalOpen(false);
            setSelectedVisit(null);
            setFormData({ status: VisitStatus.SCHEDULED, report: '', infrastructureNotes: '', suggestedItems: [] });
        } catch (e) {
            addSystemNotification("Erro", "Falha ao salvar vistoria.", "alert");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSuggestedProduct = (name: string) => {
        const current = formData.suggestedItems || [];
        if (current.includes(name)) {
            setFormData({ ...formData, suggestedItems: current.filter(i => i !== name) });
        } else {
            setFormData({ ...formData, suggestedItems: [...current, name] });
        }
    };

    const getStatusColor = (status: VisitStatus) => {
        switch(status) {
            case VisitStatus.SCHEDULED: return 'blue';
            case VisitStatus.COMPLETED: return 'green';
            case VisitStatus.CONVERTED: return 'purple';
            default: return 'gray';
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Vistorias Técnicas</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Mapeamento de campo para implantação e novas vendas.</p>
                </div>
                <button 
                    onClick={() => { setSelectedVisit(null); setFormData({ scheduledDate: new Date().toISOString().split('T')[0], status: VisitStatus.SCHEDULED, technicianName: currentUser.name, report: '', infrastructureNotes: '', suggestedItems: [] }); setIsModalOpen(true); }}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                >
                    <Plus size={18}/> Agendar Vistoria
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-3 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar unidade ou técnico..." className="w-full pl-12 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredVisits.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20">
                            <ClipboardCheck size={64} className="opacity-20 mb-4"/>
                            <p className="font-bold uppercase text-xs tracking-widest">Nenhuma vistoria registrada</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-6">Unidade / Alvo</th>
                                    <th className="p-6">Data</th>
                                    <th className="p-6">Técnico</th>
                                    <th className="p-6 text-center">Status</th>
                                    <th className="p-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredVisits.map(visit => (
                                    <tr key={visit.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => { setSelectedVisit(visit); setFormData(visit); setIsModalOpen(true); }}>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                    {visit.targetType === 'client' ? <Briefcase size={20}/> : <Zap size={20}/>}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">{visit.targetName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{visit.targetType}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 font-bold text-slate-600 dark:text-slate-300">
                                            {new Date(visit.scheduledDate).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="p-6 font-medium text-slate-500">{visit.technicianName}</td>
                                        <td className="p-6 text-center">
                                            <Badge color={getStatusColor(visit.status)}>{visit.status.toUpperCase()}</Badge>
                                        </td>
                                        <td className="p-6 text-right">
                                            <button className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-indigo-600 hover:scale-110 transition"><ArrowRight size={18}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-scale-in border">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-black text-2xl uppercase tracking-tighter">{selectedVisit ? 'Relatório de Vistoria' : 'Novo Agendamento'}</h3>
                                {selectedVisit && <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">ID: {selectedVisit.id}</p>}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-red-500 transition"><X size={24}/></button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <SectionTitle title="Dados de Agendamento" />
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Cliente ou Lead Alvo</label>
                                        <select 
                                            required 
                                            disabled={!!selectedVisit}
                                            className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600"
                                            value={formData.targetId}
                                            onChange={e => {
                                                const target = allTargets.find(t => t.id === e.target.value);
                                                setFormData({ ...formData, targetId: target?.id, targetName: target?.name, targetType: target?.type });
                                            }}
                                        >
                                            <option value="">Selecionar da Base...</option>
                                            {allTargets.map(t => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Data Prevista</label>
                                            <input type="date" required className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold" value={formData.scheduledDate?.split('T')[0]} onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Técnico / Responsável</label>
                                            <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold" value={formData.technicianName} onChange={e => setFormData({ ...formData, technicianName: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Status Atual</label>
                                        <select className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                            <option value={VisitStatus.SCHEDULED}>Agendada</option>
                                            <option value={VisitStatus.COMPLETED}>Realizada / Coleta de Dados</option>
                                            <option value={VisitStatus.CONVERTED}>Convertida em Proposta</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <SectionTitle title="Laudo Técnico de Campo" />
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2"><LayoutList size={14}/> Relatório de Necessidades</label>
                                        <textarea 
                                            placeholder="Descreva o que o cliente precisa, problemas detectados na infraestrutura atual..." 
                                            className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold h-32 resize-none outline-none focus:border-indigo-600" 
                                            value={formData.report} 
                                            onChange={e => setFormData({ ...formData, report: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2"><MapPin size={14}/> Observações de Infra (Energia/Rede)</label>
                                        <textarea 
                                            placeholder="Ex: Ponto de rede a 20m da guarita, energia 220v estável..." 
                                            className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold h-24 resize-none outline-none focus:border-indigo-600" 
                                            value={formData.infrastructureNotes} 
                                            onChange={e => setFormData({ ...formData, infrastructureNotes: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                                <div className="absolute right-[-20px] top-[-20px] text-white/5 rotate-12"><Sparkles size={150}/></div>
                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className="p-3 bg-indigo-600 rounded-2xl"><CheckCircle size={24}/></div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Itens Habilitados para Proposta</h3>
                                </div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 relative z-10">Marque os equipamentos e serviços identificados na visita:</p>
                                
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 relative z-10">
                                    {products.filter(p => p.active).map(prod => {
                                        const isSelected = formData.suggestedItems?.includes(prod.name);
                                        return (
                                            <button 
                                                key={prod.id} 
                                                type="button"
                                                onClick={() => toggleSuggestedProduct(prod.name)}
                                                className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${isSelected ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl scale-[1.02]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'}`}
                                            >
                                                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-white border-white text-indigo-600' : 'border-slate-600'}`}>
                                                    {isSelected && <CheckCircle size={14} fill="currentColor"/>}
                                                </div>
                                                <span className="truncate">{prod.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-10 border-t">
                                <button type="submit" disabled={isSaving} className="flex-1 bg-indigo-600 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-700 transition shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs">
                                    {isSaving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Registro Ténico</>}
                                </button>
                                
                                {/* Fix: Use 'selectedVisit' variable instead of 'visit' which was not defined */}
                                {selectedVisit && selectedVisit.status === VisitStatus.COMPLETED && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            // Lógica de Integração Mágica:
                                            // Redirecionamos para propostas com localStorage para preenchimento
                                            localStorage.setItem('nexus_pending_proposal_conversion', JSON.stringify({
                                                targetId: selectedVisit.targetId,
                                                targetName: selectedVisit.targetName,
                                                targetType: selectedVisit.targetType,
                                                title: `Implantação LPR - ${selectedVisit.targetName}`,
                                                items: selectedVisit.suggestedItems,
                                                scope: [selectedVisit.report, selectedVisit.infrastructureNotes]
                                            }));
                                            window.location.href = '#proposals'; // Hook simple navigate
                                            addSystemNotification("Comercial", "Convertendo dados técnicos em Proposta...", "success");
                                        }}
                                        className="flex-1 bg-slate-900 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-600 transition shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                                    >
                                        <Zap size={20} className="text-amber-400" fill="currentColor"/> GERAR PROPOSTA COMERCIAL
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
