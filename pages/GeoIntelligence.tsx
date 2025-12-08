
import React, { useEffect, useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Client, Lead } from '../types';
import { Map as MapIcon, Filter, User, Briefcase, Navigation, Layers, X, Target } from 'lucide-react';

// Declaration to satisfy TypeScript since L is loaded via CDN
declare const L: any;

export const GeoIntelligence: React.FC = () => {
    const { clients, leads, theme } = useData();
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const tileLayerRef = useRef<any>(null);
    
    // UI State
    const [filter, setFilter] = useState<'all' | 'clients' | 'leads'>('all');
    const [selectedItem, setSelectedItem] = useState<{ type: 'client' | 'lead', data: Client | Lead } | null>(null);

    // Initial Center (São Paulo)
    const CENTER = [-23.550520, -46.633308];

    // Helper: Generate Deterministic Mock Coordinates
    const getMockCoordinates = (id: string, index: number) => {
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const latOffset = (hash % 100 - 50) / 500; 
        const lngOffset = ((hash * index) % 100 - 50) / 500;
        return [CENTER[0] + latOffset, CENTER[1] + lngOffset];
    };

    // Init Map and Handle Tile Switching
    useEffect(() => {
        if (!mapRef.current) {
            const mapInstance = L.map('map-container', { zoomControl: false }).setView(CENTER, 12);
            L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
            mapRef.current = mapInstance;
        }

        // Switch Tile Layer based on theme
        if (tileLayerRef.current) {
            mapRef.current.removeLayer(tileLayerRef.current);
        }

        const tileUrl = theme === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

        tileLayerRef.current = L.tileLayer(tileUrl, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(mapRef.current);

    }, [theme]); // Re-run when theme changes

    // Update Markers when filter or data changes
    useEffect(() => {
        if (!mapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(m => mapRef.current.removeLayer(m));
        markersRef.current = [];

        const points: any[] = [];

        // Define Custom Icons Function
        const createCustomIcon = (type: 'client' | 'lead', healthScore: number = 100) => {
            let borderColor = '#3b82f6'; // Blue default
            let iconColor = '#3b82f6';
            let svgContent = '';

            if (type === 'client') {
                // User Icon SVG Path
                svgContent = `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`;
                
                // Critical Health Logic (< 50)
                if (healthScore < 50) {
                    borderColor = '#ef4444'; // Red
                    iconColor = '#ef4444';
                }
            } else {
                // Lead / Target Icon SVG Path
                svgContent = `<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`;
                borderColor = '#f97316'; // Orange
                iconColor = '#f97316';
            }

            return L.divIcon({
                className: 'custom-div-icon',
                html: `
                    <div style="
                        background-color: white; 
                        width: 32px; 
                        height: 32px; 
                        border-radius: 50%; 
                        border: 3px solid ${borderColor}; 
                        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: ${iconColor};
                    ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            ${svgContent}
                        </svg>
                    </div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 32], // Center bottom-ish
                popupAnchor: [0, -32]
            });
        };

        // Add Clients
        if (filter === 'all' || filter === 'clients') {
            clients.forEach((c, i) => {
                let coords = [0, 0];
                if (c.latitude && c.longitude && c.latitude !== 0) {
                    coords = [c.latitude, c.longitude];
                } else {
                    coords = getMockCoordinates(c.id, i);
                }

                // Pass health score to icon creator
                const marker = L.marker(coords, { icon: createCustomIcon('client', c.healthScore || 100) }) 
                    .addTo(mapRef.current)
                    .bindPopup(`<b>${c.name}</b><br/>${c.address || 'Endereço não informado'}<br/>Health: ${c.healthScore || 100}`);
                
                marker.on('click', () => setSelectedItem({ type: 'client', data: c }));
                markersRef.current.push(marker);
                points.push(coords);
            });
        }

        // Add Leads
        if (filter === 'all' || filter === 'leads') {
            leads.forEach((l, i) => {
                if (l.status === 'Ganho') return; 
                
                let coords = [0, 0];
                if (l.latitude && l.longitude && l.latitude !== 0) {
                    coords = [l.latitude, l.longitude];
                } else {
                    coords = getMockCoordinates(l.id, i + 100);
                }

                const marker = L.marker(coords, { icon: createCustomIcon('lead') }) 
                    .addTo(mapRef.current)
                    .bindPopup(`<b>${l.name}</b><br/>Lead (${l.status})`);
                
                marker.on('click', () => setSelectedItem({ type: 'lead', data: l }));
                markersRef.current.push(marker);
                points.push(coords);
            });
        }

        // Adjust bounds
        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }

    }, [clients, leads, filter]);

    return (
        <div className="h-full flex flex-col relative bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header Toolbar */}
            <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-sm z-20 transition-colors">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MapIcon className="text-blue-600 dark:text-blue-400"/> Mapa Inteligente
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Visualização geográfica da carteira.</p>
                </div>
                
                {/* Filter Controls */}
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg border border-slate-200 dark:border-slate-600">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition ${filter === 'all' ? 'bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Layers size={14}/> Tudo
                    </button>
                    <button 
                        onClick={() => setFilter('clients')}
                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition ${filter === 'clients' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Briefcase size={14}/> Clientes
                    </button>
                    <button 
                        onClick={() => setFilter('leads')}
                        className={`px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 transition ${filter === 'leads' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-700 dark:text-orange-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Target size={14}/> Leads
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative z-0">
                <div id="map-container" className="w-full h-full bg-slate-200 dark:bg-slate-900 transition-colors"></div>
                
                {/* Floating Stats Legend */}
                <div className="absolute bottom-6 left-6 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-48 transition-colors">
                    <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-3">Legenda</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-white border-2 border-blue-500 shadow-sm"></div>
                                <span className="text-slate-700 dark:text-slate-300">Clientes</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{clients.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-white border-2 border-red-500 shadow-sm"></div>
                                <span className="text-slate-700 dark:text-slate-300">Risco (Health &lt; 50)</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-white border-2 border-orange-500 shadow-sm"></div>
                                <span className="text-slate-700 dark:text-slate-300">Leads (Alvo)</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{leads.filter(l => l.status !== 'Ganho').length}</span>
                        </div>
                    </div>
                </div>

                {/* Selected Item Sidebar Overlay */}
                {selectedItem && (
                    <div className="absolute top-4 right-4 z-[1000] w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 animate-slide-in-right overflow-hidden transition-colors">
                        <div className={`p-4 text-white flex justify-between items-start ${selectedItem.type === 'client' ? 'bg-blue-600' : 'bg-orange-500'}`}>
                            <div>
                                <h3 className="font-bold text-lg">{selectedItem.data.name}</h3>
                                <span className="text-xs uppercase font-bold opacity-80 bg-black/20 px-2 py-0.5 rounded">
                                    {selectedItem.type === 'client' ? 'Cliente' : 'Prospect'}
                                </span>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="text-white/80 hover:text-white"><X size={20}/></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Empresa</p>
                                <p className="text-slate-800 dark:text-white font-medium">{selectedItem.data.company || (selectedItem.data as any).name}</p>
                            </div>
                            
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Localização</p>
                                <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300 text-sm">
                                    <MapIcon size={16} className="mt-0.5 shrink-0 text-slate-400"/>
                                    <div>
                                        <p>{selectedItem.data.address || 'Endereço não cadastrado'}</p>
                                        {(selectedItem.data.cep) && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">CEP: {selectedItem.data.cep}</p>}
                                    </div>
                                </div>
                            </div>

                            {selectedItem.type === 'lead' ? (
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded border border-orange-100 dark:border-orange-800/50">
                                    <p className="text-xs text-orange-700 dark:text-orange-400 font-bold mb-1">Potencial</p>
                                    <p className="text-lg font-bold text-orange-900 dark:text-orange-200">R$ {(selectedItem.data as Lead).value.toLocaleString()}</p>
                                    <p className="text-xs text-orange-600 dark:text-orange-300">Probabilidade: {(selectedItem.data as Lead).probability}%</p>
                                </div>
                            ) : (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800/50">
                                    <p className="text-xs text-blue-700 dark:text-blue-400 font-bold mb-1">Valor Contrato (LTV)</p>
                                    <p className="text-lg font-bold text-blue-900 dark:text-blue-200">R$ {(selectedItem.data as Client).ltv.toLocaleString()}</p>
                                    {(selectedItem.data as Client).healthScore !== undefined && (
                                        <p className={`text-xs mt-1 font-bold ${(selectedItem.data as Client).healthScore! < 50 ? 'text-red-500' : 'text-green-500'}`}>
                                            Health Score: {(selectedItem.data as Client).healthScore}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                                <button className="flex-1 bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition flex items-center justify-center gap-2 shadow-sm">
                                    <Navigation size={14}/> Traçar Rota
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
