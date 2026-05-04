import "@testing-library/jest-dom/vitest";
import { Inbox } from "lucide-react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { configureAxe, type AxeMatchers } from "vitest-axe";
import { toHaveNoViolations } from "vitest-axe/dist/matchers.js";
import { ConfirmProvider, useConfirm } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { ListView } from "./ListView";
import { Modal } from "./Modal";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { ToastProvider, useToast } from "./Toast";

declare module "vitest" {
  interface Assertion<T> extends AxeMatchers {
    _phantom?: T;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false }
  }
});

beforeAll(() => {
  expect.extend({ toHaveNoViolations });
});

function ToastTrigger() {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast("Salvo com sucesso", { duration: 5000 })}>
      disparar
    </button>
  );
}

function ConfirmTrigger() {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={() => {
        void confirm({ title: "Excluir aviso?", message: "Vai sumir.", destructive: true });
      }}
    >
      abrir
    </button>
  );
}

describe("a11y dos primitives do admin", () => {
  afterEach(() => cleanup());

  it("ToastProvider com toast ativo nao viola regras axe", async () => {
    const { container } = render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText("disparar"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("EmptyState com titulo, descricao e acao nao viola regras axe", async () => {
    const { container } = render(
      <EmptyState
        icon={<Inbox aria-hidden="true" />}
        title="Sem avisos"
        description="Crie o primeiro aviso pra ver aqui."
        action={
          <button type="button" className="button primary">
            Novo aviso
          </button>
        }
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ListView em estado loading nao viola regras axe", async () => {
    const { container } = render(<ListView title="Avisos" items={[]} loading renderItem={() => null} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ListView em estado vazio com EmptyState nao viola regras axe", async () => {
    const { container } = render(
      <ListView
        title="Avisos"
        items={[]}
        renderItem={() => null}
        emptyState={<EmptyState icon={<Inbox aria-hidden="true" />} title="Sem avisos" />}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Modal aberto com titulo e footer nao viola regras axe", async () => {
    const { container } = render(
      <Modal
        open
        onClose={() => undefined}
        title="Editar aviso"
        footer={
          <>
            <button type="button" className="button ghost">
              Cancelar
            </button>
            <button type="button" className="button primary">
              Salvar
            </button>
          </>
        }
      >
        <p>Conteudo do modal pra cobertura de a11y.</p>
      </Modal>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ConfirmDialog aberto nao viola regras axe", async () => {
    const { container } = render(
      <ConfirmProvider>
        <ConfirmTrigger />
      </ConfirmProvider>
    );
    fireEvent.click(screen.getByText("abrir"));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ShortcutsHelp aberto nao viola regras axe", async () => {
    const { container } = render(<ShortcutsHelp open onClose={() => undefined} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
