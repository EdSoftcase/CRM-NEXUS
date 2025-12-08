import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Star } from 'lucide-react';

export const GamificationWidget: React.FC = () => {
    const { currentUser } = useAuth();

    if (!currentUser || currentUser.role === 'client') return null;

    const xp = currentUser.xp || 0;
    const level = currentUser.level || 1;
    
    // Fórmula simples: Próximo nível = Nível atual * 100 XP
    const xpForNextLevel = level * 100;
    const progress = Math.min((xp / xpForNextLevel) * 100, 100);

    return (
        <div className="mt-2 pt-2 border-t border-slate-800">
            <div className="bg-slate-800/30 rounded-md p-2 border border-slate-700/50 flex flex-col gap-1">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-yellow-500/80">
                        <Trophy size={10} />
                        <span className="text-[10px] font-bold uppercase text-slate-400">Lvl {level}</span>
                    </div>
                    <span className="text-[9px] text-slate-600 font-mono">{xp}/{xpForNextLevel} XP</span>
                </div>
                
                <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-yellow-700 to-yellow-500 transition-all duration-1000" 
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                
                {progress >= 100 && (
                    <div className="text-center mt-0.5">
                        <span className="text-[9px] text-yellow-500 animate-pulse font-bold flex items-center justify-center gap-1">
                            <Star size={8} fill="currentColor"/> Level Up!
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};