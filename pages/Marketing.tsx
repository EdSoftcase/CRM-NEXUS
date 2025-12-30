
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { generateMarketingCopy } from '../services/geminiService';
import { Campaign, MarketingContent } from '../types';
import { Megaphone, PenTool, BarChart2, Copy, Plus, X, Trash2, Search, Save, Loader2, Library, Sparkles } from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';

export const Marketing: React.FC = () => {
    const { campaigns, marketingContents, addCampaign, addMarketingContent, deleteMarketingContent, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'generator' | 'library'>('generator');

    // Filters for Library
    const [librarySearch, setLibrarySearch] = useState('');
    const [channelFilter, setChannelFilter] = useState('All');

    // Generator State
    const [genForm, setGenForm] = useState({ topic: '', channel: 'Instagram', tone: 'Profissional' });
    const [generatedText, setGeneratedText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Campaign State
    const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({ status: 'Planned', channel: 'Instagram', budget: 0 });

    const filteredContents = useMemo(() => {
        return marketingContents.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(librarySearch.toLowerCase()) || 
                                 c.content.toLowerCase().includes(librarySearch.toLowerCase());
            const matchesChannel = channelFilter === 'All' || c.channel === channelFilter;
            return matchesSearch && matchesChannel;
        });
    }, [marketingContents, librarySearch, channelFilter]);

    const handleGenerate = async () => {
        if (!genForm.topic) return;
        setIsGenerating(true);
        try {
            const result = await generateMarketingCopy(genForm.topic, genForm.channel, genForm.tone);
            setGeneratedText(result);
        } catch (error) {
            addSystemNotification('Erro', 'Falha ao gerar conteúdo.', 'alert');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveContent = () => {
        if (!generatedText) return;
        const content: MarketingContent = {
            id: `MKT-${Date.now()}`,
            title: genForm.topic.slice(0, 40) + (genForm.topic.length > 40 ? '...' : ''),
            content: generatedText,
            channel: genForm.channel as any,
            status: 'Draft',
            tone: genForm.tone,
            createdAt: new Date().toISOString(),
            organizationId: currentUser?.organizationId
        };
        addMarketingContent(currentUser, content);
        addSystemNotification('Sucesso', 'Conteúdo salvo na biblioteca.', 'success');
        setGeneratedText('');
        setGenForm({ topic: '', channel: 'Instagram', tone: 'Profissional' });
    };

    const handleCreateCampaign = (e: React.FormEvent) => {
        e.preventDefault();
        const campaign: Campaign = {
            id: `CAMP-${Date.now()}`,
            name: newCampaign.name || '',
            status: newCampaign.status as any || 'Planned',
            channel: newCampaign.channel as any || 'Instagram',
            budget: Number(newCampaign.budget) || 0,
            spend: 0,
            leadsGenerated: 0,
            salesGenerated: 0,
            startDate: new Date().toISOString(),
            endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(),
            organizationId: currentUser?.organizationId
        };
        addCampaign(currentUser, campaign);
        setIsNewCampaignOpen(false);
        setNewCampaign({ status: 'Planned', channel: 'Instagram', budget: 0 });
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
                        <PenTool size={16}/> Gerador de Copy
                    </button>
                    <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'library' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <Library size={16}/> Biblioteca
                    </button>
                    <button onClick={() => setActiveTab('campaigns')} className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'campaigns' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <BarChart2 size={16}/> Campanhas
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {activeTab === 'generator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in pb-10">
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Sparkles className="text-purple-500" size={20}/> Brainstorming com IA</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Sobre o que vamos escrever?</label>
                                        <textarea 
                                            className="w-full border border-slate-300 dark:border-slate-700 rounded-xl p-4 h-32 outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white resize-none text-sm"
                                            placeholder="Ex: Promoção de 15% para novos clientes de automação veicular..."
                                            value={genForm.topic}
                                            onChange={e => setGenForm({...genForm, topic: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Canal</label>
                                            <select className="w-full border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-700 text-sm" value={genForm.channel} onChange={e => setGenForm({...genForm, channel: e.target.value})}>
                                                <option>Instagram</option><option>LinkedIn</option><option>Email</option><option>Blog</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Tom de Voz</label>
                                            <select className="w-full border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-700 text-sm" value={genForm.tone} onChange={e => setGenForm({...genForm, tone: e.target.value})}>
                                                <option>Profissional</option><option>Persuasivo</option><option>Amigável</option><option>Urgente</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleGenerate}
                                        disabled={isGenerating || !genForm.topic}
                                        className="w-full bg-purple-600 text-white font-black py-4 rounded-xl hover:bg-purple-700 transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Sparkles size={20}/>}
                                        {isGenerating ? 'IA PROCESSANDO...' : 'GERAR CONTEÚDO AGORA'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col min-h-[400px]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg flex items-center gap-2"><PenTool className="text-slate-400" size={20}/> Rascunho Gerado</h3>
                                {generatedText && <button onClick={() => { navigator.clipboard.writeText(generatedText); addSystemNotification('Copiado', 'Texto copiado.', 'success'); }} className="text-purple-600 font-bold text-xs flex items-center gap-1 hover:underline"><Copy size={14}/> Copiar</button>}
                            </div>
                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-6 border border-dashed border-slate-300 dark:border-slate-700 overflow-y-auto">
                                {isGenerating ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Loader2 size={40} className="animate-spin text-purple-500 mb-4"/>
                                        <p className="animate-pulse">A IA está escrevendo para você...</p>
                                    </div>
                                ) : generatedText ? (
                                    <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">{generatedText}</div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-30">
                                        <PenTool size={48} className="mb-2"/>
                                        <p>Seu conteúdo aparecerá aqui.</p>
                                    </div>
                                )}
                            </div>
                            {generatedText && (
                                <button onClick={handleSaveContent} className="mt-4 w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition flex items-center justify-center gap-2">
                                    <Save size={18}/> SALVAR NA BIBLIOTECA
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'library' && (
                    <div className="space-y-6 animate-fade-in pb-10">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <SectionTitle title="Biblioteca de Conteúdo" subtitle="Gerencie seus posts e textos salvos." />
                            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-sm outline-none w-48 focus:w-64 transition-all" value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        
                        {filteredContents.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                                <Library size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>Nenhum conteúdo localizado.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredContents.map(content => (
                                    <div key={content.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <Badge color="purple">{content.channel}</Badge>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(content.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <button onClick={() => deleteMarketingContent(currentUser, content.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                        </div>
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{content.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-4 leading-relaxed">{content.content}</p>
                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{content.tone}</span>
                                            <button onClick={() => { navigator.clipboard.writeText(content.content); addSystemNotification('Sucesso', 'Copiado!', 'success'); }} className="text-xs font-bold text-purple-600 flex items-center gap-1 hover:underline"><Copy size={12}/> Copiar</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'campaigns' && (
                    <div className="space-y-6 animate-fade-in pb-10">
                        <div className="flex justify-between items-center">
                            <SectionTitle title="Campanhas de Marketing" subtitle="Monitoramento de ROI e performance de anúncios." />
                            <button onClick={() => setIsNewCampaignOpen(true)} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-purple-700 transition shadow-md"><Plus size={18}/> Nova Campanha</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {campaigns.map(camp => (
                                <div key={camp.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/30">
                                        <div>
                                            <Badge color={camp.status === 'Active' ? 'green' : 'gray'}>{camp.status === 'Active' ? 'Ativa' : 'Pausada'}</Badge>
                                            <h3 className="font-bold text-lg mt-2 text-slate-800 dark:text-white leading-tight">{camp.name}</h3>
                                            <p className="text-xs text-slate-500 mt-1">{camp.channel}</p>
                                        </div>
                                        <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600"><BarChart2 size={24}/></div>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 gap-4 flex-1">
                                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Investido</p><p className="font-bold text-slate-800 dark:text-white">R$ {camp.spend.toLocaleString()}</p></div>
                                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Budget</p><p className="font-bold text-slate-800 dark:text-white">R$ {camp.budget.toLocaleString()}</p></div>
                                        <div className="col-span-2 pt-2">
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-slate-500">Utilização do Orçamento</span>
                                                <span className="font-bold">{camp.budget > 0 ? Math.round((camp.spend / camp.budget) * 100) : 0}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-purple-600 h-full" style={{width: `${Math.min(100, (camp.budget > 0 ? (camp.spend / camp.budget) * 100 : 0))}%`}}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {campaigns.length === 0 && (
                                <div className="col-span-3 text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl italic">
                                    Nenhuma campanha cadastrada.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* NEW CAMPAIGN MODAL */}
            {isNewCampaignOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Criar Nova Campanha</h3>
                            <button onClick={() => setIsNewCampaignOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Campanha</label><input required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-purple-500" value={newCampaign.name || ''} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} placeholder="Ex: Natal LPR 2024" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Canal</label><select className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-sm outline-none" value={newCampaign.channel} onChange={e => setNewCampaign({...newCampaign, channel: e.target.value as any})}><option>Instagram</option><option>LinkedIn</option><option>Google Ads</option><option>Meta Ads</option><option>Email</option></select></div>
                                <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Budget (R$)</label><input type="number" required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-sm outline-none" value={newCampaign.budget || ''} onChange={e => setNewCampaign({...newCampaign, budget: Number(e.target.value)})} placeholder="0,00" /></div>
                            </div>
                            <button className="w-full bg-purple-600 text-white font-bold py-3.5 rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all mt-4">LANÇAR CAMPANHA</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
