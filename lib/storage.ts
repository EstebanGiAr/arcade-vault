const SKIN_KEY = "av_skin";

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
