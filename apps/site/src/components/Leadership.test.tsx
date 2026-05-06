import "@testing-library/jest-dom/vitest";
import type { PublicMember } from "@4ibib/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listPublicMembers: vi.fn()
}));

vi.mock("../backend", () => ({
  backend: {
    mode: "supabase",
    content: {
      listPublicMembers: mocks.listPublicMembers
    }
  }
}));

import Leadership, { LeadershipList, filterLeadership, sortLeadership } from "./Leadership";

function makeMember(overrides: Partial<PublicMember> = {}): PublicMember {
  return {
    id: "m1",
    fullName: "Joao Silva",
    preferredName: "",
    photoUrl: "",
    churchRole: "pastor",
    publicBio: "Bio do membro.",
    isVolunteer: false,
    householdId: null,
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
  it("filterLeadership keeps only leadership roles", () => {
    const members = [
      makeMember({ id: "a", churchRole: "pastor" }),
      makeMember({ id: "b", churchRole: "membro_comum" }),
      makeMember({ id: "e", churchRole: "presbitero" }),
      makeMember({ id: "f", churchRole: "tesoureiro" }),
      makeMember({ id: "d", churchRole: "diacono" })
    ];
    const result = filterLeadership(members);
    expect(result.map((m) => m.id)).toEqual(["a", "e", "d"]);
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
    expect(screen.getByRole("heading", { level: 2, name: /Lideran/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Joao" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Maria Santos" })).toBeInTheDocument();
    expect(screen.getByText("Pastor desde 2015.")).toBeInTheDocument();
    expect(screen.getByText("Servindo na cozinha.")).toBeInTheDocument();
    expect(screen.getAllByText("Pastor")[0]).toBeInTheDocument();
    expect(screen.getByText("Diácono")).toBeInTheDocument();
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
    mocks.listPublicMembers.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("queries listPublicMembers and renders the visible leadership", async () => {
    mocks.listPublicMembers.mockResolvedValue([
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
    expect(mocks.listPublicMembers).toHaveBeenCalled();
  });
});
