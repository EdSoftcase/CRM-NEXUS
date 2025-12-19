
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { generateMarketingCopy } from '../services/geminiService';
import { Campaign, MarketingContent } from '../types';
import { Megaphone, PenTool, Calendar, Share2, TrendingUp, BarChart2, CheckCircle, Clock, Copy, Plus, X, Trash2, Instagram, Linkedin, Mail, Search, Users, Edit2, DollarSign, Save, Loader2, Library, Edit3, Send, RotateCcw, Sparkles, Filter } from 'lucide-react';
import { Badge, KPICard, SectionTitle } from '../components/Widgets';
import { RichTextEditor } from '../components/RichTextEditor';

export const Marketing: React.FC = () => {
    const { campaigns, marketingContents, addCampaign, updateCampaign, addMarketingContent, updateMarketingContent, deleteMarketingContent, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'generator' | 'library'>('generator');

    // Filters for Library
    const [librarySearch, setLibrarySearch] = useState('');
    const [channelFilter, setChannelFilter] = useState('All');

    const filteredContents = useMemo(() => {
        return marketingContents.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(librarySearch.toLowerCase()) || 
                                 c.content.toLowerCase().includes(librarySearch.toLowerCase());
            const matchesChannel = channelFilter === 'All' || c.channel === channelFilter;
            return matchesSearch && matchesChannel;
        });
    }, [marketingContents, librarySearch, channelFilter]);

    // Other states and handlers...
    const [genForm, setGenForm] = useState({ topic: '', channel: 'Instagram', tone: 'Profissional' });
    const [generatedText, setGeneratedText] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({ status: 'Planned', channel: 'Instagram' });
    const [isEditContentOpen, setIsEditContentOpen] = useState(false);
    const [contentToEdit, setContentToEdit] = useState<MarketingContent | null>(null);

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
                        <PenTool size={16}/> Gerador
                    </button>
                    <button onClick={() => setActiveTab('library')} className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'library' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <Library size={16}/> Biblioteca
                    </button>
                    <button onClick={() => setActiveTab('campaigns')} className={`px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition whitespace-nowrap ${activeTab === 'campaigns' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        <TrendingUp size={16}/> Campanhas
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                {activeTab === 'library' && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <SectionTitle title="Biblioteca de Conteúdo" subtitle="Gerencie seus posts e textos salvos." />
                            <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar na biblioteca..." 
                                        className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border rounded-lg text-sm outline-none w-64"
                                        value={librarySearch}
                                        onChange={e => setLibrarySearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 border-l pl-4 dark:border-slate-600">
                                    <Filter size={14} className="text-slate-400"/>
                                    <select 
                                        className="bg-transparent border-none text-sm outline-none font-medium text-slate-600 dark:text-slate-300"
                                        value={channelFilter}
                                        onChange={e => setChannelFilter(e.target.value)}
                                    >
                                        <option value="All">Todos Canais</option>
                                        <option value="Instagram">Instagram</option>
                                        <option value="LinkedIn">LinkedIn</option>
                                        <option value="Email">Email</option>
                                        <option value="Blog">Blog</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {filteredContents.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-xl">
                                <Library size={48} className="mx-auto mb-2 opacity-20"/>
                                <p>Nenhum conteúdo encontrado com esses filtros.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredContents.map(content => (
                                    <div key={content.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-5 flex flex-col hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                {content.channel === 'Instagram' ? <Instagram size={16} className="text-pink-600"/> : content.channel === 'LinkedIn' ? <Linkedin size={16} className="text-blue-700"/> : content.channel === 'Email' ? <Mail size={16} className="text-orange-500"/> : <Library size={16}/>}
                                                <span className="text-xs font-bold text-slate-500 uppercase">{content.channel}</span>
                                            </div>
                                            <Badge color={content.status === 'Published' ? 'green' : 'yellow'}>{content.status === 'Published' ? 'Publicado' : 'Rascunho'}</Badge>
                                        </div>
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{content.title}</h3>
                                        <p className="text-xs text-slate-400 mb-3 line-clamp-3" dangerouslySetInnerHTML={{__html: content.content}}></p>
                                        <div className="flex justify-end gap-2 pt-3 border-t">
                                            <button onClick={() => deleteMarketingContent(currentUser, content.id)} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
                                            <button onClick={() => { setContentToEdit(content); setIsEditContentOpen(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition"><Edit3 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {/* ... (Other tabs generation/campaigns) ... */}
            </div>
        </div>
    );
};
