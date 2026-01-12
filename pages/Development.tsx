
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Widgets';
import { Code, GitPullRequest, Layout, List, MessageSquare, Plus, Save, Clock, Folder, TrendingUp } from 'lucide-react';
import { Issue } from '../types';

export const Development: React.FC = () => {
  const { issues = [], updateIssue, addIssueNote } = useData();
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
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); 
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
      e.preventDefault();
      if (draggedIssueId) {
          updateIssue(currentUser, draggedIssueId, { status: targetStatus as any });
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
          >
            <Layout size={20} />
          </button>
          <button 
            onClick={() => setView('list')}
            className={`p-2 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
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
                    {(issues || []).filter(i => i.status === col).length}
                  </span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar min-h-[100px]">
                  {(issues || []).filter(i => i.status === col).map(issue => (
                    <div 
                        id={`issue-${issue.id}`}
                        key={issue.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, issue.id)}
                        onClick={() => setSelectedIssue(issue)}
                        className={`bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-md transition cursor-grab active:cursor-grabbing group relative`}
                    >
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1 leading-tight">{issue.title}</h4>
                      <p className="text-xs text-slate-500 mb-3">{issue.project}</p>
                      <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-blue-600 h-full" style={{width: `${issue.progress}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col flex-1">
             <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {Array.from(new Set((issues || []).map(i => i.project))).map(project => {
                        const projectIssues = issues.filter(i => i.project === project);
                        const totalPoints = projectIssues.reduce((acc, curr) => acc + curr.points, 0);
                        const totalWeightedProgress = projectIssues.reduce((acc, curr) => acc + (curr.progress * curr.points), 0);
                        const percent = totalPoints === 0 ? 0 : Math.round((totalWeightedProgress / (totalPoints * 100)) * 100);

                        return (
                            <div key={project} className="bg-white dark:bg-slate-700 p-5 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
                                <h4 className="font-bold text-slate-900 dark:text-white text-lg mb-4">{project}</h4>
                                <div className="w-full bg-slate-100 dark:bg-slate-600 h-2 rounded-full mb-2"><div className="bg-blue-600 h-full rounded-full" style={{width:`${percent}%`}}></div></div>
                                <span className="text-xs text-slate-400">{percent}% completo • {projectIssues.length} tarefas</span>
                            </div>
                        );
                    })}
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
