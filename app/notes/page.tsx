import { supabase } from '../lib/supabase'

export default async function NotesPage() {
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*')

  if (error) {
    return <div>Błąd: {error.message}</div>
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Notatki maturalne</h1>
      <div className="flex flex-col gap-4">
        {notes?.map((note) => (
          <div key={note.id} className="border rounded-lg p-4 shadow-sm">
            <h2 className="text-xl font-semibold">{note.title}</h2>
            <p className="text-sm text-gray-500 mb-2">{note.subject}</p>
            <p className="text-gray-700">{note.content}</p>
          </div>
        ))}
      </div>
    </main>
  )
}