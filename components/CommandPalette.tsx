
import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, UserPlus, FileText, CheckCircle, LayoutDashboard, Users, Briefcase, DollarSign, LifeBuoy, Code, Settings, Command } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

interface CommandPaletteProps {
    onNavigate: (module: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { clients, leads } = useData();
  const { currentUser } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const navigationItems = [
    { id: 'dashboard', label: 'Ir para Visão Geral', icon: LayoutDashboard, type: 'nav' },
    { id: 'commercial', label: 'Ir para Comercial / Leads', icon: Users, type: 'nav' },
    { id: 'clients', label: 'Ir para Carteira de Clientes', icon: Briefcase, type: 'nav' },
    { id: 'finance', label: 'Ir para Financeiro', icon: DollarSign, type: 'nav' },
    { id: 'support', label: 'Ir para Suporte', icon: LifeBuoy, type: 'nav' },
    { id: 'dev', label: 'Ir para Desenvolvimento', icon: Code, type: 'nav' },
    { id: 'settings', label: 'Ir para Configurações', icon: Settings, type: 'nav' },
  ];

  const actionItems = [
      { id: 'new_lead', label: 'Criar Novo Lead', icon: UserPlus, type: 'action' },
      { id: 'new_ticket', label: 'Abrir Ticket de Suporte', icon: FileText, type: 'action' },
  ];

  // Search Logic
  const filteredItems = [
      ...navigationItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase())),
      ...actionItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase())),
      // Dynamic Search for Clients
      ...clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).map(c => ({
          id: `client_${c.id}`,
          label: `Cliente: ${c.name}`,
          icon: Briefcase,
          type: 'client_search',
          payload: c
      }))
  ].slice(0, 10); // Limit results

  const handleSelect = (index: number) => {
      const item = filteredItems[index];
      if (!item) return;

      if (item.type === 'nav') {
          onNavigate(item.id);
      } else if (item.type === 'action') {
          if (item.id === 'new_lead') { onNavigate('commercial'); /* Logic to open modal needs state lift or event bus */ }
          if (item.id === 'new_ticket') { onNavigate('support'); }
      } else if (item.type === 'client_search') {
          onNavigate('clients');
      }
      setIsOpen(false);
  };

  const handleListKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === 'ArrowUp') {
          setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === 'Enter') {
          handleSelect(selectedIndex);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-start justify-center pt-[15vh] animate-fade-in">
        <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700">
                <Search className="text-slate-400" size={24}/>
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Digite um comando ou busque..." 
                    className="flex-1 text-lg outline-none text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-500 bg-transparent"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleListKeyDown}
                />
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                    <span className="font-sans">ESC</span> para fechar
                </div>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto">
                {filteredItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Command size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>Nenhum resultado encontrado.</p>
                    </div>
                ) : (
                    <div className="p-2">
                        {filteredItems.map((item, idx) => (
                            <div 
                                key={item.id}
                                onClick={() => handleSelect(idx)}
                                onMouseEnter={() => setSelectedIndex(idx)}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                    idx === selectedIndex 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                        idx === selectedIndex 
                                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}>
                                        <item.icon size={20} />
                                    </div>
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                {idx === selectedIndex && <ArrowRight size={16} className="text-blue-400"/>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400 px-4">
                <div className="flex gap-4">
                    <span><strong>↑↓</strong> para navegar</span>
                    <span><strong>↵</strong> para selecionar</span>
                </div>
                <span>Nexus CRM Enterprise</span>
            </div>
        </div>
    </div>
  );
};
