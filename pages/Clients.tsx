
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

    // --- BULK WHATSAPP LOGIC ---
    const startBulkWhatsApp = async () => {
        if (!bulkMessage.trim()) return;
        
        const clientsWithPhone = clients.filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 10);
        if (clientsWithPhone.length === 0) {
            alert("Nenhum cliente com telefone válido na carteira.");
            return;
        }

        setIsSendingBulk(true);
        setStopBulk(false);
        setBulkProgress({ current: 0, total: clientsWithPhone.length, status: 'Iniciando motor de disparo...', nextIn: 0 });

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
                    description: `Mensagem em massa enviada via motor cadenciado: ${personalizedMsg}`
                });
            } catch (e) {
                console.error("Falha no disparo individual:", e);
            }

            if (i < clientsWithPhone.length - 1) {
                const randomMinutes = parseFloat((Math.random() * (7 - 2) + 2).toFixed(2));
                const delayMs = randomMinutes * 60 * 1000;
                
                setBulkProgress(prev => ({ 
                    ...prev, 
                    status: `Aguardando intervalo anti-ban...`,
                    nextIn: randomMinutes 
                }));

                let remaining = randomMinutes;
                while (remaining > 0) {
                    if (stopBulk) break;
                    await new Promise(r => setTimeout(r, 10000)); 
                    remaining -= 0.166; 
                    setBulkProgress(prev => ({ ...prev, nextIn: Math.max(0, remaining) }));
                    if (remaining <= 0) break;
                }
            }
        }

        setIsSendingBulk(false);
        if (!stopBulk) {
            addSystemNotification("Sucesso", "Disparo em massa concluído!", "success");
            alert("Disparo concluído com sucesso!");
            setIsBulkModalOpen(false);
        }
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
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Unidades & Contratos</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestão financeira e operacional da base de clientes.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setIsBulkModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow-md">
                        <MessageCircle size={18}/> Disparar para Todos
                    </button>
                    <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition text-sm font-medium shadow-sm">
                        <Download size={18}/> Modelo Vazio
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-md">
                        <Upload size={18}/> Importar Excel
                    </button>
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <button onClick={() => { setCurrentClient({ status: 'Active', segment: 'Estacionamento', ltv: 0 }); setIsEditing(false); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">
                        <Plus size={18}/> Nova Unidade
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input type="text" placeholder="Buscar unidade ou documento..." className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400"/>
                        <select 
                            className="bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">Todos Status</option>
                            <option value="Active">Ativos</option>
                            <option value="Churn Risk">Em Risco</option>
                            <option value="Inactive">Inativos</option>
                        </select>
                        <select 
                            className="bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={segmentFilter}
                            onChange={(e) => setSegmentFilter(e.target.value)}
                        >
                            {segments.map(s => <option key={s} value={s}>{s === 'All' ? 'Todos Segmentos' : s}</option>)}
                        </select>
                    </div>

                    <Badge color="blue">{filteredClients.length} Registros</Badge>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 uppercase text-[10px] font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4">Contrato / Unidade</th>
                                <th className="p-4">Vagas / Fluxo</th>
                                <th className="p-4 text-right">R$ Especial Total</th>
                                <th className="p-4 text-right">R$ Tabela Total</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredClients.map(client => (
                                <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer group" onClick={() => setSelectedClientFor360(client)}>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{client.unit || client.name}</p>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            {client.document && (
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                                                    <ShieldCheck size={10} className="text-blue-500"/> {client.document}
                                                </p>
                                            )}
                                            {client.phone && (
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <Phone size={10} className="text-indigo-500"/> {client.phone}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-slate-400 font-mono">{client.contractId || 'S/ CONTRATO'}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col text-xs">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{client.parkingSpots || 0} vagas</span>
                                            <span className="text-slate-400">Veículos: {client.vehicleCount || 0}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <p className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">R$ {(client.totalSpecialPrice || client.ltv || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        <p className="text-[9px] text-slate-400 uppercase font-bold">Valor Mensal</p>
                                    </td>
                                    <td className="p-4 text-right">
                                        <p className="font-mono font-bold text-slate-500 dark:text-slate-400">R$ {(client.totalTablePrice || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                                        <p className="text-[9px] text-slate-400 uppercase">Preço Base</p>
                                    </td>
                                    <td className="p-4 text-center">
                                        <Badge color={client.status === 'Active' ? 'green' : client.status === 'Churn Risk' ? 'yellow' : 'red'}>
                                            {client.status === 'Active' ? 'Ativo' : client.status === 'Inactive' ? 'Inativo' : 'Risco'}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setCurrentClient(client); setIsModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 transition"><Edit2 size={16}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir unidade?")) removeClient(currentUser, client.id, "Manual"); }} className="p-1.5 text-slate-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* BULK WHATSAPP MODAL */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                <MessageCircle className="text-emerald-600"/> Disparo em Lote (Anti-Ban)
                            </h3>
                            <button onClick={() => !isSendingBulk && setIsBulkModalOpen(false)} disabled={isSendingBulk} className="text-slate-400 hover:text-slate-600 disabled:opacity-30">
                                <X size={24}/>
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {!isSendingBulk ? (
                                <>
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                                        <ShieldCheck className="text-blue-600 dark:text-blue-400 shrink-0" size={24}/>
                                        <div>
                                            <h4 className="font-bold text-blue-900 dark:text-blue-200 text-sm">Segurança Inteligente Ativa</h4>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">O disparo será feito com intervalos variáveis entre 2 e 7 minutos para proteger seu número. Use [NOME] para personalizar.</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Mensagem de Disparo</label>
                                        <textarea 
                                            className="w-full border border-slate-300 dark:border-slate-700 rounded-xl p-4 h-48 outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white resize-none text-sm shadow-inner"
                                            placeholder="Olá [NOME], passando para informar que..."
                                            value={bulkMessage}
                                            onChange={e => setBulkMessage(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-slate-400">
                                        <span>Total de Clientes: <strong>{clients.length}</strong></span>
                                        <span>Estimativa: <strong>~{clients.length * 4} mins</strong></span>
                                    </div>
                                    <button 
                                        onClick={startBulkWhatsApp}
                                        disabled={!bulkMessage.trim()}
                                        className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Send size={20}/> INICIAR CAMPANHA DE DISPARO
                                    </button>
                                </>
                            ) : (
                                <div className="py-8 flex flex-col items-center text-center space-y-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-700 border-t-emerald-500 animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xl font-black text-emerald-600">{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-white">{bulkProgress.status}</h4>
                                        <p className="text-sm text-slate-500">{bulkProgress.current} de {bulkProgress.total} mensagens processadas</p>
                                    </div>

                                    {bulkProgress.nextIn > 0 && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 flex items-center gap-3">
                                            <Timer className="text-amber-600 animate-pulse" size={20}/>
                                            <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                                                Próximo envio em {bulkProgress.nextIn.toFixed(1)} minutos...
                                            </span>
                                        </div>
                                    )}

                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                        <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}></div>
                                    </div>

                                    <button 
                                        onClick={() => setStopBulk(true)}
                                        className="mt-4 px-6 py-2 border border-red-200 text-red-500 rounded-lg text-sm font-bold hover:bg-red-50 transition flex items-center gap-2"
                                    >
                                        <StopCircle size={18}/> Parar Campanha
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="font-bold text-xl">{isEditing ? 'Editar Registro' : 'Novo Registro'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X/></button>
                        </div>
                        <form onSubmit={handleSaveClient} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nome da Unidade</label>
                                    <input required className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={currentClient.name || ''} onChange={e => setCurrentClient({...currentClient, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">CNPJ / CPF</label>
                                    <input className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={currentClient.document || ''} onChange={e => setCurrentClient({...currentClient, document: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefone</label>
                                    <input className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={currentClient.phone || ''} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">E-mail</label>
                                    <input type="email" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={currentClient.email || ''} onChange={e => setCurrentClient({...currentClient, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">ID Contrato</label>
                                    <input className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white" value={currentClient.contractId || ''} onChange={e => setCurrentClient({...currentClient, contractId: e.target.value})} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Mensal Especial (LTV)</label>
                                    <input type="number" step="0.01" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white font-mono" value={currentClient.ltv || ''} onChange={e => setCurrentClient({...currentClient, ltv: Number(e.target.value), totalSpecialPrice: Number(e.target.value)})} />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-md">Salvar Unidade</button>
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
