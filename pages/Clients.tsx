
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { Search, Plus, Upload, Download, Trash2, Edit2, X, Save, CheckCircle, Eye, Sparkles, Loader2, DollarSign, AlertCircle, Phone, ShieldCheck, Mail, Send, MessageCircle, Clock, Timer, StopCircle, Filter } from 'lucide-react';
import { Badge } from '../components/Widgets';
import { Client360 } from '../components/Client360';
import { sendBridgeWhatsApp } from '../services/bridgeService';

export const Clients: React.FC = () => {
    const { clients, leads, tickets, invoices, addClient, updateClient, removeClient, addClientsBulk, addSystemNotification, addActivity } = useData();
    const { currentUser } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [segmentFilter, setSegmentFilter] = useState('All');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedClientFor360, setSelectedClientFor360] = useState<Client | null>(null);

    // --- BULK WHATSAPP STATE ---
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkMessage, setBulkMessage] = useState('');
    const [isSendingBulk, setIsSendingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '', nextIn: 0 });
    const [stopBulk, setStopBulk] = useState(false);

    const segments = useMemo(() => ['All', ...new Set(clients.map(c => c.segment).filter(Boolean))], [clients]);

    const handleDownloadTemplate = () => {
        const headers = [
            ["Contrato", "Cód. Int.", "Início", "Fim", "Tipo", "Unidade", "Status", "Vagas", "Isentas", "Qtd. Veículos", "Qtd. Credenciais", "Tabela", "R$ Tabela", "R$ Tabela Total", "Dia Espec.", "R$ Especial", "R$ Especial Total", "document", "email", "phone"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modelo Importacao");
        XLSX.writeFile(wb, "modelo_importacao_nexus.xlsx");
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            const processedClients: Client[] = jsonData.map((row: any) => {
                const findVal = (keyName: string) => {
                    const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyName.toLowerCase());
                    return foundKey ? row[foundKey] : null;
                };

                const parseCurrency = (val: any) => {
                    if (val === undefined || val === null || val === "") return 0;
                    if (typeof val === 'number') return val;
                    const clean = String(val).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').trim();
                    return parseFloat(clean) || 0;
                };

                const parseInteger = (val: any) => {
                    if (typeof val === 'number') return Math.floor(val);
                    return parseInt(String(val).replace(/\D/g, '')) || 0;
                };

                const specialTotal = parseCurrency(findVal('R$ Especial Total'));
                const tableTotal = parseCurrency(findVal('R$ Tabela Total'));
                const ltvFinal = specialTotal > 0 ? specialTotal : tableTotal;

                return { 
                    id: `C-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    name: String(findVal('Unidade') || findVal('Cliente') || 'Unidade Sem Nome'),
                    unit: String(findVal('Unidade') || ''),
                    contractId: String(findVal('Contrato') || ''),
                    contractStartDate: String(findVal('Início') || ''),
                    contractEndDate: String(findVal('Fim') || ''),
                    segment: String(findVal('Tipo') || 'Estacionamento'),
                    status: 'Active',
                    parkingSpots: parseInteger(findVal('Vagas')),
                    exemptSpots: parseInteger(findVal('Isentas')),
                    vehicleCount: parseInteger(findVal('Qtd. Veículos')),
                    credentialCount: parseInteger(findVal('Qtd. Credenciais')),
                    pricingTable: String(findVal('Tabela') || ''),
                    tablePrice: parseCurrency(findVal('R$ Tabela')),
                    totalTablePrice: tableTotal,
                    specialDay: String(findVal('Dia Espec.') || ''),
                    specialPrice: parseCurrency(findVal('R$ Especial')),
                    totalSpecialPrice: specialTotal,
                    ltv: ltvFinal,
                    document: String(findVal('document') || ''),
                    email: String(findVal('email') || ''),
                    phone: String(findVal('phone') || ''),
                    since: new Date().toISOString(),
                    contactPerson: 'Gestor da Unidade',
                    organizationId: currentUser?.organizationId,
                    metadata: { internal_code: String(findVal('Cód. Int.') || '') }
                } as Client;
            }); 

            addClientsBulk(currentUser, processedClients);
            addSystemNotification("Sucesso", `${processedClients.length} registros processados.`, "success");
        } catch (error) { 
            console.error(error);
            addSystemNotification("Erro", "Falha técnica ao ler arquivo.", "alert"); 
        } 
        event.target.value = '';
    };

    const startBulkWhatsApp = async () => {
        if (!bulkMessage.trim()) return;
        const clientsWithPhone = clients.filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
        if (clientsWithPhone.length === 0) return;

        setIsSendingBulk(true);
        setStopBulk(false);
        setBulkProgress({ current: 0, total: clientsWithPhone.length, status: 'Iniciando...', nextIn: 0 });

        for (let i = 0; i < clientsWithPhone.length; i++) {
            if (stopBulk) break;
            const client = clientsWithPhone[i];
            setBulkProgress(prev => ({ ...prev, current: i + 1, status: `Enviando para: ${client.name}` }));
            try {
                const personalizedMsg = bulkMessage.replace('[NOME]', client.name.split(' ')[0]);
                await sendBridgeWhatsApp(client.phone, personalizedMsg);
                addActivity(currentUser, {
                    id: `ACT-MASS-${Date.now()}-${i}`,
                    title: 'WhatsApp Massa Enviado',
                    type: 'Call',
                    dueDate: new Date().toISOString(),
                    completed: true,
                    relatedTo: client.name,
                    assignee: currentUser?.id || 'system',
                    description: personalizedMsg
                });
            } catch (e) { console.error(e); }

            if (i < clientsWithPhone.length - 1) {
                const randomMinutes = parseFloat((Math.random() * (7 - 2) + 2).toFixed(2));
                setBulkProgress(prev => ({ ...prev, status: `Aguardando anti-ban...`, nextIn: randomMinutes }));
                let remaining = randomMinutes;
                while (remaining > 0) {
                    if (stopBulk) break;
                    await new Promise(r => setTimeout(r, 10000)); 
                    remaining -= 0.166; 
                    setBulkProgress(prev => ({ ...prev, nextIn: Math.max(0, remaining) }));
                }
            }
        }
        setIsSendingBulk(false);
        setIsBulkModalOpen(false);
    };

    const handleSaveClient = (e: React.FormEvent) => {
        e.preventDefault();
        const clientData: Client = {
            id: isEditing ? currentClient.id! : `C-${Date.now()}`,
            name: currentClient.name || '',
            contactPerson: currentClient.contactPerson || '',
            document: currentClient.document || '',
            email: currentClient.email || '',
            phone: currentClient.phone || '',
            status: currentClient.status as any || 'Active',
            segment: currentClient.segment || 'Estacionamento',
            since: currentClient.since || new Date().toISOString(),
            ltv: Number(currentClient.ltv) || 0,
            unit: currentClient.unit || '',
            contractId: currentClient.contractId || '',
            organizationId: currentUser?.organizationId,
            metadata: currentClient.metadata || {}
        };
        if (isEditing) updateClient(currentUser, clientData);
        else addClient(currentUser, clientData);
        setIsModalOpen(false);
        setCurrentClient({});
    };

    const filteredClients = useMemo(() => {
        return clients.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (c.unit && c.unit.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                 (c.contractId && c.contractId.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                 (c.document && c.document.includes(searchTerm));
            const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
            const matchesSegment = segmentFilter === 'All' || c.segment === segmentFilter;
            return matchesSearch && matchesStatus && matchesSegment;
        });
    }, [clients, searchTerm, statusFilter, segmentFilter]);

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors min-h-0">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 shrink-0">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Unidades & Contratos</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Gestão operacional da base de clientes.</p>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full md:w-auto">
                    <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition shadow-md whitespace-nowrap">
                        <MessageCircle size={16}/> Massa
                    </button>
                    <button onClick={handleDownloadTemplate} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold shadow-sm">
                        <Download size={16}/> Modelo
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition shadow-md">
                        <Upload size={16}/> Importar
                    </button>
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => { setCurrentClient({ status: 'Active', segment: 'Estacionamento', ltv: 0 }); setIsEditing(false); setIsModalOpen(true); }} className="col-span-2 sm:col-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition shadow-lg">
                        <Plus size={18}/> Nova Unidade
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden min-h-0">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar unidade ou documento..." className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-transparent bg-white dark:bg-slate-800 text-sm focus:border-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>

                    <div className="flex items-center gap-2">
                        <select className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="All">Todos Status</option>
                            <option value="Active">Ativos</option>
                            <option value="Churn Risk">Em Risco</option>
                            <option value="Inactive">Inativos</option>
                        </select>
                        <select className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none" value={segmentFilter} onChange={(e) => setSegmentFilter(e.target.value)}>
                            {segments.map(s => <option key={s} value={s}>{s === 'All' ? 'Todos Segmentos' : s}</option>)}
                        </select>
                    </div>

                    <div className="ml-auto"><Badge color="blue">{filteredClients.length} Unidades</Badge></div>
                </div>
                
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <div className="min-w-[900px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4">Contrato / Unidade</th>
                                    <th className="p-4">Vagas / Fluxo</th>
                                    <th className="p-4 text-right">R$ Especial (LTV)</th>
                                    <th className="p-4 text-right">R$ Tabela Base</th>
                                    <th className="p-4 text-center">Status</th>
                                    <th className="p-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredClients.map(client => (
                                    <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer group" onClick={() => setSelectedClientFor360(client)}>
                                        <td className="p-4">
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">{client.unit || client.name}</p>
                                            <div className="flex gap-2 mt-1">
                                                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><ShieldCheck size={10} className="text-blue-500"/> {client.document || 'S/ DOCUMENTO'}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{client.contractId || 'S/ CONTRATO'}</p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-700 dark:text-slate-300 text-xs">{client.parkingSpots || 0} VAGAS</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold">Veículos: {client.vehicleCount || 0}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <p className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">R$ {(client.totalSpecialPrice || client.ltv || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <p className="font-mono font-bold text-slate-400">R$ {(client.totalTablePrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <Badge color={client.status === 'Active' ? 'green' : client.status === 'Churn Risk' ? 'yellow' : 'red'}>
                                                {client.status === 'Active' ? 'ATIVO' : client.status === 'Inactive' ? 'INATIVO' : 'RISCO'}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setCurrentClient(client); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition"><Edit2 size={16}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir unidade?")) removeClient(currentUser, client.id, "Manual"); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClients.length === 0 && (
                                    <tr><td colSpan={6} className="p-20 text-center text-slate-400 italic font-bold">Nenhum registro localizado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-fade-in overflow-y-auto">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl md:rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in my-auto border border-slate-200 dark:border-slate-800">
                        <div className="p-6 md:p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-black text-xl uppercase tracking-tighter">{isEditing ? 'Editar Unidade' : 'Novo Contrato'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleSaveClient} className="p-6 md:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nome da Unidade / Razão Social</label>
                                    <input required className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={currentClient.name || ''} onChange={e => setCurrentClient({...currentClient, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">CNPJ / CPF</label>
                                    <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={currentClient.document || ''} onChange={e => setCurrentClient({...currentClient, document: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Telefone Principal</label>
                                    <input className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" value={currentClient.phone || ''} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Valor Mensal Especial (LTV)</label>
                                    <input type="number" step="0.01" className="w-full border-2 border-indigo-100 dark:border-indigo-900 rounded-2xl p-4 font-black text-2xl text-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/20 outline-none" value={currentClient.ltv || ''} onChange={e => setCurrentClient({...currentClient, ltv: Number(e.target.value), totalSpecialPrice: Number(e.target.value)})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl hover:bg-indigo-700 transition shadow-2xl shadow-indigo-500/30 uppercase tracking-widest text-xs">Confirmar Registro</button>
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
