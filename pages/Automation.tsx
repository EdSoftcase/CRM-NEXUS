
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Workflow, TriggerType, ActionType, WorkflowAction } from '../types';
import { Workflow as WorkflowIcon, Plus, Play, Pause, Trash2, Edit2, Zap, ArrowDown, Mail, Bell, CheckSquare, Settings, X, Save, Box, Activity, ChevronRight, AlertCircle } from 'lucide-react';

export const Automation: React.FC = () => {
    const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, triggerAutomation, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    
    // UI State
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

    // Form State
    const [wfName, setWfName] = useState('');
    const [wfTrigger, setWfTrigger] = useState<TriggerType>('lead_created');
    const [wfActions, setWfActions] = useState<WorkflowAction[]>([]);

    const triggerOptions: { value: TriggerType; label: string; icon: any }[] = [
        { value: 'lead_created', label: 'Novo Lead Criado', icon: Zap },
        { value: 'deal_won', label: 'Negócio Ganho', icon: Zap },
        { value: 'deal_lost', label: 'Negócio Perdido', icon: Zap },
        { value: 'ticket_created', label: 'Ticket Aberto', icon: Zap },
        { value: 'client_churn_risk', label: 'Risco de Churn Detectado', icon: Zap },
    ];

    const actionOptions: { value: ActionType; label: string; icon: any; desc: string }[] = [
        { value: 'create_task', label: 'Criar Tarefa', icon: CheckSquare, desc: 'Adiciona uma tarefa na agenda' },
        { value: 'send_email', label: 'Enviar E-mail', icon: Mail, desc: 'Simula envio de email' },
        { value: 'notify_slack', label: 'Notificação Slack', icon: Bell, desc: 'Alerta externo' },
        { value: 'update_field', label: 'Atualizar Campo', icon: Box, desc: 'Muda dados do registro' },
    ];

    const handleOpenBuilder = (workflow?: Workflow) => {
        if (workflow) {
            setEditingWorkflow(workflow);
            setWfName(workflow.name);
            setWfTrigger(workflow.trigger);
            setWfActions(workflow.actions);
        } else {
            setEditingWorkflow(null);
            setWfName('');
            setWfTrigger('lead_created');
            setWfActions([]);
        }
        setIsBuilderOpen(true);
    };

    const handleAddAction = (index?: number) => {
        const newAction: WorkflowAction = {
            id: `act-${Date.now()}`,
            type: 'create_task', 
            config: { template: '', target: '' }
        };
        if (index !== undefined) {
            const newActions = [...wfActions];
            newActions.splice(index + 1, 0, newAction);
            setWfActions(newActions);
        } else {
            setWfActions([...wfActions, newAction]);
        }
    };

    const handleUpdateAction = (id: string, field: string, value: any) => {
        setWfActions(prev => prev.map(a => {
            if (a.id === id) {
                if (field === 'type') return { ...a, type: value };
                return { ...a, config: { ...a.config, [field]: value } };
            }
            return a;
        }));
    };

    const handleRemoveAction = (id: string) => {
        setWfActions(prev => prev.filter(a => a.id !== id));
    };

    const handleSaveWorkflow = () => {
        if (!wfName) {
            addSystemNotification('Erro', 'Nome do fluxo é obrigatório', 'warning');
            return;
        }
        if (wfActions.length === 0) {
            addSystemNotification('Erro', 'Adicione pelo menos uma ação', 'warning');
            return;
        }

        const workflowData: Workflow = {
            id: editingWorkflow ? editingWorkflow.id : `WF-${Date.now()}`,
            name: wfName,
            active: true,
            trigger: wfTrigger,
            actions: wfActions,
            runs: editingWorkflow ? editingWorkflow.runs : 0,
            organizationId: currentUser.organizationId
        };

        if (editingWorkflow) {
            updateWorkflow(currentUser, workflowData);
        } else {
            addWorkflow(currentUser, workflowData);
        }
        setIsBuilderOpen(false);
    };

    const handleTestRun = () => {
        if (confirm("Isso irá disparar este fluxo agora com dados de teste. Deseja continuar?")) {
            triggerAutomation(wfTrigger, { name: 'Teste RPA', email: 'test@robot.com', company: 'Nexus Inc' });
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header List */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <WorkflowIcon className="text-indigo-600 dark:text-indigo-400"/> Nexus Flow (RPA)
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Automação inteligente de processos de negócios.</p>
                </div>
                <button 
                    onClick={() => handleOpenBuilder()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition"
                >
                    <Plus size={18}/> Criar Robô
                </button>
            </div>

            {/* Workflow Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map(wf => (
                    <div key={wf.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition relative group">
                        <div className={`h-1.5 w-full ${wf.active ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg truncate pr-10">{wf.name}</h3>
                                <div className="flex gap-1 absolute top-4 right-4">
                                    <button onClick={() => updateWorkflow(currentUser, { ...wf, active: !wf.active })} className={`p-1.5 rounded-full transition ${wf.active ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-700 dark:text-slate-300'}`}>
                                        {wf.active ? <Play size={14} fill="currentColor"/> : <Pause size={14} fill="currentColor"/>}
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-4 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                                <Zap size={12} className="text-amber-500"/> 
                                <span className="font-medium truncate">{triggerOptions.find(t => t.value === wf.trigger)?.label}</span>
                            </div>

                            <div className="space-y-3 relative pl-4 border-l-2 border-slate-100 dark:border-slate-700 ml-1 mb-4">
                                {wf.actions.slice(0, 3).map((act, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <div className="absolute -left-[5px] w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                                        <span>{actionOptions.find(a => a.value === act.type)?.label}</span>
                                    </div>
                                ))}
                                {wf.actions.length > 3 && <span className="text-xs text-slate-400 dark:text-slate-500 italic block pl-2">+ {wf.actions.length - 3} passos</span>}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="text-xs text-slate-400 dark:text-slate-500">
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{wf.runs}</span> execuções
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button onClick={() => deleteWorkflow(currentUser, wf.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
                                    <button onClick={() => handleOpenBuilder(wf)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded"><Edit2 size={16}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* BUILDER MODAL (Visual Editor) */}
            {isBuilderOpen && (
                <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 z-[100] flex flex-col animate-fade-in transition-colors">
                    {/* Toolbar */}
                    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex justify-between items-center shadow-sm shrink-0 z-20 transition-colors">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsBuilderOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400"><X size={24}/></button>
                            <input 
                                type="text" 
                                className="text-xl font-bold text-slate-800 dark:text-white outline-none border-b border-transparent focus:border-indigo-500 bg-transparent placeholder:text-slate-400"
                                value={wfName}
                                onChange={(e) => setWfName(e.target.value)}
                                placeholder="Nome do Robô..."
                            />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleTestRun} className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-lg font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition flex items-center gap-2">
                                <Activity size={18}/> Testar
                            </button>
                            <button onClick={handleSaveWorkflow} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-md flex items-center gap-2">
                                <Save size={18}/> Salvar Fluxo
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden relative">
                        {/* Background Grid Pattern */}
                        <div className="absolute inset-0 z-0 opacity-10 dark:opacity-20 pointer-events-none" 
                             style={{backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                        </div>

                        {/* FLOW CANVAS - CENTERED */}
                        <div className="flex-1 overflow-y-auto relative z-10 flex justify-center py-10">
                            <div className="w-full max-w-xl flex flex-col items-center pb-32">
                                
                                {/* START NODE (TRIGGER) */}
                                <div className="w-64 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-lg border-t-4 border-amber-500 flex flex-col mb-2 relative group hover:scale-105 transition-transform duration-200">
                                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400"><Zap size={20}/></div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Gatilho (Start)</p>
                                            <h4 className="font-bold text-slate-800 dark:text-white text-sm">Quando...</h4>
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <select 
                                            className="w-full text-sm p-2 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 outline-none focus:border-amber-500 dark:focus:border-amber-500 text-slate-800 dark:text-white"
                                            value={wfTrigger}
                                            onChange={(e) => setWfTrigger(e.target.value as TriggerType)}
                                        >
                                            {triggerOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    {/* Output Connector */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-900 z-20"></div>
                                </div>

                                {/* CONNECTOR LINE */}
                                <div className="h-8 w-0.5 bg-slate-300 dark:bg-slate-600 my-1"></div>

                                {/* ACTIONS NODES */}
                                {wfActions.map((action, index) => (
                                    <React.Fragment key={action.id}>
                                        {/* Action Card */}
                                        <div className="w-80 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 flex flex-col relative group animate-scale-in">
                                            {/* Remove Button */}
                                            <button onClick={() => handleRemoveAction(action.id)} className="absolute -right-3 -top-3 bg-white dark:bg-slate-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-full shadow border border-slate-200 dark:border-slate-600 opacity-0 group-hover:opacity-100 transition z-20">
                                                <X size={14}/>
                                            </button>

                                            <div className="p-4 flex items-start gap-3 border-b border-slate-50 dark:border-slate-700">
                                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 mt-1">
                                                    {actionOptions.find(a => a.value === action.type)?.icon ? React.createElement(actionOptions.find(a => a.value === action.type)!.icon, {size: 18}) : <Settings size={18}/>}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Passo {index + 1}</span>
                                                    </div>
                                                    <select 
                                                        className="w-full font-bold text-slate-800 dark:text-white text-sm bg-transparent border-none p-0 outline-none cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 mb-2"
                                                        value={action.type}
                                                        onChange={(e) => handleUpdateAction(action.id, 'type', e.target.value)}
                                                    >
                                                        {actionOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                                    </select>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{actionOptions.find(a => a.value === action.type)?.desc}</p>
                                                    
                                                    {/* Config Inputs */}
                                                    {action.type === 'create_task' && (
                                                        <input 
                                                            type="text" 
                                                            className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 outline-none text-slate-800 dark:text-white"
                                                            placeholder="Título da Tarefa (Use {name} para variável)"
                                                            value={action.config.template || ''}
                                                            onChange={(e) => handleUpdateAction(action.id, 'template', e.target.value)}
                                                        />
                                                    )}
                                                    {action.type === 'send_email' && (
                                                        <textarea 
                                                            className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 outline-none resize-none h-16 text-slate-800 dark:text-white"
                                                            placeholder="Corpo do Email..."
                                                            value={action.config.template || ''}
                                                            onChange={(e) => handleUpdateAction(action.id, 'template', e.target.value)}
                                                        />
                                                    )}
                                                    {action.type === 'notify_slack' && (
                                                        <input 
                                                            type="text" 
                                                            className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 outline-none text-slate-800 dark:text-white"
                                                            placeholder="#canal ou @usuario"
                                                            value={action.config.target || ''}
                                                            onChange={(e) => handleUpdateAction(action.id, 'target', e.target.value)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Connector Line */}
                                        <div className="h-8 w-0.5 bg-slate-300 dark:bg-slate-600 my-1 relative group/line">
                                            {/* Add Button on Line Hover */}
                                            <button 
                                                onClick={() => handleAddAction(index)}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-400 shadow-sm opacity-0 group-hover/line:opacity-100 transition z-20"
                                            >
                                                <Plus size={14}/>
                                            </button>
                                        </div>
                                    </React.Fragment>
                                ))}

                                {/* ADD END NODE */}
                                <button 
                                    onClick={() => handleAddAction()}
                                    className="w-64 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition cursor-pointer gap-2 bg-white/50 dark:bg-slate-800/50"
                                >
                                    <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm"><Plus size={20}/></div>
                                    <span className="text-sm font-bold">Adicionar Ação</span>
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
