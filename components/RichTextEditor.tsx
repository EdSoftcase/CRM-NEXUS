
import React, { useState, useEffect, useRef } from 'react';
import { Bold, Italic, List, ListOrdered, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Sync external value changes to internal content if needed (careful to avoid loops)
    useEffect(() => {
        if (contentRef.current && contentRef.current.innerHTML !== value) {
             // Only update if significantly different to avoid cursor jumping on every keystroke
             // Simple check: if empty and value provided, or if value is empty
             if (!contentRef.current.innerHTML || !value) {
                 contentRef.current.innerHTML = value || '';
             }
        }
    }, [value]);

    const handleInput = () => {
        if (contentRef.current) {
            onChange(contentRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        if (contentRef.current) {
            contentRef.current.focus();
        }
    };

    return (
        <div className={`border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800 flex flex-col transition-shadow ${isFocused ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-transparent' : ''} ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <button onClick={() => execCommand('bold')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition" title="Negrito">
                    <Bold size={16}/>
                </button>
                <button onClick={() => execCommand('italic')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition" title="Itálico">
                    <Italic size={16}/>
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button onClick={() => execCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition" title="Lista com marcadores">
                    <List size={16}/>
                </button>
                <button onClick={() => execCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition" title="Lista numerada">
                    <ListOrdered size={16}/>
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button onClick={() => execCommand('justifyLeft')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition" title="Alinhar à esquerda">
                    <AlignLeft size={16}/>
                </button>
                <button onClick={() => execCommand('justifyCenter')} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition" title="Centralizar">
                    <AlignCenter size={16}/>
                </button>
            </div>

            {/* Editor Area */}
            <div 
                ref={contentRef}
                className="flex-1 p-4 outline-none overflow-y-auto min-h-[150px] text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                contentEditable
                onInput={handleInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                dangerouslySetInnerHTML={{ __html: value }} // Initial render
                data-placeholder={placeholder}
                style={{ whiteSpace: 'pre-wrap' }}
            />
        </div>
    );
};
