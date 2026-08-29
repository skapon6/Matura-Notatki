// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Inicjalizujemy klienta Resend kluczem produkcyjnym z Vercela
const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { email, subject, message } = await req.json();

    if (!email || !subject || !message) {
      return NextResponse.json(
        { error: "Wszystkie pola są wymagane." },
        { status: 400 }
      );
    }

    // Wysyłamy e-mail przez Twoją zweryfikowaną domenę produkcyjną
    const { data, error } = await resend.emails.send({
      from: "Wiedza Szyta na Miarę <kontakt@wiedzaszytanamiare.pl>",
      to: "wiedzaszytanamiare@gmail.com", // Twój adres docelowy
      replyTo: email,                     // Kliknięcie "Odpowiedz" w Gmailu odpisze do ucznia
      subject: `[Wiedza Szyta na Miarę] ${subject}`,
      html: `
        <div style="font-family: 'Georgia', serif, sans-serif; padding: 25px; color: #e5e5e5; background-color: #1a1614; border-radius: 12px; max-width: 600px; border: 1px solid #332b27;">
          <h2 style="color: #c68a4c; border-bottom: 1px solid #332b27; padding-bottom: 12px; font-size: 20px; margin-top: 0;">
            Nowa wiadomość z formularza kontaktowego
          </h2>
          <p style="font-size: 14px; margin: 10px 0; color: #d4c5b9;">
            <strong style="color: #c68a4c;">Od nadawcy:</strong> ${email}
          </p>
          <p style="font-size: 14px; margin: 10px 0; color: #d4c5b9;">
            <strong style="color: #c68a4c;">Temat:</strong> ${subject}
          </p>
          <p style="margin-top: 20px; font-weight: bold; font-size: 14px; color: #c68a4c;">Treść wiadomości:</p>
          <div style="white-space: pre-wrap; background: #26201c; padding: 18px; border-radius: 8px; border: 1px solid #3d332d; font-size: 14px; line-height: 1.6; color: #f3ece6;">
${message}
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #8c7f76; border-top: 1px solid #332b27; padding-top: 12px;">
            Wiadomość wysłana z formularza na stronie wiedzaszytanamiare.pl. Wystarczy kliknąć „Odpowiedz”, aby napisać bezpośrednio do użytkownika.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Błąd wysyłania e-maila przez Resend API:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Błąd krytyczny serwera pocztowego:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera podczas wysyłania." },
      { status: 500 }
    );
  }
}