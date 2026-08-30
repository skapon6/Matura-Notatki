"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { playSound } from "../lib/sounds";

interface MindMapNode {
  id: string;
  label: string;
  icon: string;
  description: string;
  sub_concepts: { term: string; definition: string }[];
}

export function ConceptMindMap({ 
  currentTheme, 
  triggerNotification 
}: { 
  currentTheme: any; 
  triggerNotification: (msg: string, type?: "success" | "error" | "info") => void;
}) {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"epoka" | "motyw" | "archetypy" | "teoria">("epoka");
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);

  useEffect(() => {
    async function fetchNodes() {
      setLoading(true);
      const { data, error } = await supabase.from("mind_map_nodes").select("*");
      
      if (error) {
        triggerNotification("Błąd pobierania bazy wiedzy.", "error");
      } else if (data) {
        setNodes(data);
        // Automatycznie wybierz pierwszy element z domyślnej zakładki
        const initialNode = data.find(n => n.id.startsWith("epoka"));
        if (initialNode) setSelectedNode(initialNode);
      }
      setLoading(false);
    }
    fetchNodes();
  }, []);

  // Grupowanie węzłów na podstawie prefiksu ID, który dodaliśmy w SQL
  const filteredNodes = nodes.filter(node => {
    if (activeTab === "epoka") return node.id.startsWith("epoka");
    if (activeTab === "motyw") return node.id.startsWith("motyw");
    if (activeTab === "archetypy") return node.id.startsWith("archetypy") || node.id.startsWith("konteksty");
    if (activeTab === "teoria") return node.id.startsWith("teoria");
    return true;
  });

  const handleTabChange = (tab: "epoka" | "motyw" | "archetypy" | "teoria") => {
    playSound("click");
    setActiveTab(tab);
    // Po zmianie zakładki wybierz pierwszy element z nowej listy
    const firstNode = nodes.find(n => {
      if (tab === "archetypy") return n.id.startsWith("archetypy") || n.id.startsWith("konteksty");
      return n.id.startsWith(tab);
    });
    setSelectedNode(firstNode || null);
  };

  const handleNodeSelect = (node: MindMapNode) => {
    playSound("click");
    setSelectedNode(node);
  };

  if (loading) {
    return (
      <div className={`w-full p-8 rounded-2xl ${currentTheme.cardBg} border ${currentTheme.cardBorder} flex justify-center items-center h-64`}>
        <span className="animate-pulse text-stone-500 font-serif">Układanie notatek... ☕</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full animate-fade-in">
      
      {/* LEWA KOLUMNA: Nawigacja i Grid */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Nagłówek (usunięto napis "Dane z chmury") */}
        <div>
          <h2 className="text-2xl font-serif text-stone-100 flex items-center gap-2 mb-1">
            Baza Motywów i Kontekstów 🧠
          </h2>
          <p className="text-sm text-stone-400">
            Wybierz kategorię, aby odkryć najważniejsze zagadnienia maturalne.
          </p>
        </div>

        {/* Zakładki (Tabs) */}
        <div className="flex flex-wrap gap-2 pb-2 border-b border-stone-800/50">
          {[
            { id: "epoka", label: "Epoki ⏳" },
            { id: "motyw", label: "Główne Motywy 📚" },
            { id: "archetypy", label: "Konteksty i Typy 🎭" },
            { id: "teoria", label: "Teoria Literatury 📖" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-amber-900/40 text-amber-500 border border-amber-900/50 shadow-inner"
                  : `bg-stone-900/30 text-stone-400 border border-transparent hover:bg-stone-900/50 hover:text-stone-300`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Kafelki (Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => handleNodeSelect(node)}
              className={`flex flex-col items-start text-left p-4 rounded-xl border transition-all duration-300 ${
                selectedNode?.id === node.id
                  ? "bg-stone-800/60 border-amber-700/50 ring-1 ring-amber-700/30"
                  : `${currentTheme.cardBg} ${currentTheme.cardBorder} hover:border-stone-600 hover:bg-stone-800/40`
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{node.icon}</span>
                <h3 className="font-serif font-medium text-stone-200">{node.label}</h3>
              </div>
              <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                {node.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* PRAWA KOLUMNA: Szczegóły wybranego kafelka (Sub-concepts) */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col">
        {selectedNode ? (
          <div className={`p-6 rounded-2xl border ${currentTheme.cardBorder} bg-stone-900/40 shadow-lg sticky top-6`}>
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-stone-800/60">
              <div className="text-4xl bg-stone-950 p-3 rounded-2xl shadow-inner border border-stone-800/50">
                {selectedNode.icon}
              </div>
              <div>
                <h3 className="text-xl font-serif text-amber-500 mb-1">{selectedNode.label}</h3>
                <span className="text-xs uppercase tracking-widest text-stone-500 font-semibold">
                  Podgląd notatki
                </span>
              </div>
            </div>

            <p className="text-sm text-stone-300 mb-6 leading-relaxed italic">
              {selectedNode.description}
            </p>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedNode.sub_concepts?.map((concept, idx) => (
                <div 
                  key={idx} 
                  className="bg-stone-950/50 border border-stone-800/50 p-4 rounded-xl hover:border-stone-700/60 transition-colors"
                >
                  <h4 className="text-amber-600/90 font-serif font-medium mb-1 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-600/50 rounded-full"></span>
                    {concept.term}
                  </h4>
                  <p className="text-xs text-stone-400 leading-relaxed ml-3.5">
                    {concept.definition}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`h-full min-h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl border ${currentTheme.cardBorder} bg-stone-900/20 border-dashed`}>
            <span className="text-4xl mb-3 opacity-50 grayscale">📚</span>
            <p className="text-sm text-stone-500 font-serif text-center">
              Wybierz temat z listy po lewej stronie,<br/> aby rozwinąć szczegóły.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}