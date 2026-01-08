
import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
    onSave: (base64: string) => void;
    onClear?: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onClear }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    // Ajusta o tamanho do canvas para o tamanho do container de forma robusta
    const resizeCanvas = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (canvas && container) {
            // Apenas redimensiona se o container tiver tamanho real (evita erro em modais abrindo)
            if (container.offsetWidth > 0 && container.offsetHeight > 0) {
                // Preserva o conteúdo atual se houver
                const tempImage = canvas.toDataURL();
                canvas.width = container.offsetWidth;
                canvas.height = container.offsetHeight;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#000';
                    
                    // Se já tinha algo, tenta restaurar (opcional, pode ser esticado)
                    if (hasSignature) {
                        const img = new Image();
                        img.src = tempImage;
                        img.onload = () => ctx.drawImage(img, 0, 0);
                    }
                }
            }
        }
    };

    useEffect(() => {
        // Inicialização com ResizeObserver para lidar com modais e animações
        if (!containerRef.current) return;
        
        const observer = new ResizeObserver(() => {
            resizeCanvas();
        });
        
        observer.observe(containerRef.current);
        
        // Chamada inicial forçada após curto delay para garantir que o modal terminou de animar
        const timer = setTimeout(resizeCanvas, 300);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, []);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Impede rolagem da página em dispositivos touch
        if ('touches' in e) {
            e.preventDefault();
        }

        setIsDrawing(true);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Impede rolagem da página em dispositivos touch
        if ('touches' in e) {
            e.preventDefault();
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { offsetX, offsetY } = getCoordinates(e, canvas);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }
        const rect = canvas.getBoundingClientRect();
        return {
            offsetX: clientX - rect.left,
            offsetY: clientY - rect.top
        };
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setHasSignature(false);
            if (onClear) onClear();
        }
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        if (canvas && hasSignature) {
            onSave(canvas.toDataURL());
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div 
                ref={containerRef}
                className="flex-1 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative min-h-[180px] touch-none overflow-hidden"
            >
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-bold uppercase tracking-widest">
                        Assine Digitalmente Aqui
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <button 
                    type="button"
                    onClick={handleClear} 
                    className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition"
                >
                    <Eraser size={14}/> Limpar
                </button>
                <button 
                    type="button"
                    onClick={handleSave} 
                    disabled={!hasSignature} 
                    className="px-6 py-2 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale flex items-center gap-2 transition shadow-lg shadow-indigo-500/20"
                >
                    <Check size={14}/> Finalizar
                </button>
            </div>
        </div>
    );
};
