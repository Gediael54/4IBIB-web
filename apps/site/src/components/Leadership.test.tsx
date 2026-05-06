import "@testing-library/jest-dom/vitest";
import type { Member } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn()
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listMembers: mocks.listMembers
    }
  }
}));

import Leadership, { LeadershipList, filterLeadership, sortLeadership } from "./Leadership";

function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    fullName: "Joao Silva",
    preferredName: "",
    birthDate: null,
    maritalStatus: null,
    gender: null,
    photoUrl: "",
    email: "",
    phone: "",
    whatsapp: "",
    cpf: null,
    rg: "",
    rgIssuer: "",
    profession: "",
    address: {
      zip: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: ""
    },
    householdId: null,
    churchRole: "pastor",
    membershipStatus: "ativo",
    joinedAt: null,
    baptismDate: null,
    baptismLocation: "",
    transferredFrom: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    prayerTopics: [],
    spiritualGifts: [],
    allergies: "",
    medicalNotes: "",
    consentMedicalDataAt: null,
    isVolunteer: false,
    volunteerMinistries: [],
    volunteerUnavailableDates: [],
    volunteerNotes: "",
    notes: "",
    consentGivenAt: null,
    consentVersion: "1.0",
    publicDirectory: true,
    publicBio: "Bio do membro.",
    dataRetentionUntil: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function renderLeadership() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={client}>
      <Leadership />
    </QueryClientProvider>
  );
}

describe("Leadership filtering and sorting", () => {
  it("filterLeadership keeps only public, non-deleted leadership roles", () => {
    const members = [
      makeMember({ id: "a", churchRole: "pastor", publicDirectory: true }),
      makeMember({ id: "b", churchRole: "membro_comum", publicDirectory: true }),
      makeMember({ id: "c", churchRole: "pastor", publicDirectory: false }),
      makeMember({ id: "d", churchRole: "diacono", publicDirectory: true, deletedAt: "2026-01-01" }),
      makeMember({ id: "e", churchRole: "presbitero", publicDirectory: true }),
      makeMember({ id: "f", churchRole: "tesoureiro", publicDirectory: true })
    ];
    const result = filterLeadership(members);
    expect(result.map((m) => m.id)).toEqual(["a", "e"]);
  });

  it("sortLeadership orders pastor > pastor_auxiliar > presbitero > diacono", () => {
    const members = [
      makeMember({ id: "d", churchRole: "diacono", fullName: "Carlos" }),
      makeMember({ id: "p", churchRole: "presbitero", fullName: "Bruno" }),
      makeMember({ id: "a", churchRole: "pastor_auxiliar", fullName: "Alice" }),
      makeMember({ id: "z", churchRole: "pastor", fullName: "Zeca" })
    ];
    const result = sortLeadership(members);
    expect(result.map((m) => m.id)).toEqual(["z", "a", "p", "d"]);
  });

  it("sortLeadership uses preferred name when present, falling back to full name", () => {
    const members = [
      makeMember({ id: "1", churchRole: "pastor", fullName: "Bruno Silva", preferredName: "" }),
      makeMember({ id: "2", churchRole: "pastor", fullName: "Carlos", preferredName: "Aurea" })
    ];
    const result = sortLeadership(members);
    expect(result.map((m) => m.id)).toEqual(["2", "1"]);
  });
});

describe("LeadershipList component", () => {
  it("renders nothing when there are no leadership members", () => {
    const { container } = render(<LeadershipList members={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a card per leadership member with role label and bio", () => {
    render(
      <LeadershipList
        members={[
          makeMember({
            id: "p1",
            churchRole: "pastor",
            fullName: "Joao Silva",
            preferredName: "Joao",
            publicBio: "Pastor desde 2015."
          }),
          makeMember({
            id: "d1",
            churchRole: "diacono",
            fullName: "Maria Santos",
            publicBio: "Servindo na cozinha."
          })
        ]}
      />
    );
    expect(screen.getByRole("heading", { level: 2, name: /Lideranca/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Joao" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Maria Santos" })).toBeInTheDocument();
    expect(screen.getByText("Pastor desde 2015.")).toBeInTheDocument();
    expect(screen.getByText("Servindo na cozinha.")).toBeInTheDocument();
    expect(screen.getAllByText("Pastor")[0]).toBeInTheDocument();
    expect(screen.getByText("Diacono")).toBeInTheDocument();
  });

  it("renders the photo as a picture set when url ends with .jpg", () => {
    const { container } = render(
      <LeadershipList
        members={[
          makeMember({
            id: "p1",
            churchRole: "pastor",
            photoUrl: "/pastor.jpg"
          })
        ]}
      />
    );
    expect(container.querySelector("picture")).not.toBeNull();
  });

  it("renders the photo as a plain img when url is not .jpg", () => {
    const { container } = render(
      <LeadershipList
        members={[
          makeMember({
            id: "p1",
            churchRole: "pastor",
            photoUrl: "https://example.com/avatar.png"
          })
        ]}
      />
    );
    expect(container.querySelector("picture")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("https://example.com/avatar.png");
  });

  it("hides the bio paragraph when publicBio is empty", () => {
    render(
      <LeadershipList
        members={[makeMember({ id: "p1", churchRole: "pastor", fullName: "Sem Bio", publicBio: "" })]}
      />
    );
    const card = screen.getByRole("heading", { level: 3, name: "Sem Bio" }).closest("article");
    expect(card?.querySelector("p")).toBeNull();
  });
});

describe("Leadership data fetching", () => {
  beforeEach(() => {
    mocks.listMembers.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("queries listMembers and renders the visible leadership", async () => {
    mocks.listMembers.mockResolvedValue([
      makeMember({
        id: "p1",
        churchRole: "pastor",
        fullName: "Pastor Joao",
        publicBio: "Lider servo."
      })
    ]);
    renderLeadership();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 3, name: "Pastor Joao" })).toBeInTheDocument();
    });
    expect(mocks.listMembers).toHaveBeenCalled();
  });
});
