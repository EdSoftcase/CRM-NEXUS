
import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client } from '../types';
import { Search, Plus, Upload, Download, FileSpreadsheet, Trash2, Edit2, MapPin, Phone, Mail, Building2, ExternalLink, X, Save, CheckCircle, Eye } from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';
import { CustomFieldRenderer } from '../components/CustomFieldRenderer';
import { Client360 } from '../components/Client360';

export const Clients: React.FC = () => {
    // Adicionado leads, tickets e invoices para alimentar o Client360
    const { clients, leads, tickets, invoices, addClient, updateClient, removeClient, addClientsBulk, addSystemNotification, customFields } = useData();
    const { currentUser } = useAuth();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentClient, setCurrentClient] = useState<Partial<Client>>({});
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Estado para o Client360
    const [selectedClientFor360, setSelectedClientFor360] = useState<Client | null>(null);

    // --- IMPORT / EXPORT LOGIC ---
    const handleDownloadTemplate = () => {
        const templateData = [{ 'Contrato': 'CTR-001', 'Cliente': 'Exemplo Empresa Ltda', 'Unidade': 'Unidade Centro', 'CNPJ': '00.000.000/0001-00', 'Status': 'Ativo', 'Vagas': 100, 'Isentas': 5, 'Qtd. Veícu': 95, 'Tabela': 'Padrão 2024', 'R$ Tabela': '150,00', 'R$ Tabela Total': '15.000,00', 'R$ Especial': '12.000,00', 'Email': 'joao@empresa.com', 'Celular': '11999999999', 'Fixo': '1133333333', 'Início': '01/01/2024', 'Fim': '01/01/2025', 'Produtos': 'Internet, Gestão, Consultoria' }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template Clientes");
        XLSX.writeFile(wb, "template_importacao_clientes.xlsx");
    };

    const parseCurrency = (value: any): number => {
        if (!value) return 0;
        if (typeof value === 'number') return value;
        let str = String(value).trim();
        str = str.replace(/[R$\s]/g, '');
        if (str === '-' || str === ' - ') return 0;
        if (str.includes(',') && (!str.includes('.') || str.lastIndexOf(',') > str.lastIndexOf('.'))) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(/,/g, '');
        }
        const num = parseFloat(str);
        return isNaN(num) ? 0 : num;
    };

    const getValueByKeys = (row: any, keys: string[]) => {
        const rowKeys = Object.keys(row);
        for (const key of keys) {
            if (row[key] !== undefined) return row[key];
            const normalizedSearchKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const foundKey = rowKeys.find(k => {
                const normalizedRowKey = k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                return normalizedRowKey === normalizedSearchKey;
            });
            if (foundKey) return row[foundKey];
        }
        return undefined;
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (jsonData.length === 0) {
                addSystemNotification("Erro de Arquivo", "O arquivo está vazio ou não pôde ser lido.", "alert");
                return;
            }

            const processedClients: Client[] = jsonData.map((row: any) => {
                const doc = getValueByKeys(row, ['CNPJ', 'CPF', 'Documento', 'Document']);
                const cleanDoc = doc ? String(doc).replace(/\D/g, '') : '';
                
                const existingClient = cleanDoc ? clients.find(c => c.document && c.document.replace(/\D/g, '') === cleanDoc) : null;

                const name = getValueByKeys(row, ['Cliente', 'Nome', 'Empresa', 'Name', 'Company']) || (existingClient ? existingClient.name : 'Cliente Importado');
                const contact = getValueByKeys(row, ['Contato', 'Responsável', 'Responsavel', 'Contact']) || (existingClient ? existingClient.contactPerson : 'Gestor');
                const email = getValueByKeys(row, ['Email', 'E-mail', 'Mail']) || (existingClient ? existingClient.email : '');
                
                const mobile = getValueByKeys(row, ['Telefone', 'Celular', 'Mobile', 'WhatsApp']);
                const landline = getValueByKeys(row, ['Fixo', 'Comercial', 'Telefone Fixo']);
                let phone = existingClient ? existingClient.phone : '';
                
                if (mobile || landline) {
                    if (mobile && landline) phone = `${mobile} / ${landline}`;
                    else if (mobile) phone = String(mobile);
                    else if (landline) phone = String(landline);
                }
                
                const contract = getValueByKeys(row, ['Contrato', 'Contract', 'ID']) || (existingClient ? existingClient.contractId : undefined);
                const unit = getValueByKeys(row, ['Unidade', 'Unit', 'Filial']) || (existingClient ? existingClient.unit : undefined);
                
                const statusRaw = getValueByKeys(row, ['Status']);
                let status: 'Active' | 'Inactive' | 'Churn Risk' = existingClient ? existingClient.status as any : 'Active';
                if (statusRaw) {
                    const s = String(statusRaw).toLowerCase();
                    if (s === 'ativo' || s === 'active') status = 'Active';
                    else if (s === 'inativo' || s === 'inactive') status = 'Inactive';
                    else if (s.includes('risco') || s.includes('churn')) status = 'Churn Risk';
                }

                const startDate = getValueByKeys(row, ['Início', 'Inicio', 'Start Date']) || (existingClient ? existingClient.contractStartDate : undefined);
                const endDate = getValueByKeys(row, ['Fim', 'End Date']) || (existingClient ? existingClient.contractEndDate : undefined);
                
                const rawVagas = getValueByKeys(row, ['Vagas', 'Spots', 'Qtd Vagas', 'Vagas Total']);
                const parkingSpots = rawVagas ? parseInt(String(rawVagas).replace(/\D/g,'')) : (existingClient ? existingClient.parkingSpots : undefined);
                
                const rawPrice = getValueByKeys(row, ['R$ Tabela', 'Valor', 'Preço', 'Mensalidade', 'Price', 'Valor Mensal']);
                const rawTotal = getValueByKeys(row, ['R$ Tabela Total', 'Valor Total', 'Total', 'Receita', 'LTV', 'Valor Contrato']);
                
                const tablePrice = rawPrice ? parseCurrency(rawPrice) : (existingClient ? existingClient.tablePrice : undefined);
                const totalTablePrice = rawTotal ? parseCurrency(rawTotal) : (existingClient ? existingClient.totalTablePrice : undefined);
                
                let finalValue = existingClient ? existingClient.ltv : 0;
                if (totalTablePrice && totalTablePrice > 0) finalValue = totalTablePrice;
                else if (tablePrice && tablePrice > 0) finalValue = tablePrice;

                const address = getValueByKeys(row, ['Endereço', 'Endereco', 'Address', 'Logradouro']) || (existingClient ? existingClient.address : '');
                const cep = getValueByKeys(row, ['CEP', 'Zip', 'Postal Code']) || (existingClient ? existingClient.cep : '');
                
                const rawProducts = getValueByKeys(row, ['Produtos', 'Products', 'Serviços', 'Services', 'Contratado']);
                const contractedProducts = rawProducts ? String(rawProducts).split(',').map(p => p.trim()).filter(p => p) : (existingClient ? existingClient.contractedProducts : []);

                return { 
                    id: existingClient ? existingClient.id : `C-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                    name: String(name),
                    contactPerson: String(contact),
                    email: String(email),
                    phone: String(phone),
                    document: String(doc || existingClient?.document || ''),
                    segment: existingClient ? existingClient.segment : 'Geral',
                    contractId: contract ? String(contract) : undefined,
                    contractStartDate: startDate ? String(startDate) : undefined,
                    contractEndDate: endDate ? String(endDate) : undefined,
                    unit: unit ? String(unit) : undefined,
                    parkingSpots: parkingSpots,
                    tablePrice: tablePrice,
                    totalTablePrice: totalTablePrice,
                    ltv: finalValue,
                    status: status,
                    since: existingClient ? existingClient.since : new Date().toISOString(),
                    lastContact: existingClient ? existingClient.lastContact : '',
                    healthScore: existingClient ? existingClient.healthScore : 100,
                    nps: existingClient ? existingClient.nps : 0,
                    onboardingStatus: existingClient ? existingClient.onboardingStatus : 'Completed',
                    address: String(address),
                    cep: String(cep),
                    latitude: existingClient ? existingClient.latitude : 0,
                    longitude: existingClient ? existingClient.longitude : 0,
                    contractedProducts: contractedProducts,
                    metadata: existingClient ? existingClient.metadata : {}
                }; 
            }); 
            
            addClientsBulk(currentUser, processedClients); 
        } catch (error) { 
            console.error("Erro na importação:", error); 
            addSystemNotification("Erro Crítico", "Erro ao processar o arquivo Excel.", "alert"); 
        } 
        if (fileInputRef.current) { 
            fileInputRef.current.value = ''; 
        } 
    };

    // --- CRUD ---
    const handleSaveClient = (e: React.FormEvent) => {
        e.preventDefault();
        const clientData: Client = {
            id: isEditing ? currentClient.id! : `C-${Date.now()}`,
            name: currentClient.name || '',
            contactPerson: currentClient.contactPerson || '',
            email: currentClient.email || '',
            phone: currentClient.phone || '',
            document: currentClient.document || '',
            status: currentClient.status as any || 'Active',
            segment: currentClient.segment || 'Geral',
            since: currentClient.since || new Date().toISOString(),
            ltv: Number(currentClient.ltv) || 0,
            address: currentClient.address || '',
            organizationId: currentUser?.organizationId,
            metadata: currentClient.metadata || {}
        };

        if (isEditing) updateClient(currentUser, clientData);
        else addClient(currentUser, clientData);

        setIsModalOpen(false);
        setCurrentClient({});
    };

    const handleDeleteClient = (id: string) => {
        if (confirm("Tem certeza que deseja excluir este cliente?")) {
            removeClient(currentUser, id, "Exclusão manual");
        }
    };

    const openNewClientModal = () => {
        setCurrentClient({ status: 'Active', segment: 'Geral', ltv: 0 });
        setIsEditing(false);
        setIsModalOpen(true);
    };

    const openEditClientModal = (client: Client) => {
        setCurrentClient(client);
        setIsEditing(true);
        setIsModalOpen(true);
    };

    const filteredClients = useMemo(() => {
        return clients.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clients, searchTerm]);

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Carteira de Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestão completa da base de clientes.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium">
                        <FileSpreadsheet size={18}/> Modelo Excel
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm font-medium">
                        <Upload size={18}/> Importar
                    </button>
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    
                    <button onClick={openNewClientModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">
                        <Plus size={18}/> Novo Cliente
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input 
                            type="text" 
                            placeholder="Buscar cliente..." 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Total: {filteredClients.length}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-4">Cliente / Empresa</th>
                                <th className="p-4">Contatos</th>
                                <th className="p-4">Segmento</th>
                                <th className="p-4">Valor (LTV)</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredClients.map(client => (
                                <tr 
                                    key={client.id} 
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer group"
                                    onClick={() => setSelectedClientFor360(client)}
                                >
                                    <td className="p-4">
                                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{client.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Building2 size={10}/> {client.document || 'N/A'}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="flex items-center gap-1"><Phone size={10}/> {client.phone}</span>
                                            <span className="flex items-center gap-1"><Mail size={10}/> {client.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-700 dark:text-slate-300">{client.segment}</td>
                                    <td className="p-4 font-mono font-bold text-slate-800 dark:text-white">R$ {(client.ltv || 0).toLocaleString()}</td>
                                    <td className="p-4 text-center">
                                        <Badge color={client.status === 'Active' ? 'green' : client.status === 'Inactive' ? 'gray' : 'red'}>
                                            {client.status === 'Active' ? 'Ativo' : client.status === 'Inactive' ? 'Inativo' : 'Risco'}
                                        </Badge>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {/* Eye Icon for explicit 360 View - Helps UX */}
                                            <button className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition hidden md:block" title="Visão 360">
                                                <Eye size={16}/>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openEditClientModal(client); }} 
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" 
                                                title="Editar"
                                            >
                                                <Edit2 size={16}/>
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }} 
                                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" 
                                                title="Excluir"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClients.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                                        Nenhum cliente encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <h3 className="font-bold text-xl text-slate-900 dark:text-white">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSaveClient} className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome / Razão Social</label>
                                    <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.name || ''} onChange={e => setCurrentClient({...currentClient, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Responsável</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.contactPerson || ''} onChange={e => setCurrentClient({...currentClient, contactPerson: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label>
                                    <input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.email || ''} onChange={e => setCurrentClient({...currentClient, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.phone || ''} onChange={e => setCurrentClient({...currentClient, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CNPJ / CPF</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.document || ''} onChange={e => setCurrentClient({...currentClient, document: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Segmento</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.segment || ''} onChange={e => setCurrentClient({...currentClient, segment: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.status || 'Active'} onChange={e => setCurrentClient({...currentClient, status: e.target.value as any})}>
                                        <option value="Active">Ativo</option>
                                        <option value="Inactive">Inativo</option>
                                        <option value="Churn Risk">Em Risco</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Contrato (Mensal)</label>
                                    <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.ltv || ''} onChange={e => setCurrentClient({...currentClient, ltv: Number(e.target.value)})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço Completo</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" value={currentClient.address || ''} onChange={e => setCurrentClient({...currentClient, address: e.target.value})} />
                                </div>
                            </div>

                            {/* Custom Fields */}
                            <CustomFieldRenderer 
                                fields={customFields} 
                                module="clients" 
                                values={currentClient.metadata || {}} 
                                onChange={(key, value) => setCurrentClient(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))}
                                className="pt-4 border-t border-slate-100 dark:border-slate-700"
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
                                    <Save size={18}/> Salvar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CLIENT 360 MODAL */}
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
