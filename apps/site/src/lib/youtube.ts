const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

const ID_PATTERN = /^[A-Za-z0-9_-]{6,32}$/u;

export function extractYouTubeId(url: string | null | undefined): string | null {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    return null;
  }

  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
    return ID_PATTERN.test(id) ? id : null;
  }

  const watchId = parsed.searchParams.get("v");
  if (watchId && ID_PATTERN.test(watchId)) {
    return watchId;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments[0] === "embed" || segments[0] === "shorts" || segments[0] === "live") {
    const id = segments[1] ?? "";
    return ID_PATTERN.test(id) ? id : null;
  }

  return null;
}

export function youtubeThumbnailUrl(url: string | null | undefined): string | null {
  const id = extractYouTubeId(url);
  if (!id) {
    return null;
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
