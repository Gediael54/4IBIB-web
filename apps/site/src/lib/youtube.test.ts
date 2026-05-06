import { describe, expect, it } from "vitest";
import { extractYouTubeId, youtubeThumbnailUrl } from "./youtube";

describe("extractYouTubeId", () => {
  it("extracts id from youtube.com/watch URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from youtu.be short URL", () => {
    expect(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts id from youtube.com/embed URL", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null when URL is empty or null", () => {
    expect(extractYouTubeId("")).toBeNull();
    expect(extractYouTubeId(null)).toBeNull();
    expect(extractYouTubeId(undefined)).toBeNull();
  });

  it("returns null for non-youtube hosts or invalid URLs", () => {
    expect(extractYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(extractYouTubeId("nao-e-uma-url")).toBeNull();
    expect(extractYouTubeId("https://www.youtube.com/watch")).toBeNull();
  });
});

describe("youtubeThumbnailUrl", () => {
  it("builds thumbnail url for valid youtube link", () => {
    expect(youtubeThumbnailUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    );
  });

  it("returns null when input is invalid", () => {
    expect(youtubeThumbnailUrl("nao-e-url")).toBeNull();
  });
});
