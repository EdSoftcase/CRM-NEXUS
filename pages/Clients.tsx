
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client360 } from '../components/Client360';
import { Client } from '../types';
import { Search, MoreHorizontal, X, Save, User, Building, Mail, Phone, MapPin, Globe, Briefcase, Filter, Upload, Download, FileSpreadsheet, Trash2, Clock, AlertCircle, ArrowRight, AlertTriangle, MessageCircle, Send, CheckCircle, FileText, Loader2, Edit, Package, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { fetchAddressByCEP, fetchCoordinates } from '../services/geoService';
import { CustomFieldRenderer } from '../components/CustomFieldRenderer';

export const Clients: React.FC = () => {
    const { clients, leads, tickets, invoices, products, addClient, addClientsBulk, removeClient, updateClient, addSystemNotification, customFields } = useData();
    const { currentUser, hasPermission } = useAuth();
    
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsAppMessage, setWhatsAppMessage] = useState('');
    const [clientForWhatsApp, setClientForWhatsApp] = useState<Client | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ name: '', unit: '', spots: '', status: 'All', lastContact: '', value: '' });
    const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
    const [newClientForm, setNewClientForm] = useState({ name: '', contactPerson: '', email: '', phone: '', segment: '', cep: '', address: '', latitude: 0, longitude: 0, website: '', ltv: '', cnpj: '', contractedProducts: [] as string[], metadata: {} });
    const [emailError, setEmailError] = useState<string | null>(null);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [cnpjError, setCnpjError] = useState<string | null>(null);
    const [cepError, setCepError] = useState<string | null>(null);
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        document: '',
        address: '',
        parkingSpots: 0,
        value: 0, 
        status: 'Active' as 'Active' | 'Inactive' | 'Churn Risk',
        contractedProducts: [] as string[],
        metadata: {}
    });

    const [inactiveClients, setInactiveClients] = useState<Client[]>([]);
    const [showInactiveModal, setShowInactiveModal] = useState(false);

    const handleOpenClient = (client: Client) => {
        setSelectedClient(client);
    };

    const handleCloseClient = () => {
        setSelectedClient(null);
    };

    useEffect(() => {
        const isSessionChecked = sessionStorage.getItem('nexus_inactive_alert_shown');
        if (isSessionChecked) return;
        const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const stagnant = clients.filter(c => { const lastContactDate = c.lastContact ? new Date(c.lastContact) : new Date(c.since); return lastContactDate < thirtyDaysAgo && c.status === 'Active'; });
        if (stagnant.length > 0) { setInactiveClients(stagnant); setShowInactiveModal(true); sessionStorage.setItem('nexus_inactive_alert_shown', 'true'); }
    }, [clients]);

    const whatsappTemplates = [
        { label: 'Contato Geral', text: 'Olá [Nome], tudo bem? Gostaria de falar sobre o contrato da [Empresa].' },
        { label: 'Cobrança', text: 'Olá [Nome], verificamos uma pendência financeira referente à [Empresa]. Podemos ajudar?' },
        { label: 'Agendar Reunião', text: 'Oi [Nome], gostaria de agendar uma breve conversa sobre a [Empresa]. Qual sua disponibilidade?' },
    ];

    const filteredClients = clients.filter(c => {
        const matchesGlobal = searchTerm === '' || c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase()) || (c.contractId && c.contractId.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesName = filters.name === '' || c.name.toLowerCase().includes(filters.name.toLowerCase()) || (c.contractId && c.contractId.toLowerCase().includes(filters.name.toLowerCase()));
        const matchesUnit = filters.unit === '' || (c.unit || c.address || '').toLowerCase().includes(filters.unit.toLowerCase());
        const matchesSpots = filters.spots === '' || (c.parkingSpots !== undefined && c.parkingSpots.toString().includes(filters.spots));
        const matchesStatus = filters.status === 'All' || c.status === filters.status;
        const totalVal = c.totalTablePrice || c.ltv || 0;
        const matchesValue = filters.value === '' || totalVal.toString().includes(filters.value);
        return matchesGlobal && matchesName && matchesUnit && matchesSpots && matchesStatus && matchesValue;
    });

    const handleExportExcel = () => {
        if (filteredClients.length === 0) {
            addSystemNotification("Erro na Exportação", "Nenhum cliente na lista para exportar.", "alert");
            return;
        }
        
        const dataToExport = filteredClients.map(c => ({
            'ID': c.id,
            'Nome': c.name,
            'Contato': c.contactPerson,
            'Email': c.email,
            'Telefone': c.phone,
            'Documento': c.document,
            'Status': c.status,
            'Valor Total': c.totalTablePrice || c.ltv,
            'Vagas': c.parkingSpots,
            'Endereço': c.address,
            'Último Contato': new Date(c.lastContact || c.since).toLocaleDateString(),
            'Produtos': c.contractedProducts?.join(', ')
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Clientes Nexus");
        XLSX.writeFile(wb, `Clientes_Nexus_${new Date().toISOString().split('T')[0]}.xlsx`);
        addSystemNotification("Exportação Concluída", "Arquivo Excel gerado com sucesso.", "success");
    };

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value; setNewClientForm({ ...newClientForm, email: val }); if (val.length === 0) { setEmailError(null); } else if (!validateEmail(val)) { setEmailError('Formato de e-mail inválido'); } else { setEmailError(''); } };
    const maskPhone = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/g, '($1) $2').replace(/(\d)(\d{4})$/, '$1-$2').substring(0, 15);
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { const maskedVal = maskPhone(e.target.value); setNewClientForm({ ...newClientForm, phone: maskedVal }); if (maskedVal.length === 0) { setPhoneError(null); } else if (maskedVal.length < 14) { setPhoneError('Telefone inválido'); } else { setPhoneError(''); } };
    const maskCEP = (value: string) => value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
    const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const rawCep = e.target.value; const maskedCep = maskCEP(rawCep); setNewClientForm(prev => ({ ...prev, cep: maskedCep })); if (maskedCep.length === 9) { setIsLoadingCep(true); const addressData = await fetchAddressByCEP(maskedCep); if (addressData) { const fullAddress = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}`; const coords = await fetchCoordinates(fullAddress); setNewClientForm(prev => ({ ...prev, address: fullAddress, latitude: coords?.lat || 0, longitude: coords?.lng || 0 })); setCepError(''); } else { setCepError('CEP não encontrado.'); } setIsLoadingCep(false); } else { setCepError(null); } };
    const validateCNPJ = (cnpj: string) => { cnpj = cnpj.replace(/[^\d]+/g, ''); if (cnpj === '') return false; if (cnpj.length !== 14) return false; if (/^(\d)\1+$/.test(cnpj)) return false; return true; };
    const maskCNPJ = (value: string) => value.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').substring(0, 18);
    const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => { const maskedVal = maskCNPJ(e.target.value); setNewClientForm({ ...newClientForm, cnpj: maskedVal }); if (maskedVal.length === 0) { setCnpjError(null); } else if (maskedVal.length < 18) { setCnpjError('CNPJ inválido'); } else { setCnpjError(''); } };
    
    const handleCreateClient = (e: React.FormEvent) => { e.preventDefault(); if (emailError || (newClientForm.email && !validateEmail(newClientForm.email))) { setEmailError('Por favor, corrija o e-mail antes de salvar.'); return; } if (phoneError || (newClientForm.phone && newClientForm.phone.length < 14)) { setPhoneError('Por favor, insira um telefone válido.'); return; } if (cnpjError || (newClientForm.cnpj && newClientForm.cnpj.length < 14)) { setCnpjError('Por favor, insira um CNPJ válido.'); return; } if (!newClientForm.cep) { setCepError('O CEP é obrigatório para localização geográfica.'); return; } const newClient: Client = { id: `C-${Date.now()}`, name: newClientForm.name, contactPerson: newClientForm.contactPerson, document: newClientForm.cnpj, email: newClientForm.email, phone: newClientForm.phone, segment: newClientForm.segment || 'Geral', since: new Date().toISOString(), status: 'Active', ltv: Number(newClientForm.ltv) || 0, nps: 0, healthScore: 100, onboardingStatus: 'Pending', cep: newClientForm.cep, address: newClientForm.address, latitude: newClientForm.latitude, longitude: newClientForm.longitude, website: newClientForm.website, lastContact: new Date().toISOString(), contractedProducts: newClientForm.contractedProducts, metadata: newClientForm.metadata }; addClient(currentUser, newClient); setIsNewClientModalOpen(false); setNewClientForm({ name: '', contactPerson: '', email: '', phone: '', segment: '', cep: '', address: '', latitude: 0, longitude: 0, website: '', ltv: '', cnpj: '', contractedProducts: [], metadata: {} }); setEmailError(null); setPhoneError(null); setCnpjError(null); setCepError(null); };
    
    const handleDeleteClick = (e: React.MouseEvent, client: Client) => { e.stopPropagation(); e.preventDefault(); setClientToDelete(client); setDeleteReason(''); setIsDeleteModalOpen(true); };
    
    const handleEditClick = (e: React.MouseEvent, client: Client) => { 
        e.stopPropagation(); 
        e.preventDefault(); 
        setClientToEdit(client); 
        setEditForm({ 
            name: client.name || '', 
            contactPerson: client.contactPerson || '', 
            email: client.email || '', 
            phone: client.phone || '', 
            document: client.document || '', 
            address: client.address || '', 
            parkingSpots: client.parkingSpots || 0, 
            value: client.totalTablePrice || client.ltv || 0, 
            status: client.status as any, 
            contractedProducts: client.contractedProducts || [],
            metadata: client.metadata || {}
        }); 
        setIsEditModalOpen(true); 
    };
    
    const handleSaveEdit = (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (!clientToEdit) return; 
        const updatedClient: Client = { 
            ...clientToEdit, 
            name: editForm.name, 
            contactPerson: editForm.contactPerson, 
            email: editForm.email, 
            phone: editForm.phone, 
            document: editForm.document, 
            address: editForm.address, 
            parkingSpots: editForm.parkingSpots, 
            status: editForm.status, 
            totalTablePrice: Number(editForm.value), 
            ltv: Number(editForm.value), 
            contractedProducts: editForm.contractedProducts,
            metadata: editForm.metadata
        }; 
        updateClient(currentUser, updatedClient); 
        setIsEditModalOpen(false); 
        setClientToEdit(null); 
    };
    
    const toggleProductInForm = (productName: string, isEditMode: boolean) => { if (isEditMode) { setEditForm(prev => { const exists = prev.contractedProducts.includes(productName); if (exists) return { ...prev, contractedProducts: prev.contractedProducts.filter(p => p !== productName) }; return { ...prev, contractedProducts: [...prev.contractedProducts, productName] }; }); } else { setNewClientForm(prev => { const exists = prev.contractedProducts.includes(productName); if (exists) return { ...prev, contractedProducts: prev.contractedProducts.filter(p => p !== productName) }; return { ...prev, contractedProducts: [...prev.contractedProducts, productName] }; }); } };
    const handleWhatsAppClick = (e: React.MouseEvent, client: Client) => { e.stopPropagation(); setClientForWhatsApp(client); const defaultTmpl = whatsappTemplates[0]; const text = defaultTmpl.text.replace('[Nome]', client.contactPerson.split(' ')[0]).replace('[Empresa]', client.name); setWhatsAppMessage(text); setShowWhatsAppModal(true); };
    const handleSendWhatsApp = () => { if (!clientForWhatsApp) return; const phone = clientForWhatsApp.phone?.replace(/\D/g, '') || ''; const text = encodeURIComponent(whatsAppMessage); window.open(`https://wa.me/${phone}?text=${text}`, '_blank'); setShowWhatsAppModal(false); };
    const handleConfirmDelete = () => { if (clientToDelete && deleteReason.length >= 5) { removeClient(currentUser, clientToDelete.id, deleteReason); setIsDeleteModalOpen(false); setClientToDelete(null); setDeleteReason(''); } else { alert("Por favor, forneça uma justificativa com pelo menos 5 caracteres."); } };
    const handleViewClientFromAlert = (client: Client) => { setShowInactiveModal(false); handleOpenClient(client); };
    const handleDownloadTemplate = () => { const templateData = [{ 'Contrato': 'CTR-001', 'Cliente': 'Exemplo Empresa Ltda', 'Unidade': 'Unidade Centro', 'Status': 'Ativo', 'Vagas': 100, 'Isentas': 5, 'Qtd. Veícu': 95, 'Tabela': 'Padrão 2024', 'R$ Tabela': '150,00', 'R$ Tabela Total': '15.000,00', 'R$ Especial': '12.000,00', 'Email': 'joao@empresa.com', 'Telefone': '11999999999', 'Início': '01/01/2024', 'Fim': '01/01/2025', 'Produtos': 'Internet, Gestão, Consultoria' }]; const ws = XLSX.utils.json_to_sheet(templateData); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Template Clientes"); XLSX.writeFile(wb, "template_importacao_clientes.xlsx"); };
    const parseCurrency = (value: any): number => { if (!value) return 0; if (typeof value === 'number') return value; let str = String(value).trim(); str = str.replace(/[R$\s]/g, ''); if (str === '-' || str === ' - ') return 0; if (str.includes(',') && (!str.includes('.') || str.lastIndexOf(',') > str.lastIndexOf('.'))) { str = str.replace(/\./g, '').replace(',', '.'); } else { str = str.replace(/,/g, ''); } const num = parseFloat(str); return isNaN(num) ? 0 : num; };
    const getValueByKeys = (row: any, keys: string[]) => { const rowKeys = Object.keys(row); for (const key of keys) { if (row[key] !== undefined) return row[key]; const normalizedSearchKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); const foundKey = rowKeys.find(k => { const normalizedRowKey = k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(); return normalizedRowKey === normalizedSearchKey; }); if (foundKey) return row[foundKey]; } return undefined; };
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; try { const data = await file.arrayBuffer(); const workbook = XLSX.read(data); const worksheet = workbook.Sheets[workbook.SheetNames[0]]; const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }); if (jsonData.length === 0) { addSystemNotification("Erro de Arquivo", "O arquivo está vazio ou não pôde ser lido.", "alert"); return; } const newClients: Client[] = jsonData.map((row: any) => { const name = getValueByKeys(row, ['Cliente', 'Nome', 'Empresa', 'Name', 'Company']); const contact = getValueByKeys(row, ['Contato', 'Responsável', 'Responsavel', 'Contact']); const email = getValueByKeys(row, ['Email', 'E-mail', 'Mail']); const phone = getValueByKeys(row, ['Telefone', 'Celular', 'Fone', 'Phone', 'Mobile']); const doc = getValueByKeys(row, ['CNPJ', 'CPF', 'Documento', 'Document']); const contract = getValueByKeys(row, ['Contrato', 'Contract', 'ID']); const unit = getValueByKeys(row, ['Unidade', 'Unit', 'Filial']); const statusRaw = getValueByKeys(row, ['Status']); const status = statusRaw === 'Ativo' ? 'Active' : statusRaw === 'Inativo' ? 'Inactive' : 'Active'; const startDate = getValueByKeys(row, ['Início', 'Inicio', 'Start Date']); const endDate = getValueByKeys(row, ['Fim', 'End Date']); const rawVagas = getValueByKeys(row, ['Vagas', 'Spots', 'Qtd Vagas', 'Vagas Total']); const rawIsentas = getValueByKeys(row, ['Isentas', 'Exempt']); const rawVeiculos = getValueByKeys(row, ['Qtd. Veícu', 'Qtd. Veículos', 'Veiculos']); const rawCredenciais = getValueByKeys(row, ['Qtd. Crede', 'Qtd. Credenciais', 'Credenciais']); const tabelaNome = getValueByKeys(row, ['Tabela', 'Pricing Table']); const rawPrice = getValueByKeys(row, ['R$ Tabela', 'Valor', 'Preço', 'Mensalidade', 'Price', 'Valor Mensal']); const rawTotal = getValueByKeys(row, ['R$ Tabela Total', 'Valor Total', 'Total', 'Receita', 'LTV', 'Valor Contrato']); const diaEspec = getValueByKeys(row, ['Dia Espec.', 'Special Day']); const rawEspPrice = getValueByKeys(row, ['R$ Especial', 'Special Price']); const rawEspTotal = getValueByKeys(row, ['R$ Especial Total', 'Total Special']); const address = getValueByKeys(row, ['Endereço', 'Endereco', 'Address', 'Logradouro']); const cep = getValueByKeys(row, ['CEP', 'Zip', 'Postal Code']); const rawProducts = getValueByKeys(row, ['Produtos', 'Products', 'Serviços', 'Services', 'Contratado']); const contractedProducts = rawProducts ? String(rawProducts).split(',').map(p => p.trim()).filter(p => p) : []; const parkingSpots = rawVagas ? parseInt(String(rawVagas).replace(/\D/g,'')) : undefined; const exemptSpots = rawIsentas ? parseInt(String(rawIsentas).replace(/\D/g,'')) : undefined; const vehicleCount = rawVeiculos ? parseInt(String(rawVeiculos).replace(/\D/g,'')) : undefined; const credentialCount = rawCredenciais ? parseInt(String(rawCredenciais).replace(/\D/g,'')) : undefined; const tablePrice = parseCurrency(rawPrice); const totalTablePrice = parseCurrency(rawTotal); const specialPrice = parseCurrency(rawEspPrice); const totalSpecialPrice = parseCurrency(rawEspTotal); let finalValue = 0; if (specialPrice > 0) finalValue = specialPrice; else if (totalSpecialPrice > 0) finalValue = totalSpecialPrice; else if (totalTablePrice > 0) finalValue = totalTablePrice; else if (tablePrice > 0) finalValue = tablePrice; return { id: `C-IMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, name: name || 'Cliente Importado', contactPerson: contact || 'Gestor', email: email || '', phone: phone ? String(phone) : '', document: doc ? String(doc) : '', segment: 'Geral', contractId: contract ? String(contract) : undefined, contractStartDate: startDate ? String(startDate) : undefined, contractEndDate: endDate ? String(endDate) : undefined, unit: unit ? String(unit) : undefined, parkingSpots: isNaN(parkingSpots || NaN) ? undefined : parkingSpots, exemptSpots: isNaN(exemptSpots || NaN) ? undefined : exemptSpots, vehicleCount: isNaN(vehicleCount || NaN) ? undefined : vehicleCount, credentialCount: isNaN(credentialCount || NaN) ? undefined : credentialCount, pricingTable: tabelaNome ? String(tabelaNome) : undefined, tablePrice: tablePrice > 0 ? tablePrice : undefined, totalTablePrice: finalValue > 0 ? finalValue : undefined, specialDay: diaEspec ? String(diaEspec) : undefined, specialPrice: specialPrice > 0 ? specialPrice : undefined, totalSpecialPrice: totalSpecialPrice > 0 ? totalSpecialPrice : undefined, ltv: finalValue, status: status, since: new Date().toISOString(), lastContact: new Date().toISOString(), healthScore: 100, nps: 0, onboardingStatus: 'Completed', address: address || '', cep: cep ? String(cep) : '', latitude: 0, longitude: 0, contractedProducts: contractedProducts }; }); addClientsBulk(currentUser, newClients); } catch (error) { console.error("Erro na importação:", error); addSystemNotification("Erro Crítico", "Erro ao processar o arquivo Excel. Verifique se o arquivo não está corrompido.", "alert"); } if (fileInputRef.current) { fileInputRef.current.value = ''; } };

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Carteira de Clientes</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gestão 360° e relacionamento.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <div className="flex flex-1 md:flex-none bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                        <button onClick={handleExportExcel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-green-600 transition" title="Exportar Lista (Excel)"><Download size={20} /></button>
                        <div className="w-px h-auto bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button onClick={handleDownloadTemplate} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 transition" title="Baixar Modelo Excel"><FileSpreadsheet size={20} /></button>
                        <div className="w-px h-auto bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white rounded transition whitespace-nowrap"><Upload size={18} /> Importar</button>
                    </div>
                    <button onClick={() => { setIsNewClientModalOpen(true); setEmailError(null); setPhoneError(null); setCnpjError(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-sm transition ml-2 whitespace-nowrap flex-1 md:flex-none"><User size={20} /> <span className="hidden md:inline">Novo Cliente</span></button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-visible">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={20}/>
                        <input 
                            type="text" 
                            placeholder="Pesquisa Global..." 
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700 dark:text-white focus:bg-white dark:focus:bg-slate-600 transition"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                        {filteredClients.length} registros
                    </div>
                </div>

                <div className="block md:hidden p-4 space-y-4">
                    {filteredClients.map(client => {
                        const daysInactive = client.lastContact ? Math.floor((new Date().getTime() - new Date(client.lastContact).getTime()) / (1000 * 3600 * 24)) : 999;
                        return (
                            <div key={client.id} className="bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm p-4 relative" onClick={() => handleOpenClient(client)}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{client.name}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{client.segment}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${client.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {client.status === 'Active' ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Valor</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {client.totalTablePrice ? `R$ ${client.totalTablePrice.toLocaleString()}` : `R$ ${client.ltv.toLocaleString()}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Vagas</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{client.parkingSpots || '-'}</span>
                                    </div>
                                    {daysInactive > 30 && (
                                        <div className="flex items-center gap-1 text-xs text-red-500 font-bold bg-red-50 dark:bg-red-900/20 p-1 rounded">
                                            <AlertCircle size={12} /> {daysInactive} dias sem contato
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 border-t border-slate-100 dark:border-slate-600 pt-3">
                                    <button onClick={(e) => handleEditClick(e, client)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-600 rounded text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1">
                                        <Edit size={14}/> Editar
                                    </button>
                                    <button onClick={(e) => handleWhatsAppClick(e, client)} className="flex-1 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-bold text-xs flex items-center justify-center gap-1">
                                        <MessageCircle size={14}/> Whats
                                    </button>
                                    <button className="flex-1 py-2 bg-blue-600 text-white rounded font-bold text-xs flex items-center justify-center gap-1">
                                        Ver <ChevronRight size={14}/>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-medium sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 pb-1 text-xs uppercase tracking-wider font-bold">Contrato / Cliente</th>
                                <th className="p-3 pb-1 text-xs uppercase tracking-wider font-bold">Unidade</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Vagas</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Status</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Último Contato</th>
                                <th className="p-3 pb-1 text-right text-xs uppercase tracking-wider font-bold">Valor Total</th>
                                <th className="p-3 pb-1 text-center text-xs uppercase tracking-wider font-bold">Ações</th>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
                                <th className="p-2"><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal bg-white dark:bg-slate-800 dark:text-white" value={filters.name} onChange={e => setFilters({...filters, name: e.target.value})}/></th>
                                <th className="p-2"><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal bg-white dark:bg-slate-800 dark:text-white" value={filters.unit} onChange={e => setFilters({...filters, unit: e.target.value})}/></th>
                                <th className="p-2"><input type="text" className="w-16 mx-auto block border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal text-center bg-white dark:bg-slate-800 dark:text-white" value={filters.spots} onChange={e => setFilters({...filters, spots: e.target.value})}/></th>
                                <th className="p-2"><select className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal bg-white dark:bg-slate-800 dark:text-white" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}><option value="All">Todos</option><option value="Active">Ativo</option><option value="Churn Risk">Risco</option><option value="Inactive">Inativo</option></select></th>
                                <th className="p-2 text-center text-xs text-slate-400 font-normal">-</th>
                                <th className="p-2"><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-normal text-right bg-white dark:bg-slate-800 dark:text-white" value={filters.value} onChange={e => setFilters({...filters, value: e.target.value})}/></th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredClients.map(client => {
                                const daysInactive = client.lastContact ? Math.floor((new Date().getTime() - new Date(client.lastContact).getTime()) / (1000 * 3600 * 24)) : 999;
                                return (
                                <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => handleOpenClient(client)}>
                                    <td className="p-3">
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">{client.name}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{client.contractId || '-'}</div>
                                    </td>
                                    <td className="p-3">
                                        <div className="text-xs text-slate-700 dark:text-slate-300">{client.unit || client.address || '-'}</div>
                                    </td>
                                    <td className="p-3 text-center text-xs text-slate-600 dark:text-slate-300">
                                        {client.parkingSpots || '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${client.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : client.status === 'Churn Risk' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            {client.status === 'Active' ? 'Ativo' : client.status === 'Churn Risk' ? 'Risco' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className={`text-xs ${daysInactive > 30 ? 'text-red-500 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {client.lastContact ? new Date(client.lastContact).toLocaleDateString() : '-'}
                                        </div>
                                        {daysInactive > 30 && <div className="text-[9px] text-red-400">{daysInactive} dias</div>}
                                    </td>
                                    <td className="p-3 text-right font-mono text-xs text-slate-700 dark:text-slate-300">
                                        {client.totalTablePrice ? `R$ ${client.totalTablePrice.toLocaleString()}` : client.ltv ? `R$ ${client.ltv.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={(e) => handleEditClick(e, client)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-500 dark:text-slate-400" title="Editar">
                                                <Edit size={14}/>
                                            </button>
                                            <button onClick={(e) => handleWhatsAppClick(e, client)} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400" title="WhatsApp">
                                                <MessageCircle size={14}/>
                                            </button>
                                            <button onClick={(e) => handleDeleteClick(e, client)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500 hover:text-red-600" title="Excluir">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* NEW CLIENT MODAL */}
            {isNewClientModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novo Cliente</h2>
                            <button onClick={() => setIsNewClientModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateClient} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Empresa / Nome</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientForm.name} onChange={e => setNewClientForm({...newClientForm, name: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CNPJ</label><input type="text" className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${cnpjError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} value={newClientForm.cnpj} onChange={handleCnpjChange}/>{cnpjError && <p className="text-red-500 text-xs mt-1">{cnpjError}</p>}</div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Contato Principal</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientForm.contactPerson} onChange={e => setNewClientForm({...newClientForm, contactPerson: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label><input type="email" className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${emailError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} value={newClientForm.email} onChange={handleEmailChange}/>{emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}</div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label><input type="text" className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${phoneError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} value={newClientForm.phone} onChange={handlePhoneChange}/>{phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}</div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Contrato (Mensal)</label><input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientForm.ltv} onChange={e => setNewClientForm({...newClientForm, ltv: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">CEP</label><div className="relative"><input type="text" className={`w-full border rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${cepError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}`} value={newClientForm.cep} onChange={handleCepChange} placeholder="00000-000" maxLength={9}/>{isLoadingCep && <div className="absolute right-3 top-3"><Loader2 className="animate-spin text-blue-500" size={16}/></div>}</div>{cepError && <p className="text-red-500 text-xs mt-1">{cepError}</p>}</div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newClientForm.address} onChange={e => setNewClientForm({...newClientForm, address: e.target.value})}/></div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Produtos Contratados</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {products.filter(p => p.active).map(prod => (
                                        <div 
                                            key={prod.id} 
                                            className={`p-2 rounded border cursor-pointer text-xs font-medium transition ${newClientForm.contractedProducts.includes(prod.name) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                                            onClick={() => toggleProductInForm(prod.name, false)}
                                        >
                                            {prod.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <CustomFieldRenderer 
                                fields={customFields} 
                                module="clients" 
                                values={newClientForm.metadata} 
                                onChange={(k, v) => setNewClientForm(prev => ({ ...prev, metadata: { ...prev.metadata, [k]: v } }))} 
                                className="pt-2 border-t border-slate-100 dark:border-slate-700"
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setIsNewClientModalOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                                    <CheckCircle size={18}/> Salvar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT CLIENT MODAL */}
            {isEditModalOpen && clientToEdit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Editar Cliente</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Documento</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.document} onChange={e => setEditForm({...editForm, document: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label><input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Contrato</label><input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.value} onChange={e => setEditForm({...editForm, value: Number(e.target.value)})}/></div>
                                <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label><select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}><option value="Active">Ativo</option><option value="Inactive">Inativo</option><option value="Churn Risk">Risco de Churn</option></select></div>
                                <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})}/></div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Produtos</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {products.filter(p => p.active).map(prod => (
                                        <div 
                                            key={prod.id} 
                                            className={`p-2 rounded border cursor-pointer text-xs font-medium transition ${editForm.contractedProducts.includes(prod.name) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                                            onClick={() => toggleProductInForm(prod.name, true)}
                                        >
                                            {prod.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <CustomFieldRenderer 
                                fields={customFields} 
                                module="clients" 
                                values={editForm.metadata} 
                                onChange={(k, v) => setEditForm(prev => ({ ...prev, metadata: { ...prev.metadata, [k]: v } }))} 
                                className="pt-2 border-t border-slate-100 dark:border-slate-700"
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                                    <Save size={18}/> Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {isDeleteModalOpen && clientToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/30 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full text-red-600 dark:text-red-300 h-fit">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Cliente</h2>
                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium mt-1">Esta ação é irreversível.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                Você está prestes a excluir o cliente <strong>{clientToDelete.name}</strong>. Todos os dados associados (faturas, contratos, leads) podem ser afetados.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase mb-1">
                                    Justificativa da Exclusão <span className="text-red-500">*</span>
                                </label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none text-sm h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white" placeholder="Digite o motivo (mínimo 5 caracteres)..." value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">{deleteReason.length}/5 caracteres</p>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancelar</button>
                            <button onClick={handleConfirmDelete} disabled={deleteReason.length < 5} className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                <Trash2 size={16}/> Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* INACTIVE ALERT MODAL */}
            {showInactiveModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in border-t-4 border-yellow-500">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-yellow-50 dark:bg-yellow-900/30">
                            <div className="flex gap-4">
                                <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-full text-yellow-600 dark:text-yellow-200 h-fit">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Alerta de Inatividade</h2>
                                    <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium mt-1">Existem {inactiveClients.length} clientes ativos sem contato há mais de 30 dias.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowInactiveModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="p-6 max-h-[50vh] overflow-y-auto bg-white dark:bg-slate-800">
                            <div className="space-y-3">
                                {inactiveClients.map(client => {
                                    const days = Math.floor((new Date().getTime() - new Date(client.lastContact || client.since).getTime()) / (1000 * 3600 * 24));
                                    return (
                                        <div key={client.id} className="flex items-center justify-between p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition cursor-pointer" onClick={() => handleViewClientFromAlert(client)}>
                                            <div>
                                                <p className="font-bold text-slate-800 dark:text-slate-200">{client.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{client.contactPerson} • {client.phone}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded border border-yellow-200 dark:border-yellow-800">
                                                    <Clock size={12}/> {days} dias
                                                </span>
                                                <ChevronRight size={16} className="text-slate-400"/>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowInactiveModal(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* WHATSAPP MODAL */}
            {showWhatsAppModal && clientForWhatsApp && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MessageCircle size={20} className="text-green-600"/> Enviar WhatsApp
                            </h2>
                            <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Para: <strong>{clientForWhatsApp.name}</strong> ({clientForWhatsApp.phone})</p>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Mensagem</label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)} />
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {whatsappTemplates.map((tmpl, idx) => (
                                    <button key={idx} onClick={() => { const text = tmpl.text.replace('[Nome]', clientForWhatsApp.contactPerson.split(' ')[0]).replace('[Empresa]', clientForWhatsApp.name); setWhatsAppMessage(text); }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap border border-slate-200 dark:border-slate-600 transition">
                                        {tmpl.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button onClick={() => setShowWhatsAppModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancelar</button>
                            <button onClick={handleSendWhatsApp} className="px-6 py-2 rounded-lg bg-[#25D366] text-white font-bold hover:bg-[#128C7E] shadow-md transition flex items-center gap-2">
                                <Send size={16}/> Enviar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Client 360 Modal */}
            {selectedClient && (
                <Client360 
                    client={selectedClient}
                    leads={leads}
                    tickets={tickets}
                    invoices={invoices}
                    onClose={handleCloseClient}
                />
            )}
        </div>
    );
};
