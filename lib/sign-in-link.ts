export type SignInInput =
  | { kind: "session"; access_token: string; refresh_token: string }
  | { kind: "token_hash"; token_hash: string }
  | { kind: "code"; token: string };

// Parse locally only: never navigate to, fetch, or log a pasted sign-in URL.
export function parseSignInInput(raw: string): SignInInput {
  let value = raw.trim();
  if (/^localhost(?::\d+)?\//i.test(value)) value = `http://${value}`;
  if (/^disney-pin-db\.vercel\.app\//i.test(value)) value = `https://${value}`;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    const fragment = new URLSearchParams(url.hash.slice(1));
    if (fragment.has("error") || fragment.has("error_description")) {
      throw new Error(
        "That sign-in link has expired or was rejected. Request a new email.",
      );
    }
    const access_token = fragment.get("access_token");
    const refresh_token = fragment.get("refresh_token");
    if (access_token && refresh_token)
      return { kind: "session", access_token, refresh_token };
    const token_hash =
      url.searchParams.get("token_hash") || url.searchParams.get("token");
    if (token_hash) return { kind: "token_hash", token_hash };
    throw new Error(
      "Copy the entire sign-in URL, including everything after #, or use the original email link.",
    );
  }
  if (/^\d{6,10}$/.test(value)) return { kind: "code", token: value };
  throw new Error(
    "Paste your full email link, the localhost URL from Safari, or an email verification code.",
  );
}
