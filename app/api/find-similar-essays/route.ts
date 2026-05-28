// app/api/find-similar-essays/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseServer } from "../../lib/supabaseServer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    
    // Weryfikacja sesji
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const { queryText } = await req.json();
    if (!queryText) {
      return NextResponse.json({ error: "Brak tekstu zapytania" }, { status: 400 });
    }

    // 1. Zamiana zapytania tekstowego na wektor
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embeddingResult = await embeddingModel.embedContent(queryText);
    const queryVector = embeddingResult.embedding.values;

    // 2. Wywołanie funkcji RPC w Postgresie do dopasowania cosinusowego
    const { data: matches, error: rpcError } = await supabase.rpc("match_essays", {
      query_embedding: queryVector,
      match_threshold: 0.65, // Zwróć tylko wyniki powyżej 65% podobieństwa semantycznego
      match_count: 5          // Maksymalnie 5 wyników
    });

    if (rpcError) {
      throw rpcError;
    }

    return NextResponse.json({ success: true, matches });

  } catch (error: any) {
    console.error("Błąd podczas wyszukiwania semantycznego:", error);
    return NextResponse.json({ error: "Wystąpił błąd podczas przeszukiwania bazy." }, { status: 500 });
  }
}