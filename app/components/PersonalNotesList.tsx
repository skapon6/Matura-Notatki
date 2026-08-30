"use client";

import React from "react";
import { ThemeClasses } from "../lib/theme";
import { supabase } from "../lib/supabase";

interface PersonalNote {
  id: string;
  content: string;
  source?: string;
  created_at: string;
}

interface PersonalNotesListProps {
  currentTheme: ThemeClasses;
  personalNotes: PersonalNote[];
  setPersonalNotes: React.Dispatch<React.SetStateAction<PersonalNote[]>>;
  triggerNotification: (message: string, type?: "success" | "error" | "info") => void;
  loading: boolean;
  onOpenModal: (note?: PersonalNote) => void;
}

export const PersonalNotesList: React.FC<PersonalNotesListProps> = ({
  currentTheme,
  personalNotes,
  setPersonalNotes,
  triggerNotification,
  loading,
  onOpenModal,
}) => {

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Zatrzymuje propagację, aby kliknięcie w kosz nie otworzyło modala
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

  if (loading) {
    return (
      <div className="text-center py-6 text-stone-500 text-xs">
        ⏳ Wczytywanie Twoich cytatów...
      </div>
    );
  }

  if (personalNotes.length === 0) {
    return (
      <div className="text-center py-6 px-3 border border-dashed border-stone-800/80 rounded-2xl text-stone-500 select-none">
        <span className="text-xl block mb-1">⭐</span>
        <p className="text-[11px] leading-relaxed">Twoja kieszeń na cytaty jest pusta.</p>
        <p className="text-[9px] text-stone-600 mt-1 leading-relaxed">
          Zaznacz ważny fragment podczas czytania notatki i kliknij gwiazdkę pojawiającą się nad tekstem, aby go tu zapisać.
        </p>
      </div>
    );
  }

  // Wybieramy tylko 3 najnowsze cytaty do bocznego paska
  const latestNotes = personalNotes.slice(0, 3);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        {latestNotes.map((note) => (
          <div
            key={note.id}
            onClick={() => onOpenModal(note)}
            className="group relative p-3.5 rounded-xl border border-stone-800/30 bg-stone-900/10 hover:bg-stone-900/30 hover:border-stone-800/80 cursor-pointer transition-all flex flex-col gap-1.5 select-none"
          >
            {/* Przycisk szybkiego usuwania na hover */}
            <button
              onClick={(e) => handleDelete(e, note.id)}
              className="absolute top-2.5 right-2.5 text-stone-600 hover:text-red-400 p-1 rounded-md hover:bg-stone-950 transition-all opacity-0 group-hover:opacity-100 duration-200"
              title="Usuń zapamiętany cytat"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {note.source && (
              <span className="text-[8px] uppercase tracking-widest text-amber-500 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 w-fit">
                📍 {note.source}
              </span>
            )}

            <p className="text-[11px] text-stone-300 italic leading-relaxed pr-6 line-clamp-3">
              &quot;{note.content}&quot;
            </p>

            <span className="text-[8px] text-stone-600 font-mono">
              {new Date(note.created_at).toLocaleDateString("pl-PL")}
            </span>
          </div>
        ))}
      </div>

      {personalNotes.length > 3 && (
        <button
          onClick={() => onOpenModal()}
          className="text-xs text-amber-500/80 hover:text-amber-400 hover:underline font-medium text-center mt-1 focus:outline-none w-full"
        >
          Zobacz wszystkie ({personalNotes.length}) ⭐
        </button>
      )}
    </div>
  );
};