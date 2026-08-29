// lib/auth-utils.ts

/**
 * Tłumaczy techniczne błędy autoryzacji Supabase na czytelne komunikaty w języku polskim.
 */
export function translateAuthError(errorMsg: string): string {
  if (!errorMsg) return "Wystąpił nieoczekiwany błąd autoryzacji.";
  
  const msg = errorMsg.toLowerCase().trim();

  // 1. Walidacja złożoności i siły hasła (Password Strength Policy)
  if (msg.includes("different from the old password") || msg.includes("same as the old password")) {
    return "Nowe hasło musi różnić się od Twojego dotychczasowego hasła.";
  }
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

  // 3. Linki weryfikacyjne i tokeny OTP (Reset hasła / Rejestracja)
  if (msg.includes("otp_expired") || msg.includes("token has expired") || msg.includes("invalid or has expired") || msg.includes("email link is invalid")) {
    return "Link wygasł lub został już wcześniej wykorzystany. Wyślij nową prośbę o reset hasła.";
  }
  if (msg.includes("auth session missing")) {
    return "Brak aktywnej sesji autoryzacyjnej. Otwórz ponownie link z wiadomości e-mail.";
  }

  // 4. Limity częstotliwości zapytań (Rate Limits)
  if (msg.includes("email rate limit exceeded") || msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Przekroczono limit wysyłania wiadomości. Odczekaj chwilę przed kolejną próbą.";
  }

  // 5. Inne błędy systemowe i sieciowe
  if (msg.includes("signup is disabled") || msg.includes("sign up is disabled")) {
    return "Rejestracja nowych użytkowników jest obecnie tymczasowo wyłączona przez administratora.";
  }
  if (msg.includes("network_error") || msg.includes("failed to fetch") || msg.includes("network error")) {
    return "Błąd połączenia sieciowego. Sprawdź swoje połączenie z internetem i spróbuj ponownie.";
  }

  // Fallback - jeśli błąd nie pasuje do wzorców, zwracamy go w oryginalnej formie
  return errorMsg;
}
// Dodaj na końcu pliku lib/auth-utils.ts:

/**
 * Jednolita walidacja hasła dla rejestracji i resetu hasła
 */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) {
    return "Hasło musi mieć co najmniej 8 znaków.";
  }
  if (!/[0-9]/.test(password)) {
    return "Hasło musi zawierać co najmniej jedną cyfrę.";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Hasło musi zawierać co najmniej jedną literę.";
  }
  // Opcjonalnie: jeśli chcesz wymuszać znak specjalny, odkomentuj poniższe 3 linijki:
  // if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
  //   return "Hasło musi zawierać co najmniej jeden znak specjalny (np. ! @ # $).";
  // }

  return null; // Hasło jest poprawne
}