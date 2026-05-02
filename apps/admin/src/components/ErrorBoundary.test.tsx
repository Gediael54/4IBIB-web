import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));

vi.mock("@sentry/react", () => ({
  captureException
}));

import { ErrorBoundary, ViewBoundary } from "./ErrorBoundary";

function Boom({ message = "kaboom" }: { message?: string }): ReactElement {
  throw new Error(message);
}

function ConditionalBoom({ throwError }: { throwError: boolean }) {
  if (throwError) throw new Error("kaboom");
  return <p>safe content</p>;
}

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    captureException.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <p>healthy</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("renders default fallback when child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("kaboom")).toBeInTheDocument();
  });

  it("captures the error via Sentry with component stack context", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(captureException).toHaveBeenCalledTimes(1);
    const [error, options] = captureException.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("kaboom");
    expect(options).toMatchObject({
      contexts: { react: { componentStack: expect.any(String) } }
    });
  });

  it("falls back to a generic message when error has no message", () => {
    function BoomEmpty(): ReactElement {
      throw new Error("");
    }
    render(
      <ErrorBoundary>
        <BoomEmpty />
      </ErrorBoundary>
    );
    expect(screen.getByText("Erro inesperado.")).toBeInTheDocument();
  });

  it("uses custom fallback render prop", () => {
    render(
      <ErrorBoundary fallback={(error, reset) => <button onClick={reset}>Custom {error.message}</button>}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole("button", { name: "Custom kaboom" })).toBeInTheDocument();
  });

  it("resets to render children again after fallback action", () => {
    function Harness() {
      return (
        <ErrorBoundary key="boundary">
          <ConditionalBoom throwError={false} />
        </ErrorBoundary>
      );
    }
    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalBoom throwError={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    rerender(<Harness />);
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });
});

describe("ViewBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    captureException.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error", () => {
    render(
      <ViewBoundary viewName="Avisos">
        <p>view content</p>
      </ViewBoundary>
    );
    expect(screen.getByText("view content")).toBeInTheDocument();
  });

  it("shows view name in fallback heading", () => {
    render(
      <ViewBoundary viewName="Avisos">
        <Boom />
      </ViewBoundary>
    );
    expect(screen.getByText("Falha ao carregar Avisos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("renders the back-to-dashboard button when handler provided", () => {
    const handler = vi.fn();
    render(
      <ViewBoundary viewName="Avisos" onBackToDashboard={handler}>
        <Boom />
      </ViewBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: "Voltar ao resumo" }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("falls back to a generic message when error has no message", () => {
    function BoomEmpty(): ReactElement {
      throw new Error("");
    }
    render(
      <ViewBoundary viewName="Avisos">
        <BoomEmpty />
      </ViewBoundary>
    );
    expect(screen.getByText("Erro inesperado.")).toBeInTheDocument();
  });

  it("omits back-to-dashboard button when no handler", () => {
    render(
      <ViewBoundary viewName="Avisos">
        <Boom />
      </ViewBoundary>
    );
    expect(screen.queryByRole("button", { name: "Voltar ao resumo" })).not.toBeInTheDocument();
  });
});
