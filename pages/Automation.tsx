
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Workflow, TriggerType, ActionType, WorkflowAction } from '../types';
import { Workflow as WorkflowIcon, Plus, Play, Pause, Trash2, Edit2, Zap, ArrowDown, Mail, Bell, CheckSquare, Settings, X, Save, Box, Activity, ChevronRight, AlertCircle, Timer, Loader2 } from 'lucide-react';
import { Badge } from '../components/Widgets';

export const Automation: React.FC = () => {
    const { workflows, addWorkflow, updateWorkflow, deleteWorkflow, triggerAutomation, addSystemNotification, logAction } = useData();
    const { currentUser } = useAuth();
    
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [wfName, setWfName] = useState('');
    const [wfTrigger, setWfTrigger] = useState<TriggerType>('lead_created');
    const [wfActions, setWfActions] = useState<WorkflowAction[]>([]);

    const triggerOptions: { value: TriggerType; label: string; icon: any }[] = [
        { value: 'lead_created', label: 'Novo Lead Criado', icon: Zap },
        { value: 'deal_won', label: 'Negócio Ganho', icon: Zap },
        { value: 'deal_lost', label: 'Negócio Perdido', icon: Zap },
        { value: 'ticket_created', label: 'Ticket Aberto', icon: Zap },
        { value: 'client_churn_risk', label: 'Risco de Churn Detectado', icon: Zap },
        { value: 'project_stagnated', label: 'Projeto Estagnado (3d+)', icon: Timer },
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
            setWfActions([{ id: `act-${Date.now()}`, type: 'create_task', config: {} }]);
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

    const handleSaveWorkflow = async () => {
        if (!wfName) {
            addSystemNotification('Erro', 'Dê um nome ao robô.', 'warning');
            return;
        }
        setIsSaving(true);
        const workflowData: Workflow = {
            id: editingWorkflow ? editingWorkflow.id : `WF-${Date.now()}`,
            name: wfName,
            active: true,
            trigger: wfTrigger,
            actions: wfActions,
            runs: editingWorkflow ? editingWorkflow.runs : 0,
            organizationId: currentUser.organizationId
        };
        
        try {
            if (editingWorkflow) await updateWorkflow(currentUser, workflowData);
            else await addWorkflow(currentUser, workflowData);
            
            addSystemNotification('Sucesso', 'Configuração do robô salva no cloud.', 'success');
            setIsBuilderOpen(false);
        } catch (e) {
            addSystemNotification('Erro', 'Falha ao sincronizar robô.', 'alert');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestRun = async () => {
        setIsTesting(true);
        addSystemNotification('Simulação', 'Disparando fluxo de teste...', 'info');
        await new Promise(r => setTimeout(r, 1500));
        triggerAutomation(wfTrigger, { name: 'Teste RPA', email: 'test@robot.com', company: 'Nexus Inc' });
        setIsTesting(false);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Soft Flow (RPA)</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Motor de automação de processos baseado em eventos.</p>
                </div>
                <button 
                    onClick={() => handleOpenBuilder()}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                >
                    <Plus size={18}/> Novo Robô
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {workflows.map(wf => (
                    <div key={wf.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border p-8 shadow-sm group hover:border-indigo-600 transition-all relative overflow-hidden">
                        <div className={`absolute top-0 left-0 h-2 w-full ${wf.active ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-2xl text-indigo-600"><WorkflowIcon size={28}/></div>
                            <button onClick={() => updateWorkflow(currentUser, { ...wf, active: !wf.active })} className={`p-3 rounded-xl transition ${wf.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                {wf.active ? <Play size={18} fill="currentColor"/> : <Pause size={18} fill="currentColor"/>}
                            </button>
                        </div>
                        <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter mb-2 truncate">{wf.name}</h3>
                        <div className="flex items-center gap-2 mb-6">
                            <Badge color="purple">{wf.trigger.toUpperCase()}</Badge>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{wf.actions.length} Passos</span>
                        </div>
                        <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-700">
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Execuções</p>
                                <p className="font-bold text-slate-800 dark:text-white">{wf.runs}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleOpenBuilder(wf)} className="p-3 text-slate-400 hover:text-indigo-600 transition"><Edit2 size={18}/></button>
                                <button onClick={() => deleteWorkflow(currentUser, wf.id)} className="p-3 text-slate-400 hover:text-red-500 transition"><Trash2 size={18}/></button>
                            </div>
                        </div>
                    </div>
                ))}
                {workflows.length === 0 && (
                    <div className="col-span-3 py-24 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem]">
                        <WorkflowIcon size={64} className="mx-auto text-slate-200 mb-6"/>
                        <p className="text-slate-400 font-black uppercase tracking-widest">Nenhum robô configurado</p>
                    </div>
                )}
            </div>

            {isBuilderOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex flex-col animate-fade-in">
                    <div className="p-6 bg-white dark:bg-slate-900 border-b flex justify-between items-center border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsBuilderOpen(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={24}/></button>
                            <input className="text-2xl font-black uppercase tracking-tighter outline-none bg-transparent border-b-2 border-transparent focus:border-indigo-600" placeholder="Nome do Robô" value={wfName} onChange={e => setWfName(e.target.value)} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleTestRun} className="px-8 py-3 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                                {isTesting ? <Loader2 size={16} className="animate-spin"/> : <Activity size={16}/>} Simular Robô
                            </button>
                            <button onClick={handleSaveWorkflow} disabled={isSaving} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/30 flex items-center gap-2 disabled:opacity-50">
                                {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                {isSaving ? 'Salvando...' : 'Salvar Nexus Flow'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-12 bg-slate-50 dark:bg-slate-950 flex justify-center custom-scrollbar">
                        <div className="w-full max-w-2xl flex flex-col items-center">
                            <div className="w-80 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border shadow-2xl relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Gatilho (Início)</div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">Quando isso acontecer:</label>
                                <select className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-xl p-3 font-bold bg-slate-50 dark:bg-slate-900" value={wfTrigger} onChange={e => setWfTrigger(e.target.value as any)}>
                                    {triggerOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>

                            {wfActions.map((action, index) => (
                                <React.Fragment key={action.id}>
                                    <div className="h-12 w-0.5 bg-indigo-200 dark:bg-indigo-900/50"></div>
                                    <div className="w-[450px] bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border shadow-xl group relative">
                                        <button onClick={() => handleRemoveAction(action.id)} className="absolute -right-3 -top-3 bg-red-600 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition"><X size={16}/></button>
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600"><CheckSquare size={24}/></div>
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black uppercase text-slate-400">Ação {index + 1}</p>
                                                <select className="w-full font-black text-slate-900 dark:text-white uppercase tracking-tighter bg-transparent outline-none cursor-pointer" value={action.type} onChange={e => handleUpdateAction(action.id, 'type', e.target.value)}>
                                                    {actionOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <input className="w-full border-2 border-slate-50 dark:border-slate-700 rounded-xl p-3 text-sm font-medium bg-slate-50 dark:bg-slate-900 outline-none focus:border-indigo-600" placeholder="Configuração da tarefa / Mensagem..." value={action.config.template || ''} onChange={e => handleUpdateAction(action.id, 'template', e.target.value)} />
                                        </div>
                                    </div>
                                </React.Fragment>
                            ))}

                            <div className="h-12 w-0.5 bg-indigo-200 dark:bg-indigo-900/50"></div>
                            <button onClick={() => handleAddAction()} className="flex items-center gap-2 px-10 py-4 border-4 border-dashed border-indigo-100 dark:border-indigo-900/50 rounded-[2rem] text-indigo-300 font-black uppercase text-[10px] tracking-widest hover:border-indigo-500 hover:text-indigo-500 transition shadow-inner">
                                <Plus size={20}/> Adicionar Próximo Passo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
