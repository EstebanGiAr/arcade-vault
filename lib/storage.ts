export type SessionUser = { name: string };

const USER_KEY = "av_user";
const SKIN_KEY = "av_skin";

export function getUser(): SessionUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function setUser(user: SessionUser | null): void {
  try {
    if (user === null) {
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch {
    // localStorage no disponible (SSR, modo privado, etc.)
  }
}

export function readSkin(): string | null {
  try {
    return localStorage.getItem(SKIN_KEY);
  } catch {
    return null;
  }
}

export function writeSkin(id: string): void {
  try {
    localStorage.setItem(SKIN_KEY, id);
  } catch {
    // localStorage no disponible (SSR, modo privado, etc.)
  }
}
