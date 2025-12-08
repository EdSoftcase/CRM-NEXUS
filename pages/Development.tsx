
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Widgets';
import { Code, GitPullRequest, Layout, List, MessageSquare, Plus, Save, Clock, Folder, TrendingUp } from 'lucide-react';
import { Issue } from '../types';

export const Development: React.FC = () => {
  const { issues, updateIssue, addIssueNote } = useData();
  const { currentUser } = useAuth();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [newNote, setNewNote] = useState('');
  
  // Drag and Drop State
  const [draggedIssueId, setDraggedIssueId] = useState<string | null>(null);

  const columns = ['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];

  const handleSaveNote = () => {
      if (!selectedIssue || !newNote.trim()) return;
      addIssueNote(currentUser, selectedIssue.id, newNote);
      setNewNote('');
      const note = { id: 'temp', text: newNote, author: currentUser.name, created_at: new Date().toISOString() };
      setSelectedIssue({...selectedIssue, notes: [...(selectedIssue.notes || []), note]});
  };

  const handleProgressChange = (val: number) => {
      if (selectedIssue) {
          updateIssue(currentUser, selectedIssue.id, { progress: val });
          setSelectedIssue({ ...selectedIssue, progress: val });
      }
  };

  const handleStatusChange = (status: any) => {
      if (selectedIssue) {
          updateIssue(currentUser, selectedIssue.id, { status });
          setSelectedIssue({ ...selectedIssue, status });
      }
  };

  // --- DRAG AND DROP HANDLERS ---
  const handleDragStart = (e: React.DragEvent, issueId: string) => {
      setDraggedIssueId(issueId);
      e.dataTransfer.effectAllowed = 'move';
      // Make drag ghost cleaner
      const ghost = document.getElementById(`issue-${issueId}`);
      if (ghost) e.dataTransfer.setDragImage(ghost, 20, 20);
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
      e.preventDefault();
      if (draggedIssueId) {
          updateIssue(currentUser, draggedIssueId, { status: targetStatus as any });
          // If moving to Done, maybe auto set progress to 100?
          if (targetStatus === 'Done') {
               updateIssue(currentUser, draggedIssueId, { status: targetStatus as any, progress: 100 });
          }
          setDraggedIssueId(null);
      }
  };

  return (
    <div className="p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Desenvolvimento</h1>
          <p className="text-slate-500 dark:text-slate-400">Gestão de backlog com Drag & Drop.</p>
        </div>
        <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
          <button 
            onClick={() => setView('board')}
            className={`p-2 rounded ${view === 'board' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
            title="Visualização Kanban"
          >
            <Layout size={20} />
          </button>
          <button 
            onClick={() => setView('list')}
            className={`p-2 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
            title="Visualização Roadmap"
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-6 h-full min-w-max pb-4">
            {columns.map(col => (
              <div 
                key={col} 
                className={`w-80 bg-slate-100 dark:bg-slate-800 rounded-xl flex flex-col max-h-full border transition-colors
                    ${draggedIssueId ? 'border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}
                `}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                <div className="p-4 font-bold text-slate-700 dark:text-slate-200 flex justify-between items-center sticky top-0 bg-transparent z-10">
                  {col}
                  <span className="bg-slate-200 dark:bg-slate-700 text-xs px-2 py-1 rounded-full text-slate-600 dark:text-slate-300 font-medium">
                    {issues.filter(i => i.status === col).length}
                  </span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar min-h-[100px]">
                  {issues.filter(i => i.status === col).map(issue => (
                    <div 
                        id={`issue-${issue.id}`}
                        key={issue.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue.id)}
                        onClick={() => setSelectedIssue(issue)}
                        className={`bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition cursor-grab active:cursor-grabbing group relative
                            ${draggedIssueId === issue.id ? 'opacity-50' : 'opacity-100'}
                        `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider
                          ${issue.type === 'Bug' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-900' : 
                            issue.type === 'Feature' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-100 dark:border-green-900' : 
                            'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-900'}`}>
                          {issue.type}
                        </span>
                        <span className="text-xs text-slate-400 font-mono group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">{issue.id}</span>
                      </div>
                      
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1 leading-tight">{issue.title}</h4>
                      
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <Folder size={10} />
                        <span className="truncate max-w-[150px]">{issue.project}</span>
                      </div>
                      
                      <div className="mb-4 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-600 pointer-events-none">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1 font-medium">
                          <span>Execução</span>
                          <span className={issue.progress === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}>{issue.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${issue.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                            style={{ width: `${issue.progress}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold border border-indigo-200 dark:border-indigo-800" title={`Assigned to: ${issue.assignee}`}>
                                {issue.assignee.charAt(0)}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             {issue.notes && issue.notes.length > 0 && (
                                <div className="flex items-center text-xs text-slate-400 gap-1 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    <MessageSquare size={12}/> {issue.notes.length}
                                </div>
                             )}
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">
                                {issue.points} pts
                            </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List / Evolution View */
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col flex-1">
             <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <TrendingUp /> Evolução do Desenvolvimento
                 </h3>
             </div>
             <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Array.from(new Set(issues.map(i => i.project))).map(project => {
                        const projectIssues = issues.filter(i => i.project === project);
                        const totalPoints = projectIssues.reduce((acc, curr) => acc + curr.points, 0);
                        const totalWeightedProgress = projectIssues.reduce((acc, curr) => acc + (curr.progress * curr.points), 0);
                        const maxPossibleWeightedProgress = totalPoints * 100;
                        const percent = maxPossibleWeightedProgress === 0 ? 0 : Math.round((totalWeightedProgress / maxPossibleWeightedProgress) * 100);

                        return (
                            <div key={project} className="bg-white dark:bg-slate-700 p-5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow-md transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                            <Folder className="text-blue-500" size={20}/>
                                            {project}
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{projectIssues.length} issues • {totalPoints} story points</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-3xl font-bold ${percent === 100 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>{percent}%</span>
                                        <span className="text-xs text-slate-400 block font-medium uppercase tracking-wide">Concluído</span>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-600 rounded-full h-4 mb-4 inner-shadow">
                                    <div className={`h-4 rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${percent === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${percent}%` }}></div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase">Destaques Recentes</p>
                                    {projectIssues.slice(0, 3).map(issue => (
                                        <div key={issue.id} className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-2 rounded flex justify-between items-center text-slate-700 dark:text-slate-300">
                                            <div className="flex items-center gap-2 truncate">
                                                {issue.status === 'Done' ? <Code size={14} className="text-green-500 shrink-0"/> : <GitPullRequest size={14} className="text-blue-500 shrink-0"/>}
                                                <span className="truncate">{issue.title}</span>
                                            </div>
                                            <span className="font-mono text-slate-400 text-[10px] ml-2">{issue.progress}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
             </div>
        </div>
      )}

      {selectedIssue && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{selectedIssue.id}</span>
                             <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Folder size={10}/> {selectedIssue.project}</span>
                          </div>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedIssue.title}</h2>
                      </div>
                      <button onClick={() => setSelectedIssue(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-2 rounded-full transition">✕</button>
                  </div>
                  <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Status Atual</label>
                              <select 
                                  value={selectedIssue.status}
                                  onChange={(e) => handleStatusChange(e.target.value)}
                                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                              >
                                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex justify-between">
                                  <span>Progresso</span>
                                  <span className="text-blue-600 dark:text-blue-400">{selectedIssue.progress}%</span>
                              </label>
                              <div className="flex items-center gap-3">
                                  <span className="text-xs text-slate-400 font-medium">0%</span>
                                  <input 
                                      type="range" min="0" max="100" step="5"
                                      value={selectedIssue.progress} 
                                      onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                                      className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <span className="text-xs text-slate-400 font-medium">100%</span>
                              </div>
                          </div>
                      </div>
                      <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                              <MessageSquare size={16} className="text-blue-500"/> Notas de Desenvolvimento
                          </h3>
                          <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl min-h-[150px] max-h-[250px] overflow-y-auto space-y-3 mb-4 border border-slate-200 dark:border-slate-700 custom-scrollbar">
                              {selectedIssue.notes && selectedIssue.notes.length > 0 ? (
                                  selectedIssue.notes.map((note, idx) => (
                                      <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm shadow-sm relative group">
                                          <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{note.text}</p>
                                          <div className="mt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-2">
                                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded">{note.author}</span>
                                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                  <Clock size={10}/> {new Date(note.created_at).toLocaleString()}
                                              </span>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-32 text-slate-400 dark:text-slate-600">
                                      <MessageSquare size={24} className="mb-2 opacity-20"/>
                                      <p className="text-xs italic">Nenhuma nota ou atualização registrada.</p>
                                  </div>
                              )}
                          </div>
                          <div className="flex gap-2 items-start">
                              <textarea 
                                  placeholder="Descreva a atualização técnica..." 
                                  className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none shadow-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400"
                                  value={newNote}
                                  onChange={(e) => setNewNote(e.target.value)}
                              />
                              <button 
                                  onClick={handleSaveNote}
                                  className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition shadow-sm h-full"
                              >
                                  <Save size={20}/>
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
