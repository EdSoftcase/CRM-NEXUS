
import React from 'react';
import { CustomFieldDefinition } from '../types';

interface CustomFieldRendererProps {
    fields: CustomFieldDefinition[];
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
    module: 'leads' | 'clients';
    className?: string;
}

export const CustomFieldRenderer: React.FC<CustomFieldRendererProps> = ({ fields, values, onChange, module, className }) => {
    const relevantFields = fields.filter(f => f.module === module);

    if (relevantFields.length === 0) return null;

    return (
        <div className={`space-y-4 ${className}`}>
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-slate-200 dark:border-slate-700 pb-2 mb-3">
                Campos Personalizados
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relevantFields.map(field => (
                    <div key={field.id}>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {field.type === 'text' && (
                            <input 
                                type="text"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                                value={values[field.key] || ''}
                                onChange={e => onChange(field.key, e.target.value)}
                                placeholder={field.label}
                            />
                        )}

                        {field.type === 'number' && (
                            <input 
                                type="number"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                                value={values[field.key] || ''}
                                onChange={e => onChange(field.key, Number(e.target.value))}
                                placeholder="0"
                            />
                        )}

                        {field.type === 'date' && (
                            <input 
                                type="date"
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                                value={values[field.key] || ''}
                                onChange={e => onChange(field.key, e.target.value)}
                            />
                        )}

                        {field.type === 'boolean' && (
                            <div className="flex items-center gap-2 mt-2">
                                <input 
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={!!values[field.key]}
                                    onChange={e => onChange(field.key, e.target.checked)}
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Sim</span>
                            </div>
                        )}

                        {field.type === 'select' && (
                            <select
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                                value={values[field.key] || ''}
                                onChange={e => onChange(field.key, e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {field.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
