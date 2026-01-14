
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { 
    Search, Plus, Trash2, Edit2, X, Save, 
    Link as LinkIcon, LayoutList, Rows, Building2, Calculator, Loader2,
    Briefcase
} from 'lucide-react';
import { Badge } from '../components/Widgets';
import { Client360 } from '../components/Client360';

interface GroupData {
    clients: Client[];
    totalLTV: number;
    groupName: string;
}

export const Clients: React.FC = () => {
    const { clients, leads, tickets, invoices, addClient, updateClient, removeClient, addSystemNotification } = useData();
    const { currentUser } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [viewMode, setViewMode] = useState<'list' | 'group'>('group');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedClientFor360, setSelectedClientFor360] = useState<Client | null>(null);

    const handleSaveClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentClient.name) return;
        
        setIsSaving(true);
        const clientData: Client = {
            id: isEditing ? currentClient.id! : `C-${Date.now()}`,
            name: currentClient.name || '',
            contactPerson: currentClient.contactPerson || '',
            document: currentClient.document || '',
            email: currentClient.email || '',
            phone: currentClient.phone || '',
            status: currentClient.status as any || 'Active',
            segment: currentClient.segment || 'Estacionamento',
            groupName: currentClient.groupName?.trim().toUpperCase() || '',
            groupId: currentClient.groupId?.trim().toUpperCase() || '',
            since: currentClient.since || new Date().toISOString(),
            ltv: Number(currentClient.ltv) || 0,
            unit: currentClient.unit || currentClient.name || '',
            organizationId: currentUser?.organizationId,
        };

        try {
            if (isEditing) {
                await updateClient(currentUser, clientData);
                addSystemNotification("Sucesso", "Cliente atualizado.", "success");
            } else {
                await addClient(currentUser, clientData);
                addSystemNotification("Sucesso", "Cliente cadastrado.", "success");
            }
            setIsModalOpen(false);
            setCurrentClient({});
        } catch (error: any) {
            addSystemNotification("Erro", error.message, "alert");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredClients = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        return clients.filter(c => {
            const matchesSearch = (c.name || '').toLowerCase().includes(query) || 
                                 (c.groupId || '').toLowerCase().includes(query) ||
                                 (c.groupName || '').toLowerCase().includes(query);
            const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [clients, searchTerm, statusFilter]);

    const groupedData = useMemo(() => {
        const groups: Record<string, GroupData> = {};
        const independent: Client[] = [];

        filteredClients.forEach(client => {
            if (client.groupId) {
                if (!groups[client.groupId]) {
                    groups[client.groupId] = { 
                        clients: [], 
                        totalLTV: 0, 
                        groupName: client.groupName || client.groupId 
                    };
                }
                groups[client.groupId].clients.push(client);
                groups[client.groupId].totalLTV += (client.ltv || 0);
            } else {
                independent.push(client);
            }
        });

        return { groups, independent };
    }, [filteredClients]);

    const renderClientRow = (client: Client) => (
        <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-0" onClick={() => setSelectedClientFor360(client)}>
            <td className="p-6">
                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg leading-none">{client.name}</p>
                <p className="text-[10px] text-slate-400 font-mono mt-1">{client.document || 'S/ CNPJ'}</p>
            </td>
            <td className="p-6">
                {client.groupId ? (
                    <div className="flex flex-col">
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-300">{client.groupName}</span>
                        <div className="flex items-center gap-1 text-[10px] text-blue-500 font-mono mt-0.5">
                            <LinkIcon size={10}/> {client.groupId}
                        </div>
                    </div>
                ) : (
                    <span className="text-slate-300 italic text-xs">Independente</span>
                )}
            </td>
            <td className="p-6 font-bold text-slate-600 dark:text-slate-300">{client.segment}</td>
            <td className="p-6 text-right font-mono font-black text-emerald-600 text-lg">R$ {(client.ltv || 0).toLocaleString()}</td>
            <td className="p-6 text-center"><Badge color={client.status === 'Active' ? 'green' : 'red'}>{client.status?.toUpperCase()}</Badge></td>
            <td className="p-6 text-right">
                <div className="flex justify-end gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setCurrentClient(client); setIsModalOpen(true); }} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-indigo-600 rounded-xl transition shadow-sm"><Edit2 size={16}/></button>
                    <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) removeClient(currentUser, client.id, "Manual"); }} className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500 rounded-xl transition shadow-sm"><Trash2 size={16}/></button>
                </div>
            </td>
        </tr>
    );

    const renderMobileClientCard = (client: Client) => (
        <div key={client.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-3 active:scale-[0.99] transition-transform" onClick={() => setSelectedClientFor360(client)}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-2">
                    <h4 className="font-black text-slate-900 dark:text-white text-base leading-tight uppercase">{client.name}</h4>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{client.document || 'S/ CNPJ'}</p>
                </div>
                <Badge color={client.status === 'Active' ? 'green' : 'red'}>{client.status}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">LTV Mensal</span>
                    <span className="font-mono font-black text-emerald-600 text-sm">R$ {(client.ltv || 0).toLocaleString()}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Segmento</span>
                    <span className="font-bold">{client.segment}</span>
                </div>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); setCurrentClient(client); setIsModalOpen(true); }} 
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-200 transition"
                >
                    <Edit2 size={14}/> Editar
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) removeClient(currentUser, client.id, "Manual"); }} 
                    className="p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl transition hover:bg-red-100"
                >
                    <Trash2 size={16}/>
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Gestão de Carteira</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Administre unidades independentes e grupos econômicos.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Lista Plana"
                        >
                            <LayoutList size={20}/>
                        </button>
                        <button 
                            onClick={() => setViewMode('group')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'group' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Agrupar por Grupo Econômico"
                        >
                            <Rows size={20}/>
                        </button>
                    </div>
                    <button onClick={() => { setCurrentClient({ status: 'Active', segment: 'Estacionamento', ltv: 0 }); setIsEditing(false); setIsModalOpen(true); }} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-500/20">
                        <Plus size={18}/> <span className="hidden md:inline">Nova Unidade</span><span className="md:hidden">Novo</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b flex flex-col md:flex-row items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-4 top-3 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar por nome, grupo ou ID..." className="w-full pl-12 pr-4 py-2.5 rounded-xl border-2 border-transparent bg-white dark:bg-slate-900 text-sm font-bold focus:border-indigo-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>
                    <select className="w-full md:w-auto bg-white dark:bg-slate-900 border rounded-xl px-3 py-2 text-xs font-bold outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="All">Status: Todos</option>
                        <option value="Active">Ativos</option>
                        <option value="Inactive">Inativos</option>
                    </select>
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar p-0 md:p-0 bg-slate-50 dark:bg-slate-900 md:bg-white md:dark:bg-slate-800">
                    <table className="w-full text-left text-sm hidden md:table">
                        <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-6">Unidade</th>
                                <th className="p-6">Grupo / ID</th>
                                <th className="p-6">Segmento</th>
                                <th className="p-6 text-right">LTV Mensal</th>
                                <th className="p-6 text-center">Status</th>
                                <th className="p-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {viewMode === 'list' ? (
                                filteredClients.map(renderClientRow)
                            ) : (
                                <>
                                    {Object.entries(groupedData.groups).map(([groupId, data]) => {
                                        const groupData = data as GroupData;
                                        return (
                                            <React.Fragment key={groupId}>
                                                <tr className="bg-slate-100 dark:bg-slate-800/80 border-y border-slate-200 dark:border-slate-700">
                                                    <td colSpan={6} className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm text-indigo-600">
                                                                    <Building2 size={20}/>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-sm">
                                                                        {groupData.groupName || groupId}
                                                                    </h4>
                                                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase mt-0.5">
                                                                        <span className="flex items-center gap-1"><LinkIcon size={10}/> ID: {groupId}</span>
                                                                        <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                                                        <span>{groupData.clients.length} Unidades</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                                                                <Calculator size={14} className="text-emerald-500"/>
                                                                <div className="text-right leading-none">
                                                                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Total Grupo</span>
                                                                    <span className="block font-black text-emerald-600 dark:text-emerald-400">R$ {groupData.totalLTV.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {groupData.clients.map(renderClientRow)}
                                            </React.Fragment>
                                        );
                                    })}
                                    {groupedData.independent.length > 0 && (
                                        <>
                                            <tr className="bg-slate-50 dark:bg-slate-800/30 border-y border-slate-200 dark:border-slate-700">
                                                <td colSpan={6} className="p-3 text-center">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidades Independentes</span>
                                                </td>
                                            </tr>
                                            {groupedData.independent.map(renderClientRow)}
                                        </>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                    <div className="md:hidden p-4 pb-20">
                        {filteredClients.map(renderMobileClientCard)}
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="font-black text-2xl uppercase tracking-tighter">{isEditing ? 'Editar Unidade' : 'Nova Unidade'}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-red-500 transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSaveClient} className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Razão Social / Nome da Unidade</label>
                                    <input required className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={currentClient.name || ''} onChange={e => setCurrentClient({...currentClient, name: e.target.value})} placeholder="EX: ESTACIONAMENTO SHOPPING NEXUS" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">ID de Agrupamento (GroupId)</label>
                                    <input className="w-full border-2 border-blue-100 dark:border-blue-900 rounded-2xl p-4 font-black uppercase bg-blue-50/20 dark:bg-blue-900/10 outline-none focus:border-blue-600" value={currentClient.groupId || ''} onChange={e => setCurrentClient({...currentClient, groupId: e.target.value})} placeholder="EX: MAUA-01" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nome do Grupo Econômico</label>
                                    <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={currentClient.groupName || ''} onChange={e => setCurrentClient({...currentClient, groupName: e.target.value})} placeholder="EX: GRUPO MAUÁ" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">CNPJ / CPF</label>
                                    <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={currentClient.document || ''} onChange={e => setCurrentClient({...currentClient, document: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">LTV Estimado (Mensal)</label>
                                    <input type="number" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition" value={currentClient.ltv || ''} onChange={e => setCurrentClient({...currentClient, ltv: parseFloat(e.target.value) || 0})} placeholder="0.00" />
                                </div>
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-700 transition shadow-2xl shadow-indigo-500/30 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Unidade</>}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {selectedClientFor360 && (
                <Client360 client={selectedClientFor360} leads={leads} tickets={tickets} invoices={invoices} onClose={() => setSelectedClientFor360(null)} />
            )}
        </div>
    );
};
