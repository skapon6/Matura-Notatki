import React from "react";
// Poprawiona ścieżka do Twojego klienta Supabase
import { supabase } from "../../lib/supabase";
import NoteViewer from "../NoteViewer";

type Props = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function Page({ params }: Props) {
  // Bezpieczne rozpakowanie params (działa na każdej wersji Next.js)
  const resolvedParams = params instanceof Promise ? await params : params;
  const slug = resolvedParams.slug;

  // Fetch single note by slug from Supabase
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    console.error("Supabase error:", error); // Log dla Ciebie w terminalu VS Code
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1b18] p-8">
        <div className="max-w-xl text-center">
          <h2 className="text-2xl font-bold text-[#f4f1de]">Notatka nie znaleziona</h2>
          <p className="mt-2 text-sm text-gray-400">Spróbuj wrócić do kącika naukowego.</p>
        </div>
      </div>
    );
  }

  // Zabezpieczenie danych struktury JSONB
  const note = { ...data };
  try {
    if (typeof note.content === "string") {
      note.content = JSON.parse(note.content);
    }
  } catch (e) {
    console.error("JSON parse error:", e);
  }

  return <NoteViewer note={note} />;
}