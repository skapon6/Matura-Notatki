"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { playSound } from "../lib/sounds";

interface ConceptMindMapProps {
  currentTheme: any;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
}

interface MindMapNode {
  id: string;
  label: string;
  icon: string;
  description: string;
  subConcepts: { term: string; definition: string }[];
}

const DEFAULT_FALLBACK_DATA: Record<string, MindMapNode> = {
  epoki: {
    id: "epoki",
    label: "Epoki & Prądy (Lokalne)",
    icon: "⏳",
    description: "Kluczowe ramy czasowe i światopoglądowe niezbędne do kontekstualizacji utworów.",
    subConcepts: [
      { term: "Romantyzm", definition: "Indywidualizm, bunt, prymat uczucia nad rozumem, irracjonalizm." }
    ]
  }
};

export function ConceptMindMap({ currentTheme, triggerNotification }: ConceptMindMapProps) {
  const [mindMapData, setMindMapData] = useState<Record<string, MindMapNode>>(DEFAULT_FALLBACK_DATA);
  const [activeNode, setActiveNode] = useState<string>("epoki");
  const [dbLoading, setDbLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchMindMapFromSupabase() {
      setDbLoading(true);
      try {
        const { data, error } = await supabase
          .from("mind_map_nodes")
          .select("*");

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedData: Record<string, MindMapNode> = {};
          data.forEach((row: any) => {
            formattedData[row.id] = {
              id: row.id,
              label: row.label,
              icon: row.icon,
              description: row.description,
              subConcepts: Array.isArray(row.sub_concepts) 
                ? row.sub_concepts 
                : JSON.parse(row.sub_concepts || "[]")
            };
          });
          setMindMapData(formattedData);
          
          const firstKey = Object.keys(formattedData)[0];
          if (firstKey) setActiveNode(firstKey);
        }
      } catch (err) {
        console.error("Błąd pobierania mapy myśli, załadowano dane zapasowe:", err);
      } finally {
        setDbLoading(false);
      }
    }

    fetchMindMapFromSupabase();
  }, []);

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId);
    playSound("click");
    if (mindMapData[nodeId]) {
      triggerNotification(`Wybrano obszar: ${mindMapData[nodeId].label}`, "info");
    }
  };

  const selectedNodeData = mindMapData[activeNode];

  // Pobieramy klucze elementów do dynamicznego rozmieszczenia
  const nodeKeys = Object.keys(mindMapData);
  const totalNodes = nodeKeys.length;

  // Promień okręgu rozmieszczenia węzłów wokół środka (w procentach)
  const radiusX = 35; // Szerokość rozpiętości
  const radiusY = 32; // Wysokość rozpiętości

  if (dbLoading) {
    return (
      <div className={`rounded-3xl p-8 border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col items-center justify-center min-h-[300px]`}>
        <div className="text-2xl animate-spin mb-3">🌀</div>
        <p className="text-xs text-stone-400">Pobieranie mapy myśli z bazy danych...</p>
      </div>
    );
  }

  if (!selectedNodeData) {
    return (
      <div className={`rounded-3xl p-8 border ${currentTheme.cardBorder} ${currentTheme.cardBg} text-center`}>
        <p className="text-xs text-stone-400">Brak dostępnych danych mapy myśli.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-3xl p-6 border ${currentTheme.cardBorder} ${currentTheme.cardBg} transition-all duration-500 shadow-xl ${currentTheme.glow} flex flex-col gap-6 overflow-hidden`}>
      <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header sekcji */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/60 pb-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
            Kącik Naukowy (Dane z Chmury)
          </span>
          <h3 className="text-xl font-bold text-stone-100 mt-2 font-serif">Kompaktowa Mapa Myśli 🧠</h3>
          <p className="text-xs text-stone-400 mt-1">Interaktywne kompendium pobrane prosto z bazy danych Supabase.</p>
        </div>
      </div>

      {/* Główny układ: Mapa i Szczegóły */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEWA KOLUMNA: Interaktywna Mapa (DYSPOZYCJA DYNAMICZNA) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[340px] bg-stone-950/20 rounded-2xl border border-stone-800/40 p-4 overflow-hidden">
          
          {/* DYNAMICZNE LINIE SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
            {nodeKeys.map((key, idx) => {
              // Obliczanie kąta podziału dla równego rozłożenia wokół środka
              const angle = (idx * (2 * Math.PI)) / totalNodes - Math.PI / 2 + Math.PI / totalNodes;
              const x = 50 + radiusX * Math.cos(angle);
              const y = 50 + radiusY * Math.sin(angle);

              return (
                <line 
                  key={`line-${key}`}
                  x1="50%" 
                  y1="50%" 
                  x2={`${x}%`} 
                  y2={`${y}%`} 
                  stroke="#d97706" 
                  strokeWidth="2" 
                  strokeDasharray="4 4" 
                />
              );
            })}
          </svg>

          {/* Centralny punkt */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-24 h-24 rounded-full bg-stone-900 border-2 border-amber-500 flex flex-col items-center justify-center text-center p-2 shadow-xl select-none">
            <span className="text-xl">📚</span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-1 leading-none">Matura</span>
            <span className="text-[9px] text-stone-400">J. Polski</span>
          </div>

          {/* DYNAMICZNE ROZMIESZCZANIE PRZYCISKÓW */}
          {nodeKeys.map((key, idx) => {
            const node = mindMapData[key];
            
            // Kąt w radianach dla każdego elementu z lekkim przesunięciem estetycznym
            const angle = (idx * (2 * Math.PI)) / totalNodes - Math.PI / 2 + Math.PI / totalNodes;
            const x = 50 + radiusX * Math.cos(angle);
            const y = 50 + radiusY * Math.sin(angle);

            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <button
                  onClick={() => handleNodeClick(node.id)}
                  className={`p-3 rounded-xl border transition-all duration-300 flex flex-col items-center gap-1 shadow-md hover:scale-105 active:scale-95 ${
                    activeNode === node.id
                      ? "bg-amber-500/20 border-amber-500 text-stone-100"
                      : "bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-700"
                  }`}
                >
                  <span className="text-lg">{node.icon}</span>
                  <span className="text-xs font-semibold whitespace-nowrap">{node.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* PRAWA KOLUMNA: Szczegóły aktywnego węzła */}
        <div className="lg:col-span-6 flex flex-col justify-between bg-stone-900/40 rounded-2xl border border-stone-800/40 p-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-2xl">{selectedNodeData.icon}</span>
              <h4 className="text-lg font-bold text-stone-100 font-serif">{selectedNodeData.label}</h4>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed mb-4">
              {selectedNodeData.description}
            </p>

            <div className="space-y-3">
              {selectedNodeData.subConcepts?.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-stone-950/30 border border-stone-800/50 hover:bg-stone-950/50 transition-colors">
                  <span className="text-xs font-bold text-amber-400 block mb-1">{item.term}</span>
                  <p className="text-xs text-stone-300 leading-relaxed">{item.definition}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-stone-800/40 text-[11px] text-stone-500 italic flex items-center justify-between">
            <span>* Klikaj na gałęzie mapy, by przełączać działy.</span>
            <span>Powodzenia! ☕</span>
          </div>
        </div>

      </div>
    </div>
  );
}