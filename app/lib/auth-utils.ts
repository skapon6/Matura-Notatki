export const translateAuthError = (message: string): string => {
  const msg = message.toLowerCase();
  
  if (msg.includes("user already registered") || msg.includes("already exists")) {
    return "Użytkownik o tym adresie e-mail już istnieje!";
  }
  if (msg.includes("password should be at least")) {
    return "Hasło musi mieć co najmniej 6 znaków!";
  }
  if (msg.includes("invalid login credentials")) {
    return "Niepoprawny adres e-mail lub hasło!";
  }
  if (msg.includes("signup requires a valid email")) {
    return "Wprowadź poprawny adres e-mail!";
  }
  if (msg.includes("email rate limit exceeded") || msg.includes("rate limit")) {
    return "Zbyt wiele prób w krótkim czasie. Odczekaj chwilę!";
  }
  
  return message;
};