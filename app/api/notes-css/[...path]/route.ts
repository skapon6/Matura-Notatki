// app/api/notes-css/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: filePath } = await params

  // Wyciągamy rozszerzenie pliku, aby ustawić poprawny Content-Type
  const ext = filePath[filePath.length - 1].split('.').pop()
  const contentTypes: Record<string, string> = {
    css: 'text/css',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    webp: 'image/webp',
  }

  try {
    const owner = "skapon6"
    const repo = "Notatki-Private-Matura-Projekt"
    
    // filePath to tablica np. ['Barok', 'stylbarok.css']. 
    // Łączymy ją ukośnikami, aby utworzyć ścieżkę dla GitHuba: "Barok/stylbarok.css"
    const gitHubPath = filePath.join('/')

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${gitHubPath}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_NOTES_PAT}`,
          Accept: 'application/vnd.github.v3.raw',
        },
        // W przypadku stylów i obrazków możemy włączyć cache Next.js, 
        // aby nie odpytywać GitHuba przy każdym odświeżeniu strony
        next: { revalidate: 3600 } 
      }
    )

    if (!response.ok) {
      console.error(`Błąd pobierania zasobu z GitHub: ${response.status} ${response.statusText}`)
      return new NextResponse('Nie znaleziono pliku', { status: 404 })
    }

    // Pobieramy surowe bajty pliku (działa świetnie zarówno dla CSS jak i PNG/JPG)
    const fileBuffer = await response.arrayBuffer()

    return new NextResponse(fileBuffer, {
      headers: { 
        'Content-Type': contentTypes[ext || ''] || 'application/octet-stream',
        // Dodatkowo informujemy przeglądarkę, że może zapisać ten plik w pamięci podręcznej (cache)
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (err) {
    console.error('Błąd pobierania pliku z zewnętrznego serwera:', err)
    return new NextResponse('Błąd pobierania pliku', { status: 500 })
  }
}