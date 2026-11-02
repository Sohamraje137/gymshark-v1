/**
 * Turns a YouTube or Vimeo page URL into an embeddable iframe URL.
 * Returns null for anything else, so arbitrary sites can't be framed.
 */
export function toEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  const id = /^[\w-]{6,20}$/;

  if (host === "youtu.be") {
    const v = url.pathname.slice(1);
    return id.test(v) ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const v =
      url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ??
      "";
    return id.test(v) ? `https://www.youtube-nocookie.com/embed/${v}` : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const v = url.pathname.match(/(\d{6,12})/)?.[1];
    return v ? `https://player.vimeo.com/video/${v}` : null;
  }
  return null;
}
