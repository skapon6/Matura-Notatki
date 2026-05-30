// lib/auth-utils.ts

/**
 * Tłumaczy techniczne błędy autoryzacji Supabase na czytelne komunikaty w języku polskim.
 */
export function translateAuthError(errorMsg: string): string {
  if (!errorMsg) return "Wystąpił nieoczekiwany błąd autoryzacji.";
  
  const msg = errorMsg.toLowerCase().trim();

  // 1. Walidacja złożoności i siły hasła (Password Strength Policy)
  if (msg.includes("password should contain at least one character of each") || msg.includes("abcdefghijklmnopqrstuvwxyz")) {
    return "Hasło jest za słabe! Musi zawierać co najmniej jedną małą literę, jedną wielką literę oraz jedną cyfrę.";
  }
  if (msg.includes("password should be at least") || msg.includes("password is too short")) {
    return "Hasło jest za krótkie. Musi mieć co najmniej 8 znaków.";
  }

  // 2. Błędy logowania i konta
  if (msg.includes("invalid login credentials") || msg.includes("invalid claim") || msg.includes("invalid email or password")) {
    return "Niepoprawny adres e-mail lub hasło. Spróbuj ponownie.";
  }
  if (msg.includes("user already exists") || msg.includes("already registered") || msg.includes("email already in use")) {
    return "Użytkownik o tym adresie e-mail jest już zarejestrowany w naszym kąciku.";
  }
  if (msg.includes("email not confirmed") || msg.includes("confirm your email") || msg.includes("email confirmation")) {
    return "Twój adres e-mail nie został jeszcze zweryfikowany. Kliknij link aktywacyjny wysłany na Twoją pocztę.";
  }

  // 3. Limity częstotliwości zapytań (Rate Limits)
  if (msg.includes("email rate limit exceeded") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Przekroczono limit wysyłania wiadomości. Odczekaj chwilę przed kolejną próbą.";
  }

  // 4. Inne błędy systemowe i sieciowe
  if (msg.includes("signup is disabled") || msg.includes("sign up is disabled")) {
    return "Rejestracja nowych użytkowników jest obecnie tymczasowo wyłączona przez administratora.";
  }
  if (msg.includes("network_error") || msg.includes("failed to fetch") || msg.includes("network error")) {
    return "Błąd połączenia sieciowego. Sprawdź swoje połączenie z internetem i spróbuj ponownie.";
  }

  // Fallback - jeśli błąd nie pasuje do wzorców, zwracamy go w oryginalnej formie, by nie utrudniać debugowania
  return errorMsg;
}