// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Inicjalizujemy klienta Resend darmowym kluczem z pliku .env.local
const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const { email, subject, message } = await req.json();

    if (!email || !subject || !message) {
      return NextResponse.json({ error: "Wszystkie pola są wymagane." }, { status: 400 });
    }

    // Wysyłamy e-mail za pomocą darmowej usługi Resend
    const { data, error } = await resend.emails.send({
      // Darmowa domena testowa nadawcy Resend (gdy kupisz własną domenę, będziesz mógł zmienić na np. kontakt@TwojaDomena.pl)
      from: "Platforma Maturalna <onboarding@resend.dev>",
      to: "wiedzaszytanamiare@gmail.com", // Twój prawdziwy adres e-mail ze zrzutu ekranu!
      replyTo: email, // Klikając "odpowiedz" na swojej skrzynce, odpiszesz bezpośrednio do ucznia
      subject: `[Formularz] ${subject}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; background-color: #f9f9f9; border-radius: 12px; max-width: 600px; border: 1px solid #ddd;">
          <h2 style="color: #c68a4c; border-bottom: 1px solid #eee; padding-bottom: 10px; font-family: serif; font-size: 20px;">Nowa wiadomość z formularza kontaktowego:</h2>
          <p style="font-size: 13px;"><strong>Od nadawcy:</strong> ${email}</p>
          <p style="font-size: 13px;"><strong>Temat:</strong> ${subject}</p>
          <p style="margin-top: 20px; font-weight: bold; font-size: 13px;">Treść wiadomości:</p>
          <p style="white-space: pre-wrap; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #eee; font-size: 13px; line-height: 1.6; color: #444;">${message}</p>
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
    return NextResponse.json({ error: "Wystąpił błąd serwera podczas wysyłania." }, { status: 500 });
  }
}