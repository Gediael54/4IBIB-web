import { describe, expect, it, vi } from "vitest";
import type { Announcement, Commemoration, ScheduleItem } from "@4ibib/core";
import {
  buildAnnouncementMessage,
  buildCommemorationMessage,
  buildPrayerInviteMessage,
  buildScheduleMessage,
  buildWhatsAppShareUrl,
  copyMessageToClipboard
} from "./whatsapp-share";

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: "a1",
    title: "Reuniao de oracao",
    summary: "Toda quarta as 19:30 no templo.",
    category: "oracao",
    publishedAt: "2026-05-01T10:00:00.000Z",
    pinned: false,
    ctaLabel: "",
    ctaUrl: "",
    status: "published",
    expiresAt: null,
    imageUrl: "",
    ...overrides
  };
}

function makeScheduleItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "s1",
    title: "Culto Solene",
    ministry: "culto-solene",
    startsAt: "2026-05-10T20:00:00.000Z",
    endsAt: "2026-05-10T22:00:00.000Z",
    location: "",
    summary: "",
    preacher: "Pr. Samuel",
    director: "",
    soundTeam: "",
    passage: "Salmo 23",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    seriesId: null,
    youtubeUrl: "",
    ...overrides
  };
}

function makeCommemoration(overrides: Partial<Commemoration> = {}): Commemoration {
  return {
    id: "c1",
    name: "Mes de Missoes",
    type: "month",
    month: 7,
    dayOfMonth: null,
    description: "",
    color: "#0f766e",
    sortOrder: 0,
    ...overrides
  };
}

describe("buildAnnouncementMessage", () => {
  it("formats title, summary and link", () => {
    const message = buildAnnouncementMessage(makeAnnouncement());
    expect(message).toContain("*Reuniao de oracao*");
    expect(message).toContain("Toda quarta as 19:30 no templo.");
    expect(message).toContain("/#avisos");
  });

  it("includes ctaUrl when present", () => {
    const message = buildAnnouncementMessage(
      makeAnnouncement({ ctaUrl: "https://example.com/x", ctaLabel: "Inscreva-se" })
    );
    expect(message).toContain("Inscreva-se");
    expect(message).toContain("https://example.com/x");
  });

  it("falls back to default cta label", () => {
    const message = buildAnnouncementMessage(
      makeAnnouncement({ ctaUrl: "https://example.com/x", ctaLabel: "" })
    );
    expect(message).toContain("Saiba mais");
  });
});

describe("buildScheduleMessage", () => {
  it("includes title, time and preacher", () => {
    const message = buildScheduleMessage(makeScheduleItem());
    expect(message).toContain("*Culto Solene*");
    expect(message).toContain("Pregador: Pr. Samuel");
    expect(message).toContain("Leitura: Salmo 23");
    expect(message).toContain("/#programacao");
  });

  it("appends youtube transmission when present", () => {
    const message = buildScheduleMessage(makeScheduleItem({ youtubeUrl: "https://youtu.be/abc123" }));
    expect(message).toContain("Transmissao: https://youtu.be/abc123");
  });

  it("omits empty fields gracefully", () => {
    const message = buildScheduleMessage(makeScheduleItem({ preacher: "", passage: "", location: "" }));
    expect(message).not.toContain("Pregador:");
    expect(message).not.toContain("Leitura:");
    expect(message).not.toContain("Local:");
  });
});

describe("buildCommemorationMessage", () => {
  it("formats month-wide commemoration", () => {
    const message = buildCommemorationMessage(makeCommemoration());
    expect(message).toContain("*Mes de Missoes*");
    expect(message).toContain("Julho");
  });

  it("formats day-specific commemoration", () => {
    const message = buildCommemorationMessage(
      makeCommemoration({ type: "day", month: 5, dayOfMonth: 10, name: "Dia das Maes" })
    );
    expect(message).toContain("*Dia das Maes*");
    expect(message).toContain("10 de Maio");
  });

  it("includes description when present", () => {
    const message = buildCommemorationMessage(
      makeCommemoration({ description: "Lembre da igreja em oracao." })
    );
    expect(message).toContain("Lembre da igreja em oracao.");
  });
});

describe("buildPrayerInviteMessage", () => {
  it("returns invite with site contact link", () => {
    const message = buildPrayerInviteMessage();
    expect(message).toContain("/#contato");
  });
});

describe("buildWhatsAppShareUrl", () => {
  it("encodes message for wa.me", () => {
    const url = buildWhatsAppShareUrl("Olá mundo & teste");
    expect(url).toBe("https://wa.me/?text=Ol%C3%A1%20mundo%20%26%20teste");
  });
});

describe("copyMessageToClipboard", () => {
  it("returns true on success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await expect(copyMessageToClipboard("hi")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hi");
  });

  it("returns false on failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await expect(copyMessageToClipboard("hi")).resolves.toBe(false);
  });

  it("returns false when clipboard is unavailable", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    await expect(copyMessageToClipboard("hi")).resolves.toBe(false);
  });
});
