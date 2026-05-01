import "@testing-library/jest-dom/vitest";
import type { SiteSnapshot, Volunteer } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveScheduleItem: vi.fn().mockResolvedValue({}),
  deleteScheduleItem: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      saveScheduleItem: mocks.saveScheduleItem,
      deleteScheduleItem: mocks.deleteScheduleItem
    }
  }
}));

import ScheduleView from "./ScheduleView";

function buildSnapshot(volunteers: Volunteer[] = []): SiteSnapshot {
  return {
    announcements: [],
    schedule: [],
    volunteers,
    profile: null,
    ministries: [],
    recurringMeetings: []
  };
}

function makeVolunteer(overrides: Partial<Volunteer> = {}): Volunteer {
  return {
    id: "v",
    name: "Voluntario",
    role: "geral",
    sortOrder: 0,
    contact: "",
    photoUrl: "",
    ministries: [],
    unavailableDates: [],
    notes: "",
    ...overrides
  };
}

function renderView(snapshot: SiteSnapshot = buildSnapshot()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ScheduleView
        snapshot={snapshot}
        state={{ search: "", sort: "startsAsc", page: 1 }}
        onStateChange={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe("ScheduleView form", () => {
  afterEach(() => {
    cleanup();
    mocks.saveScheduleItem.mockClear();
    mocks.deleteScheduleItem.mockClear();
  });

  it("renders inline errors when required fields are empty", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "" } });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Titulo e obrigatorio.")).toBeInTheDocument();
    });
    expect(screen.getByText("Ministerio e obrigatorio.")).toBeInTheDocument();
    expect(mocks.saveScheduleItem).not.toHaveBeenCalled();
  });

  it("submits the form when all required fields are valid", async () => {
    renderView();

    fireEvent.change(screen.getByLabelText("Titulo"), { target: { value: "Culto solene" } });
    fireEvent.change(screen.getByLabelText("Ministerio"), { target: { value: "Louvor" } });
    fireEvent.change(screen.getByLabelText("Equipe de som"), {
      target: { value: "Miguel, Brainer" }
    });

    const form = screen.getByRole("button", { name: /salvar/i }).closest("form");
    if (!form) {
      throw new Error("form not found");
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mocks.saveScheduleItem).toHaveBeenCalledTimes(1);
    });

    const payload = mocks.saveScheduleItem.mock.calls[0][0];
    expect(payload.title).toBe("Culto solene");
    expect(payload.ministry).toBe("Louvor");
    expect(payload.status).toBe("scheduled");
    expect(typeof payload.startsAt).toBe("string");
    expect(payload.soundTeam).toBe("Miguel, Brainer");
  });

  it("renders sound team field with datalist suggestions from volunteers", () => {
    const snapshot = buildSnapshot([
      makeVolunteer({ id: "v1", name: "Miguel", role: "som", sortOrder: 0 }),
      makeVolunteer({ id: "v2", name: "Brainer", role: "som", sortOrder: 1 }),
      makeVolunteer({ id: "v3", name: "Pastor Joao", role: "geral", sortOrder: 0 })
    ]);
    renderView(snapshot);

    const soundField = screen.getByLabelText("Equipe de som") as HTMLInputElement;
    expect(soundField).toBeInTheDocument();
    expect(soundField.getAttribute("list")).toBe("schedule-sound-team");

    const datalist = document.getElementById("schedule-sound-team");
    expect(datalist).not.toBeNull();
    const optionValues = Array.from(datalist?.querySelectorAll("option") ?? []).map(
      (option) => (option as HTMLOptionElement).value
    );
    expect(optionValues).toContain("Miguel");
    expect(optionValues).toContain("Brainer");
    expect(optionValues).not.toContain("Pastor Joao");
  });
});
