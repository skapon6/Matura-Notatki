import { readFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/app/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data, error } = await supabase
    .from('notes')
    .select('file_path')
    .eq('slug', slug)
    .single()

  if (error || !data?.file_path) {
    return new NextResponse('Nie znaleziono notatki', { status: 404 })
  }

  try {
    const filePath = path.join(process.cwd(), 'private', 'notes', data.file_path)
    const html = await readFile(filePath, 'utf-8')
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch {
    return new NextResponse('Błąd odczytu pliku', { status: 500 })
  }
}