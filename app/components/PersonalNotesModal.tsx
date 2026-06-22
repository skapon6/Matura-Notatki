// components/PersonalNotesModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import { ThemeClasses } from "../lib/theme";
import { supabase } from "../lib/supabase";
import { playSound } from "../lib/sounds"; // <-- POPRAWIONY IMPORT (Rozwiązuje błąd!)

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
  
  // Stan przechowujący aktualnie wybrany do podglądu cytat
  const [activePreview, setActivePreview] = useState<PersonalNote | null>(null);

  // Ustawianie domyślnego podglądu (zabezpieczone testem istnienia na zaktualizowanej liście)
  useEffect(() => {
    if (isOpen) {
      // Bezpieczna weryfikacja: sprawdzamy, czy przekazany z góry cytat w ogóle jeszcze istnieje na naszej liście
      const selectedNoteExists = selectedNote && personalNotes.some(
        (n) => String(n.id) === String(selectedNote.id)
      );

      if (selectedNoteExists && selectedNote) {
        setActivePreview(selectedNote);
      } else if (personalNotes.length > 0) {
        // Domyślnie wczytujemy najnowszy (pierwszy na liście) cytat z bazy
        setActivePreview(personalNotes[0]);
      } else {
        setActivePreview(null);
      }
    }
  }, [isOpen, selectedNote, personalNotes]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    triggerNotification("Cytat został skopiowany do schowka!", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Zapobiega otwarciu podglądu usuwanej notatki
    try {
      const { error } = await supabase
        .from("personal_notes")
        .delete()
        .eq("id", id);

      if (error) {
        triggerNotification("Nie udało się usunąć zapisanego cytatu.", "error");
      } else {
        // Bezpieczne filtrowanie listy przy użyciu rzutowania do String (zapobiega błędom typów Supabase)
        const updatedNotes = personalNotes.filter((item) => String(item.id) !== String(id));
        setPersonalNotes(updatedNotes);

        // Rozwiązanie "wiszącego podglądu": jeśli usunięto aktualnie podglądany cytat
        if (activePreview && String(activePreview.id) === String(id)) {
          if (updatedNotes.length > 0) {
            // Automatycznie ładujemy kolejny dostępny cytat do aktywnego widoku
            setActivePreview(updatedNotes[0]);
          } else {
            setActivePreview(null);
          }
        }
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
            <span className="text-2xl animate-pulse">⭐</span>
            <div>
              <h2 className="text-lg font-serif font-bold text-stone-100">
                Mój Przytulny Zeszyt z Cytatami
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold mt-0.5">
                Kieszeń z zapamiętaną wiedzą ({personalNotes.length} / 50)
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
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-stone-800">
          
          {/* GŁÓWNA KARTA AKTYWNEGO PODGLĄDU */}
          {activePreview ? (
            <div className="p-6 rounded-2xl border border-amber-600/20 bg-[#1c1613] flex flex-col gap-4 shadow-md transition-all">
              <div className="flex justify-between items-center border-b border-stone-800/60 pb-2.5">
                <span className="text-[9px] uppercase tracking-widest text-amber-400 font-extrabold flex items-center gap-1.5">
                  <span>📖</span> Aktywny podgląd cytatu
                </span>
                {activePreview.source && (
                  <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    📍 {activePreview.source}
                  </span>
                )}
              </div>
              
              <p className="text-sm sm:text-base text-amber-100/95 italic leading-relaxed font-serif pr-4 select-text">
                &quot;{activePreview.content}&quot;
              </p>
              
              <div className="flex justify-between items-center mt-1 pt-3 border-t border-stone-800/40">
                <span className="text-[9px] text-stone-500 font-mono">
                  Zapisano: {new Date(activePreview.created_at).toLocaleDateString("pl-PL")}
                </span>
                <div className="flex items-center gap-2">
                  {/* Przycisk Usuń w podglądzie */}
                  <button
                    onClick={(e) => handleDelete(e, activePreview.id)}
                    className="px-3 py-1.5 rounded-xl border border-red-950/30 text-red-500/80 hover:text-red-400 hover:bg-red-950/10 transition-all text-xs font-semibold flex items-center gap-1"
                  >
                    <span>🗑️</span> Usuń z zeszytu
                  </button>
                  {/* Przycisk Kopiuj w podglądzie */}
                  <button
                    onClick={() => handleCopy(activePreview.content, activePreview.id)}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-stone-950 font-bold hover:bg-amber-400 transition-all text-xs flex items-center gap-1.5"
                  >
                    <span>{copiedId === activePreview.id ? "✓" : "📋"}</span>
                    <span>{copiedId === activePreview.id ? "Skopiowano" : "Kopiuj cytat"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500 text-xs border border-dashed border-stone-800 rounded-2xl select-none">
              😴 Brak zapisanych cytatów. Zaznacz ciekawy tekst w bazie notatek i kliknij gwiazdkę (⭐), aby go tutaj dodać!
            </div>
          )}

          {/* CZYSTA, ESTETYCZNA LISTA WSZYSTKICH ZAPISÓW */}
          {personalNotes.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-widest text-stone-500 font-bold mb-3 px-1">
                Wszystkie zapisane fragmenty (kliknij, aby podglądnać)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {personalNotes.map((note) => {
                  const isCurrentActive = activePreview && String(activePreview.id) === String(note.id);
                  return (
                    <div
                      key={note.id}
                      onClick={() => { playSound("click"); setActivePreview(note); }}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col gap-2 relative group ${
                        isCurrentActive 
                          ? "border-amber-500/40 bg-stone-900/40 shadow-md animate-fade-in" 
                          : "border-stone-800/40 bg-stone-900/10 hover:bg-stone-900/30 hover:border-stone-800"
                      }`}
                    >
                      {/* Dyskretny kosz na hover w rogu dolnej karty */}
                      <button
                        onClick={(e) => handleDelete(e, note.id)}
                        className="absolute top-2.5 right-2.5 text-stone-600 hover:text-red-400 p-1 rounded-md hover:bg-stone-950 transition-all opacity-0 group-hover:opacity-100 duration-200"
                        title="Usuń cytat"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                      <div className="flex items-center gap-2">
                        {note.source && (
                          <span className="text-[8px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            📍 {note.source}
                          </span>
                        )}
                        <span className="text-[8px] text-stone-600 font-mono">
                          {new Date(note.created_at).toLocaleDateString("pl-PL")}
                        </span>
                      </div>
                      <p className="text-xs text-stone-300 italic leading-relaxed select-text font-serif line-clamp-3">
                        &quot;{note.content}&quot;
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};