import "@testing-library/jest-dom/vitest";
import type { ChurchProfile, RegularMeeting, SiteSnapshot } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn().mockImplementation(async (profile: ChurchProfile) => profile)
}));

vi.mock("../backend", () => ({
  createBackend: () => ({
    mode: "mock",
    content: {
      updateProfile: mocks.updateProfile
    }
  })
}));

import ProfileView from "./ProfileView";

function buildProfile(overrides: Partial<ChurchProfile> = {}): ChurchProfile {
  return {
    id: "main",
    name: "4a Igreja Batista Independente Betel",
    shortName: "4IBIB",
    tagline: "Tagline",
    city: "Recife",
    pastorName: "Pastor",
    address: "Rua A",
    email: "contato@example.test",
    whatsapp: "5581900000000",
    instagramUrl: "",
    youtubeUrl: "",
    mapsUrl: "",
    heroVerse: "Versiculo",
    mission: "Missao",
    foundedText: "Historia",
    regularMeetings: [],
    updatedAt: "2030-01-01T00:00:00.000Z",
    ...overrides
  };
}

function buildSnapshot(profile: ChurchProfile = buildProfile()): SiteSnapshot {
  return {
    profile,
    announcements: [],
    ministries: [],
    schedule: []
  };
}

function renderView(snapshot: SiteSnapshot = buildSnapshot()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileView snapshot={snapshot} />
    </QueryClientProvider>
  );
}

describe("ProfileView regular meetings", () => {
  afterEach(() => {
    cleanup();
    mocks.updateProfile.mockClear();
  });

  it("shows empty state when there are no meetings", () => {
    renderView();
    expect(screen.getByText("Nenhuma reuniao recorrente cadastrada.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adicionar reuniao/i })).toBeInTheDocument();
  });

  it("appends a row with default values when 'Adicionar reuniao' is clicked", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /adicionar reuniao/i }));

    expect(screen.queryByText("Nenhuma reuniao recorrente cadastrada.")).not.toBeInTheDocument();
    const titleInput = screen.getByLabelText("Titulo") as HTMLInputElement;
    const weekdaySelect = screen.getByLabelText("Dia da semana") as HTMLSelectElement;
    const startsInput = screen.getByLabelText("Inicio") as HTMLInputElement;
    const endsInput = screen.getByLabelText("Termino") as HTMLInputElement;

    expect(titleInput.value).toBe("");
    expect(weekdaySelect.value).toBe("Domingo");
    expect(startsInput.value).toBe("19:00");
    expect(endsInput.value).toBe("20:30");
  });

  it("shows a validation error when endsAt is before startsAt", async () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: /adicionar reuniao/i }));

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Culto" } });
    fireEvent.change(screen.getByLabelText("Inicio"), { target: { value: "20:00" } });
    fireEvent.change(screen.getByLabelText("Termino"), { target: { value: "19:00" } });

    const form = screen.getByRole("button", { name: /salvar igreja/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Termino deve ser apos o inicio.")).toBeInTheDocument();
    });
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("submits the profile with the meetings array including sortOrder by index", async () => {
    const existing: RegularMeeting = {
      id: "rm-1",
      title: "Culto solene",
      weekday: "Domingo",
      time: "17:00 - 19:00",
      startsAt: "17:00",
      endsAt: "19:00",
      description: "Culto da noite",
      sortOrder: 0
    };
    renderView(buildSnapshot(buildProfile({ regularMeetings: [existing] })));

    fireEvent.click(screen.getByRole("button", { name: /adicionar reuniao/i }));

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    const secondRow = rows[1];
    fireEvent.change(within(secondRow).getByLabelText("Titulo"), {
      target: { value: "Escola biblica" }
    });
    fireEvent.change(within(secondRow).getByLabelText("Dia da semana"), {
      target: { value: "Quinta" }
    });
    fireEvent.change(within(secondRow).getByLabelText("Inicio"), { target: { value: "19:30" } });
    fireEvent.change(within(secondRow).getByLabelText("Termino"), { target: { value: "21:00" } });

    const form = screen.getByRole("button", { name: /salvar igreja/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledTimes(1);
    });

    const payload = mocks.updateProfile.mock.calls[0][0] as ChurchProfile;
    expect(payload.regularMeetings).toHaveLength(2);
    expect(payload.regularMeetings[0]).toMatchObject({
      id: "rm-1",
      title: "Culto solene",
      weekday: "Domingo",
      startsAt: "17:00",
      endsAt: "19:00",
      sortOrder: 0
    });
    expect(payload.regularMeetings[1]).toMatchObject({
      title: "Escola biblica",
      weekday: "Quinta",
      startsAt: "19:30",
      endsAt: "21:00",
      sortOrder: 1
    });
  });
});
