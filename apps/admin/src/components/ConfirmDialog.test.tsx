import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm, type ConfirmOptions } from "./ConfirmDialog";

function Trigger({ options, onResult }: { options: ConfirmOptions; onResult: (value: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={async () => {
        const value = await confirm(options);
        onResult(value);
      }}
    >
      open
    </button>
  );
}

describe("ConfirmDialog", () => {
  afterEach(() => cleanup());

  it("resolves true when the confirm button is clicked", async () => {
    let result: boolean | null = null;
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: "Excluir aviso?", message: "Vai sumir." }}
          onResult={(value) => {
            result = value;
          }}
        />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByText("Excluir aviso?")).toBeInTheDocument();
    expect(screen.getByText("Vai sumir.")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByTestId("confirm-dialog-confirm"));
    });
    expect(result).toBe(true);
  });

  it("resolves false when cancel is clicked", async () => {
    let result: boolean | null = null;
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: "t", message: "m" }}
          onResult={(value) => {
            result = value;
          }}
        />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("open"));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    });
    expect(result).toBe(false);
  });

  it("disables confirm button until requireText matches", async () => {
    let result: boolean | null = null;
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: "t", message: "m", requireText: "EXCLUIR" }}
          onResult={(value) => {
            result = value;
          }}
        />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("open"));

    const confirmButton = screen.getByTestId("confirm-dialog-confirm");
    expect(confirmButton).toBeDisabled();

    const input = screen.getByLabelText("Digite EXCLUIR para confirmar");
    fireEvent.change(input, { target: { value: "errado" } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(input, { target: { value: "EXCLUIR" } });
    expect(confirmButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(confirmButton);
    });
    expect(result).toBe(true);
  });

  it("applies danger class for destructive variant", () => {
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: "t", message: "m", destructive: true, confirmText: "Apagar" }}
          onResult={() => {}}
        />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("open"));
    const confirmButton = screen.getByTestId("confirm-dialog-confirm");
    expect(confirmButton).toHaveClass("danger");
    expect(confirmButton).toHaveTextContent("Apagar");
  });

  it("uses primary class when not destructive", () => {
    render(
      <ConfirmProvider>
        <Trigger options={{ title: "t", message: "m" }} onResult={() => {}} />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("open"));
    const confirmButton = screen.getByTestId("confirm-dialog-confirm");
    expect(confirmButton).toHaveClass("primary");
  });

  it("resolves false on Escape (modal close)", async () => {
    let result: boolean | null = null;
    render(
      <ConfirmProvider>
        <Trigger
          options={{ title: "t", message: "m" }}
          onResult={(value) => {
            result = value;
          }}
        />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("open"));
    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(result).toBe(false);
  });

  it("throws when useConfirm is used outside provider", () => {
    function Broken() {
      useConfirm();
      return null;
    }
    const original = console.error;
    console.error = () => {};
    expect(() => render(<Broken />)).toThrow();
    console.error = original;
  });

  it("uses custom confirm and cancel labels when provided", () => {
    render(
      <ConfirmProvider>
        <Trigger
          options={{
            title: "t",
            message: "m",
            confirmText: "Arquivar",
            cancelText: "Voltar"
          }}
          onResult={() => {}}
        />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByText("Arquivar")).toBeInTheDocument();
    expect(screen.getByText("Voltar")).toBeInTheDocument();
  });
});
