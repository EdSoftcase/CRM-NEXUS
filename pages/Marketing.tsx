
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { generateMarketingCopy } from '../services/geminiService';
import { Campaign, MarketingContent } from '../types';
import { Megaphone, PenTool, Calendar, Share2, TrendingUp, BarChart2, CheckCircle, Clock, Copy, Plus, X, Trash2, Instagram, Linkedin, Mail, Search, Users, Edit2, DollarSign, Save, Loader2, Library, Edit3, Send, RotateCcw, Sparkles } from 'lucide-react';
import { Badge, KPICard, SectionTitle } from '../components/Widgets';
import { RichTextEditor } from '../components/RichTextEditor';

export const Marketing: React.FC = () => {
    const { campaigns, marketingContents, addCampaign, updateCampaign, addMarketingContent, updateMarketingContent, deleteMarketingContent, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'generator' | 'library'>('generator');

    // Generator State
    const [genForm, setGenForm] = useState({ topic: '', channel: 'Instagram', tone: 'Profissional' });
    const [generatedText, setGeneratedText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // New Campaign State
    const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({ status: 'Planned', channel: 'Instagram' });

    // Edit Campaign State
    const [isEditCampaignOpen, setIsEditCampaignOpen] = useState(false);
    const [campaignToEdit, setCampaignToEdit] = useState<Campaign | null>(null);

    // Content Editing State
    const [isEditContentOpen, setIsEditContentOpen] = useState(false);
    const [contentToEdit, setContentToEdit] = useState<MarketingContent | null>(null);

    // --- GENERATOR LOGIC ---
    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!genForm.topic.trim()) {
            addSystemNotification('Campo Obrigatório', 'Por favor, preencha o campo Tema / Assunto.', 'warning');
            return;
        }

        setIsGenerating(true);
        try {
            const text = await generateMarketingCopy(genForm.topic, genForm.channel, genForm.tone);
            if (text) {
                setGeneratedText(text);
            } else {
                setGeneratedText("Não foi possível gerar o conteúdo no momento. Tente novamente.");
            }
        } catch (error) {
            console.error("Erro na geração:", error);
            setGeneratedText("Erro ao conectar com a IA. Verifique sua conexão.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveContent = () => {
        if(!generatedText) return;
        
        const newContent: MarketingContent = {
            id: `CONT-${Date.now()}`,
            title: genForm.topic || 'Conteúdo Sem Título',
            content: generatedText,
            channel: genForm.channel as any,
            status: 'Draft',
            tone: genForm.tone,
            createdAt: new Date().toISOString()
        };
        
        addMarketingContent(currentUser, newContent);
        addSystemNotification('Sucesso', 'Conteúdo salvo na biblioteca!', 'success');
    };

    const handleClearGenerator = () => {
        setGenForm({ topic: '', channel: 'Instagram', tone: 'Profissional' });
        setGeneratedText('');
    };

    // --- CAMPAIGN LOGIC ---
    const handleSaveCampaign = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newCampaign.name || !newCampaign.budget) return;

        const campaign: Campaign = {
            id: `CMP-${Date.now()}`,
            name: newCampaign.name,
            status: newCampaign.status as any,
            channel: newCampaign.channel as any,
            budget: Number(newCampaign.budget),
            spend: 0,
            leadsGenerated: 0,
            salesGenerated: 0,
            startDate: new Date().toISOString(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString()
        };

        addCampaign(currentUser, campaign);
        setIsNewCampaignOpen(false);
        setNewCampaign({ status: 'Planned', channel: 'Instagram' });
        addSystemNotification('Campanha Criada', `Campanha "${campaign.name}" iniciada.`, 'success');
    };

    const handleUpdateCampaign = (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignToEdit) return;

        updateCampaign(currentUser, campaignToEdit);
        setIsEditCampaignOpen(false);
        setCampaignToEdit(null);
        addSystemNotification('Campanha Atualizada', 'Dados da campanha salvos com sucesso.', 'success');
    };

    const openEditCampaign = (campaign: Campaign) => {
        setCampaignToEdit({ ...campaign });
        setIsEditCampaignOpen(true);
    };

    const calculateROI = (campaign: Campaign) => {
        const spend = Number(campaign.spend) || 0;
        const revenue = Number(campaign.salesGenerated) * 1000; // Mock value per sale
        
        if (spend === 0) {
            return revenue > 0 ? 100 : 0;
        }
        
        return ((revenue - spend) / spend) * 100;
    };

    // --- CONTENT MANAGEMENT LOGIC ---
    const openEditContent = (content: MarketingContent) => {
        setContentToEdit({...content});
        setIsEditContentOpen(true);
    };

    const handleUpdateContent = (e: React.FormEvent) => {
        e.preventDefault();
        if (contentToEdit) {
            updateMarketingContent(currentUser, contentToEdit);
            setIsEditContentOpen(false);
            setContentToEdit(null);
            addSystemNotification('Conteúdo Atualizado', 'Alterações salvas.', 'success');
        }
    };

    const handlePublishContent = (content: MarketingContent) => {
        if(confirm("Deseja marcar este conteúdo como Publicado?")) {
            updateMarketingContent(currentUser, { ...content, status: 'Published' });
            addSystemNotification('Publicado', 'Status do conteúdo alterado para Publicado.', 'info');
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="text-purple-600 dark:text-purple-400"/> Nexus Marketing Hub
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Crie conteúdo com IA e gerencie suas campanhas.</p>
                </div>
                <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 overflow-x-auto shadow-sm">
                    <button onClick={() => setActiveTab('generator')} className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'generator' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <PenTool size={16}/> Gerador de Conteúdo
                    </button>
                    <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'library' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <Library size={16}/> Biblioteca
                    </button>
                    <button onClick={() => setActiveTab('campaigns')} className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'campaigns' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <TrendingUp size={16}/> Campanhas & ROI
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {/* --- GENERATOR TAB --- */}
                {activeTab === 'generator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                        {/* LEFT: FORM */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-slate-800 dark:text-white">Gerador de Conteúdo IA</h3>
                                    <button onClick={handleClearGenerator} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1" title="Limpar campos">
                                        <RotateCcw size={12}/> Limpar
                                    </button>
                                </div>
                                <form onSubmit={handleGenerate} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tema / Assunto</label>
                                        <input 
                                            required 
                                            type="text" 
                                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors" 
                                            placeholder="Ex: Promoção de Natal, Dicas de Gestão..." 
                                            value={genForm.topic || ''} 
                                            onChange={(e) => setGenForm({...genForm, topic: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Canal</label>
                                            <div className="relative">
                                                <select 
                                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white appearance-none cursor-pointer transition-colors"
                                                    value={genForm.channel || 'Instagram'} 
                                                    onChange={e => setGenForm({...genForm, channel: e.target.value})}
                                                >
                                                    <option>Instagram</option>
                                                    <option>LinkedIn</option>
                                                    <option>Email</option>
                                                    <option>Blog</option>
                                                </select>
                                                {/* Visual Arrow */}
                                                <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500 dark:text-slate-400">
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tom de Voz</label>
                                            <div className="relative">
                                                <select 
                                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white appearance-none cursor-pointer transition-colors"
                                                    value={genForm.tone || 'Profissional'} 
                                                    onChange={e => setGenForm({...genForm, tone: e.target.value})}
                                                >
                                                    <option>Profissional</option>
                                                    <option>Divertido/Descontraído</option>
                                                    <option>Urgente/Vendas</option>
                                                    <option>Educativo</option>
                                                    <option>Inspirador</option>
                                                </select>
                                                 {/* Visual Arrow */}
                                                 <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500 dark:text-slate-400">
                                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={isGenerating} 
                                        className="w-full bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-purple-500/20"
                                    >
                                        {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <><Sparkles size={18}/> Gerar Conteúdo</>}
                                    </button>
                                </form>
                            </div>

                            {/* Library Preview */}
                            <div className="bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 transition-colors">
                                <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-3 flex items-center gap-2"><Clock size={14}/> Recentes na Biblioteca</h4>
                                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                    {marketingContents.length === 0 ? (
                                        <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-4">Nenhum conteúdo salvo ainda.</p>
                                    ) : (
                                        marketingContents.slice(0, 5).map(content => (
                                            <div key={content.id} className="bg-white dark:bg-slate-800 p-3 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center group transition-colors hover:border-purple-300 dark:hover:border-purple-500 cursor-pointer" onClick={() => setGeneratedText(content.content)}>
                                                <div className="truncate flex-1">
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{content.title}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{content.channel} • {content.tone}</p>
                                                </div>
                                                <div className="text-purple-500 opacity-0 group-hover:opacity-100 transition">
                                                    <Copy size={14}/>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: EDITOR */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden transition-colors">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                                <h3 className="font-bold text-slate-700 dark:text-white flex items-center gap-2"><Edit3 size={18} className="text-purple-500"/> Resultado</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => { navigator.clipboard.writeText(generatedText); addSystemNotification('Copiado', 'Texto copiado para área de transferência.', 'info'); }} className="text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition" title="Copiar"><Copy size={18}/></button>
                                    <button onClick={handleSaveContent} disabled={!generatedText} className="text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50" title="Salvar na Biblioteca"><CheckCircle size={18}/></button>
                                </div>
                            </div>
                            
                            {/* NEW: Rich Text Editor for Generated Content */}
                            <RichTextEditor 
                                value={generatedText || ''} 
                                onChange={setGeneratedText} 
                                className="flex-1 rounded-none border-0 border-b border-slate-100 dark:border-slate-700"
                                placeholder="O conteúdo gerado aparecerá aqui..."
                            />
                        </div>
                    </div>
                )}

                {/* --- LIBRARY TAB --- */}
                {activeTab === 'library' && (
                    <div className="space-y-6">
                        <SectionTitle title="Biblioteca de Conteúdo" subtitle="Gerencie seus posts e textos salvos." />
                        
                        {marketingContents.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <Library size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>Sua biblioteca está vazia. Gere conteúdos na aba "Gerador de Conteúdo".</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {marketingContents.map(content => (
                                    <div key={content.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col hover:shadow-md transition transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                {content.channel === 'Instagram' ? <Instagram size={16} className="text-pink-600 dark:text-pink-400"/> : content.channel === 'LinkedIn' ? <Linkedin size={16} className="text-blue-700 dark:text-blue-400"/> : content.channel === 'Email' ? <Mail size={16} className="text-orange-500 dark:text-orange-400"/> : <Library size={16} className="text-slate-500 dark:text-slate-400"/>}
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{content.channel}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${content.status === 'Published' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'}`}>
                                                {content.status === 'Published' ? 'Publicado' : 'Rascunho'}
                                            </span>
                                        </div>
                                        
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{content.title}</h3>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">Tom: {content.tone} • {new Date(content.createdAt).toLocaleDateString()}</p>
                                        
                                        <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded p-3 mb-4 text-sm text-slate-600 dark:text-slate-300 overflow-hidden relative border border-slate-100 dark:border-slate-700/50">
                                            <div className="line-clamp-4 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: content.content}}></div>
                                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-50 dark:from-slate-900/50 to-transparent"></div>
                                        </div>

                                        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                            <button onClick={() => deleteMarketingContent(currentUser, content.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" title="Excluir">
                                                <Trash2 size={16}/>
                                            </button>
                                            <button onClick={() => openEditContent(content)} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition" title="Editar">
                                                <Edit3 size={16}/>
                                            </button>
                                            {content.status !== 'Published' && (
                                                <button onClick={() => handlePublishContent(content)} className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition" title="Marcar como Publicado">
                                                    <Send size={16}/>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- CAMPAIGNS TAB --- */}
                {activeTab === 'campaigns' && (
                    <div className="space-y-6">
                        <div className="flex justify-end">
                            <button onClick={() => setIsNewCampaignOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-sm transition">
                                <Plus size={18}/> Nova Campanha
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map(camp => {
                                const roi = calculateROI(camp);
                                return (
                                    <div key={camp.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition relative group transition-colors">
                                        {/* Edit Button */}
                                        <button 
                                            onClick={() => openEditCampaign(camp)}
                                            className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-slate-700/80 hover:bg-purple-50 dark:hover:bg-purple-900/50 text-slate-400 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm border border-slate-100 dark:border-slate-600"
                                            title="Editar Campanha"
                                        >
                                            <Edit2 size={16}/>
                                        </button>

                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-4 pr-8">
                                                <Badge color={camp.status === 'Active' ? 'green' : camp.status === 'Completed' ? 'blue' : 'gray'}>{camp.status}</Badge>
                                                {camp.channel === 'Instagram' ? <Instagram size={18} className="text-pink-600 dark:text-pink-400"/> : camp.channel === 'LinkedIn' ? <Linkedin size={18} className="text-blue-700 dark:text-blue-400"/> : camp.channel === 'Email' ? <Mail size={18} className="text-orange-500 dark:text-orange-400"/> : <Search size={18} className="text-green-600 dark:text-green-400"/>}
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1 truncate">{camp.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Início: {new Date(camp.startDate).toLocaleDateString()}</p>
                                            
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Orçamento</p>
                                                    <p className="font-bold text-slate-700 dark:text-slate-200">R$ {camp.budget.toLocaleString()}</p>
                                                </div>
                                                <div className={`p-2 rounded border ${camp.spend > camp.budget ? 'bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-900' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700'}`}>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold">Gasto Real</p>
                                                    <p className={`font-bold ${camp.spend > camp.budget ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>R$ {camp.spend.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-700 pt-3">
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400" title="Leads Gerados">
                                                    <Users size={14}/> {camp.leadsGenerated}
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400" title="Vendas Confirmadas">
                                                    <CheckCircle size={14}/> {camp.salesGenerated}
                                                </div>
                                                <div className={`font-bold ${roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    ROI: {roi.toFixed(0)}%
                                                </div>
                                            </div>
                                        </div>
                                        {/* Progress Bar Budget */}
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5">
                                            <div 
                                                className={`h-1.5 ${camp.spend > camp.budget ? 'bg-red-500' : 'bg-purple-500'}`} 
                                                style={{width: `${Math.min((camp.spend / camp.budget) * 100, 100)}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {campaigns.length === 0 && (
                            <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                                <TrendingUp size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>Nenhuma campanha cadastrada.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL: NEW CAMPAIGN */}
            {isNewCampaignOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">Nova Campanha</h3>
                            <button onClick={() => setIsNewCampaignOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"/></button>
                        </div>
                        <form onSubmit={handleSaveCampaign} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome da Campanha</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" value={newCampaign.name || ''} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Canal</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newCampaign.channel || 'Instagram'} onChange={e => setNewCampaign({...newCampaign, channel: e.target.value as any})}><option>Instagram</option><option>LinkedIn</option><option>Email</option><option>Google Ads</option></select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newCampaign.status || 'Planned'} onChange={e => setNewCampaign({...newCampaign, status: e.target.value as any})}><option value="Planned">Planejado</option><option value="Active">Ativo</option></select>
                                </div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Orçamento Previsto (R$)</label><input required type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" value={newCampaign.budget || ''} onChange={e => setNewCampaign({...newCampaign, budget: Number(e.target.value)})} /></div>
                            <button type="submit" className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg hover:bg-purple-700 shadow-md">Criar Campanha</button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT CAMPAIGN (SPEND & METRICS) */}
            {isEditCampaignOpen && campaignToEdit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Edit2 size={18}/> Atualizar Campanha</h3>
                            <button onClick={() => setIsEditCampaignOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"/></button>
                        </div>
                        <form onSubmit={handleUpdateCampaign} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" value={campaignToEdit.name || ''} onChange={e => setCampaignToEdit({...campaignToEdit, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={campaignToEdit.status || 'Planned'} onChange={e => setCampaignToEdit({...campaignToEdit, status: e.target.value as any})}>
                                        <option value="Planned">Planejado</option>
                                        <option value="Active">Ativo</option>
                                        <option value="Completed">Concluído</option>
                                        <option value="Paused">Pausado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Canal</label>
                                    <input disabled type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400" value={campaignToEdit.channel || ''} />
                                </div>
                            </div>
                            
                            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 space-y-3">
                                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase border-b border-slate-200 dark:border-slate-600 pb-2 mb-2">Desempenho & Custos</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Gasto (Total R$)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                                        <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 pl-9 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" value={campaignToEdit.spend || ''} onChange={e => setCampaignToEdit({...campaignToEdit, spend: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Leads Gerados</label>
                                        <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" value={campaignToEdit.leadsGenerated || ''} onChange={e => setCampaignToEdit({...campaignToEdit, leadsGenerated: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Vendas (Qtd)</label>
                                        <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" value={campaignToEdit.salesGenerated || ''} onChange={e => setCampaignToEdit({...campaignToEdit, salesGenerated: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 shadow-md">
                                <Save size={18}/> Salvar Alterações
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT CONTENT */}
            {isEditContentOpen && contentToEdit && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Edit3 size={18}/> Editar Conteúdo</h3>
                            <button onClick={() => setIsEditContentOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"/></button>
                        </div>
                        <form onSubmit={handleUpdateContent} className="flex-1 flex flex-col p-6 overflow-hidden">
                            <div className="mb-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Título / Tema</label>
                                    <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500" value={contentToEdit.title || ''} onChange={e => setContentToEdit({...contentToEdit, title: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Status</label>
                                    <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={contentToEdit.status || 'Draft'} onChange={e => setContentToEdit({...contentToEdit, status: e.target.value as any})}>
                                        <option value="Draft">Rascunho</option>
                                        <option value="Scheduled">Agendado</option>
                                        <option value="Published">Publicado</option>
                                    </select>
                                </div>
                            </div>
                            
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Corpo do Texto</label>
                            
                            {/* NEW: Use RichTextEditor instead of textarea */}
                            <RichTextEditor 
                                value={contentToEdit.content || ''} 
                                onChange={(val) => setContentToEdit({...contentToEdit, content: val})}
                                className="flex-1 min-h-[200px]"
                            />

                            <div className="mt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsEditContentOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                                <button type="submit" className="px-6 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 flex items-center gap-2 shadow-md">
                                    <Save size={16}/> Salvar Edição
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
