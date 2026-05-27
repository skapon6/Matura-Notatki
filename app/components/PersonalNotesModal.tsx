"use client";

import React, { useState } from "react";
import { ThemeClasses } from "../lib/theme";
import { supabase } from "../lib/supabase";

interface PersonalNote {
  id: string;
  content: string;
  source?: string;
  created_at: string;
}

interface PersonalNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeClasses;
  personalNotes: PersonalNote[];
  setPersonalNotes: React.Dispatch<React.SetStateAction<PersonalNote[]>>;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
  selectedNote?: PersonalNote | null;
}

export const PersonalNotesModal: React.FC<PersonalNotesModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  personalNotes,
  setPersonalNotes,
  triggerNotification,
  selectedNote,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerNotification("Cytat został pomyślnie skopiowany do schowka!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("personal_notes")
        .delete()
        .eq("id", id);

      if (error) {
        triggerNotification("Nie udało się usunąć zapisanego cytatu.", "error");
      } else {
        setPersonalNotes((prev) => prev.filter((item) => item.id !== id));
        triggerNotification("Cytat został usunięty.", "success");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Błąd połączenia podczas usuwania.", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-slide-in">
      <div className={`w-full max-w-3xl rounded-3xl border ${currentTheme.cardBorder} ${currentTheme.cardBg} flex flex-col max-h-[85vh] shadow-2xl ${currentTheme.glow}`}>
        
        {/* Nagłówek */}
        <div className="p-6 border-b border-stone-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⭐</span>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100">
                Mój Przytulny Zeszyt z Cytatami
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5">
                Kieszeń z zapamiętaną wiedzą ({personalNotes.length})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-stone-900 text-stone-400 hover:text-stone-200 transition-all border border-stone-850"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-stone-800">
          
          {/* Sekcja podglądu, jeśli kliknięto w konkretny boczny cytat */}
          {selectedNote && (
            <div className="p-5 rounded-2xl border border-amber-600/30 bg-amber-500/5 flex flex-col gap-3 shadow-md animate-slide-in">
              <div className="flex justify-between items-center">
                <span className="text-[8px] uppercase tracking-widest text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  🎯 Podgląd zaznaczenia
                </span>
              </div>
              <p className="text-sm text-stone-100 italic leading-relaxed font-serif pr-4 select-text">
                &quot;{selectedNote.content}&quot;
              </p>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[9px] text-amber-500/80 font-mono">
                  Źródło: {selectedNote.source || "Wiedza Szyta na Miarę"} • {new Date(selectedNote.created_at).toLocaleDateString("pl-PL")}
                </span>
                <button
                  onClick={() => handleCopy(selectedNote.content, selectedNote.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 transition-all text-xs flex items-center gap-1.5"
                >
                  <span>{copiedId === selectedNote.id ? "✓ Skopiowano" : "📋 Kopiuj"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Pełna lista wszystkich zapisanych cytatów */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {personalNotes.map((note) => (
              <div
                key={note.id}
                className={`p-5 rounded-2xl border ${
                  selectedNote?.id === note.id ? "border-amber-500/40 bg-stone-900/40 shadow-lg" : "border-stone-800/40 bg-stone-900/10 hover:bg-stone-900/30"
                } hover:border-stone-800 transition-all flex flex-col gap-4 justify-between`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    {note.source && (
                      <span className="text-[8px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        📍 {note.source}
                      </span>
                    )}
                    <span className="text-[9px] text-stone-600 font-mono">
                      {new Date(note.created_at).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 italic leading-relaxed select-text font-serif">
                    &quot;{note.content}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-2 justify-end mt-2 pt-2.5 border-t border-stone-850">
                  {/* Kopiuj */}
                  <button
                    onClick={() => handleCopy(note.content, note.id)}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-950/60 transition-all flex items-center gap-1"
                  >
                    <span>{copiedId === note.id ? "✓" : "📋"}</span>
                    <span>{copiedId === note.id ? "Skopiowano" : "Kopiuj"}</span>
                  </button>

                  {/* Usuń */}
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-red-950/30 text-red-500/80 hover:text-red-400 hover:bg-red-950/10 transition-all flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    <span>Usuń</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};