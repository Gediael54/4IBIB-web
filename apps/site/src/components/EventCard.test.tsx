import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChurchProfile, ScheduleItem } from "@4ibib/core";
import EventCard from "./EventCard";

const PROFILE: ChurchProfile = {
  id: "main",
  name: "4a Igreja Batista Independente Betel",
  shortName: "4a Betel",
  tagline: "",
  city: "",
  pastorName: "",
  address: "",
  email: "",
  whatsapp: "",
  instagramUrl: "",
  youtubeUrl: "",
  mapsUrl: "",
  heroVerse: "",
  mission: "",
  foundedText: "",
  regularMeetings: [],
  updatedAt: ""
};

function makeItem(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: "evt-1",
    title: "Culto Solene",
    ministry: "Pregacao",
    startsAt: "2026-02-01T20:00:00.000Z",
    endsAt: "2026-02-01T22:00:00.000Z",
    location: "",
    summary: "",
    preacher: "Pr. Augusto",
    director: "",
    passage: "Marcos 5",
    occasionLabel: "",
    status: "scheduled",
    featured: false,
    ...overrides
  };
}

describe("EventCard", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00.000Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders title, time, preacher, passage and home location fallback", () => {
    render(<EventCard item={makeItem()} profile={PROFILE} />);
    expect(screen.getByText("Culto Solene")).toBeInTheDocument();
    expect(screen.getByText("17h00")).toBeInTheDocument();
    expect(screen.getByText("Pregador")).toBeInTheDocument();
    expect(screen.getByText("Pr. Augusto")).toBeInTheDocument();
    expect(screen.getByText("Leitura")).toBeInTheDocument();
    expect(screen.getByText("Marcos 5")).toBeInTheDocument();
    expect(screen.getByText(PROFILE.shortName)).toBeInTheDocument();
    expect(screen.getByText(PROFILE.name)).toBeInTheDocument();
  });

  it("hides empty optional fields", () => {
    render(<EventCard item={makeItem({ preacher: "", director: "", passage: "" })} profile={PROFILE} />);
    expect(screen.queryByText("Pregador")).toBeNull();
    expect(screen.queryByText("Dirigente")).toBeNull();
    expect(screen.queryByText("Leitura")).toBeNull();
  });

  it("renders external location literal without secondary line", () => {
    render(<EventCard item={makeItem({ location: "Sitio Marcos 5" })} profile={PROFILE} />);
    expect(screen.getByText("Sitio Marcos 5")).toBeInTheDocument();
    expect(screen.queryByText(PROFILE.shortName)).toBeNull();
  });

  it("marks suspended events with the SUSPENSO tag and applies class", () => {
    const { container } = render(<EventCard item={makeItem({ status: "suspended" })} profile={PROFILE} />);
    expect(screen.getByText(/\(SUSPENSO\)/)).toBeInTheDocument();
    expect(container.querySelector(".event-card.suspended")).not.toBeNull();
  });

  it("renders 'Livre' italic and hides meta for free slots", () => {
    render(<EventCard item={makeItem({ status: "free", title: "" })} profile={PROFILE} />);
    expect(screen.getByText("Livre")).toBeInTheDocument();
    expect(screen.queryByText("Local")).toBeNull();
  });

  it("highlights featured events with star and class", () => {
    const { container } = render(<EventCard item={makeItem({ featured: true })} profile={PROFILE} />);
    expect(container.querySelector(".event-card.featured")).not.toBeNull();
    expect(container.querySelector(".event-card-star")).not.toBeNull();
  });

  it("renders occasion badge when label is present", () => {
    render(<EventCard item={makeItem({ occasionLabel: "PASCOA" })} profile={PROFILE} />);
    expect(screen.getByText("PASCOA")).toBeInTheDocument();
  });

  it("renders day label and hour when showDay is true", () => {
    render(<EventCard item={makeItem()} profile={PROFILE} compact showDay dayLabel="Dom · 1 fev" />);
    expect(screen.getByText("Dom · 1 fev")).toBeInTheDocument();
    expect(screen.getByText("17h00")).toBeInTheDocument();
  });
});
