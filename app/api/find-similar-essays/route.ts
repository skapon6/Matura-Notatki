// app/api/find-similar-essays/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSupabaseServer } from "../../lib/supabaseServer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    
    // 1. BEZPIECZNA WERYFIKACJA AUTORYZACJI (Zastąpienie getSession przez getUser)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
    }

    const { queryText } = await req.json();
    if (!queryText) {
      return NextResponse.json({ error: "Brak tekstu zapytania" }, { status: 400 });
    }

    // Walidacja długości tekstu zapytania (Zabezpieczenie przed przeciążeniem)
    if (queryText.length > 5000) {
      return NextResponse.json({ error: "Zapytanie jest zbyt długie (maksymalnie 5000 znaków)." }, { status: 400 });
    }

    // 2. SPÓJNY MODEL EMBEDDING (Zastąpienie text-embedding-004 modelem gemini-embedding-001)
    const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });
    
    let queryVector: number[];
    try {
      console.log("-> Generowanie wektora embedding dla zapytania...");
      const embeddingResult = await embeddingModel.embedContent({
        content: { role: "user", parts: [{ text: queryText }] },
        outputDimensionality: 768, // Wymiary spójne z wektorami zapisanymi w pgvector
      } as any);

      if (!embeddingResult.embedding?.values) {
        throw new Error("Otrzymano pusty wynik wektora z API Google");
      }
      queryVector = embeddingResult.embedding.values;
    } catch (aiError) {
      console.error("!!! Błąd generowania wektora embedding:", aiError);
      return NextResponse.json(
        { error: "Usługa generowania wektorów AI jest chwilowo niedostępna. Spróbuj ponownie za chwilę." },
        { status: 503 }
      );
    }

    // 3. Wywołanie funkcji RPC w Postgresie do dopasowania cosinusowego (Z podwyższonym progiem)
    const { data: matches, error: rpcError } = await supabase.rpc("match_essays", {
      query_embedding: queryVector,
      match_threshold: 0.80, // Podwyższony próg podobieństwa semantycznego (z 0.65) dla precyzyjniejszych wyników RAG
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