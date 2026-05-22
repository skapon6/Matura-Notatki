import { readFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: filePath } = await params

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
    const fullPath = path.join(process.cwd(), 'private', 'notes', ...filePath)
    const file = await readFile(fullPath)
    return new NextResponse(file, {
      headers: { 'Content-Type': contentTypes[ext || ''] || 'application/octet-stream' }
    })
  } catch {
    return new NextResponse('Nie znaleziono pliku', { status: 404 })
  }
}