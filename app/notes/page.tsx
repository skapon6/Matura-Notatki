// app/notes/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import NotesClientView from './NotesClientView';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Wszystkie Notatki i Lektury Maturalne | Wiedza Szyta na Miarę',
  description: 'Kompletna baza 42 lektur, epok literackich i poradników maturalnych z języka polskiego. Opracowania, motywy, konteksty i pytania CKE.',
  alternates: {
    canonical: 'https://wiedzaszytanamiare.pl/notes',
  },
};

export default async function NotesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: notes } = await supabase
    .from('notes')
    .select('id, title, slug, era, type, difficulty, read_time, chips, content, is_free')
    .order('id', { ascending: true });

  return <NotesClientView initialNotes={notes || []} />;
}