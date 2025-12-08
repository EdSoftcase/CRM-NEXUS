
import React, { useEffect, useState } from 'react';
import { ToastMessage } from '../types';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000); // Auto dismiss after 5s

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300); // Wait for exit animation
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle size={20} className="text-green-500" />;
      case 'warning': return <AlertTriangle size={20} className="text-amber-500" />;
      case 'alert': return <AlertCircle size={20} className="text-red-500" />;
      default: return <Info size={20} className="text-blue-500" />;
    }
  };

  const getStyles = () => {
     switch (toast.type) {
      case 'success': return 'border-green-200 bg-green-50 dark:bg-green-900/30 dark:border-green-800';
      case 'warning': return 'border-amber-200 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-800';
      case 'alert': return 'border-red-200 bg-red-50 dark:bg-red-900/30 dark:border-red-800';
      default: return 'border-blue-200 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-800';
    }
  };

  return (
    <div 
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm max-w-sm w-full transition-all duration-300 transform
        ${getStyles()}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0 animate-slide-in-right'}
      `}
    >
      <div className="shrink-0 mt-0.5">{getIcon()}</div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{toast.title}</h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{toast.message}</p>
      </div>
      <button 
        onClick={handleClose} 
        className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useData();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <div className="pointer-events-auto flex flex-col gap-3">
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </div>
  );
};
