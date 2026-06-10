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

  // Promień bazowy okręgu (w procentach)
  const radiusX = 36; 
  const radiusY = 35;

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
        </div>
      </div>

      {/* Główny układ: Mapa i Szczegóły */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEWA KOLUMNA: Interaktywna Mapa (UKŁAD NAPRZEMIENNY) */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[480px] bg-stone-950/20 rounded-2xl border border-stone-800/40 p-4 overflow-hidden select-none">
          
          {/* DYNAMICZNE LINIE SVG DOSTOSOWANE DO PROMIENIA */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
            {nodeKeys.map((key, idx) => {
              const angle = (idx * (2 * Math.PI)) / totalNodes - Math.PI / 2;
              
              // Co drugi element jest bliżej środka (naprzemienny promień)
              const factor = idx % 2 === 0 ? 1.15 : 0.72;
              const x = 50 + (radiusX * factor) * Math.cos(angle);
              const y = 50 + (radiusY * factor) * Math.sin(angle);

              return (
                <line 
                  key={`line-${key}`}
                  x1="50%" 
                  y1="50%" 
                  x2={`${x}%`} 
                  y2={`${y}%`} 
                  stroke="#d97706" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                />
              );
            })}
          </svg>

          {/* Centralny punkt */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-22 h-22 rounded-full bg-stone-900 border-2 border-amber-500 flex flex-col items-center justify-center text-center p-2 shadow-2xl select-none">
            <span className="text-lg">📚</span>
            <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mt-1 leading-none">Matura</span>
            <span className="text-[8px] text-stone-400">J. Polski</span>
          </div>

          {/* DYNAMICZNE ROZMIESZCZANIE PRZYCISKÓW */}
          {nodeKeys.map((key, idx) => {
            const node = mindMapData[key];
            const angle = (idx * (2 * Math.PI)) / totalNodes - Math.PI / 2;
            
            // Współczynnik odległości (naprzemienny)
            const factor = idx % 2 === 0 ? 1.15 : 0.72;
            const x = 50 + (radiusX * factor) * Math.cos(angle);
            const y = 50 + (radiusY * factor) * Math.sin(angle);

            // Programowe oczyszczanie etykiety ze zbędnego słowa "Motyw"
            let displayLabel = node.label.replace(/Motyw\s+/i, "");
            displayLabel = displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1);

            return (
              <div
                key={node.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <button
                  onClick={() => handleNodeClick(node.id)}
                  className={`px-2.5 py-1.5 rounded-xl border transition-all duration-300 flex items-center gap-1.5 shadow-lg hover:scale-105 active:scale-95 ${
                    activeNode === node.id
                      ? "bg-amber-500/20 border-amber-500 text-stone-100 ring-2 ring-amber-500/20"
                      : "bg-stone-900/90 border-stone-800 text-stone-300 hover:border-stone-700"
                  }`}
                >
                  <span className="text-sm shrink-0">{node.icon}</span>
                  <span className="text-[10px] font-medium tracking-wide whitespace-nowrap">{displayLabel}</span>
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

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-800">
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