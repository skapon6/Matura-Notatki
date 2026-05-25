// app/lib/supabase.ts
import { createBrowserClient } from '@supabase/ssr' // <-- Zmiana na wersję dla SSR

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// createBrowserClient automatycznie zadba o przesyłanie ciasteczek logowania do serwera!
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)