import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Form } from "./Form";

describe("Form", () => {
  afterEach(() => cleanup());

  it("renders children when no groups passed", () => {
    render(
      <Form onSubmit={vi.fn()}>
        <input aria-label="campo" />
      </Form>
    );
    expect(screen.getByLabelText("campo")).toBeInTheDocument();
  });

  it("renders FieldGroup when groups passed", () => {
    render(
      <Form
        onSubmit={vi.fn()}
        groups={[
          { id: "g1", label: "Geral", content: <p>conteudo um</p> },
          { id: "g2", label: "Outro", content: <p>conteudo dois</p> }
        ]}
      />
    );
    expect(screen.getByText("conteudo um")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Outro" })).toBeInTheDocument();
  });

  it("calls onSubmit when form submits", () => {
    const handler = vi.fn((event) => event.preventDefault());
    render(
      <Form onSubmit={handler}>
        <button type="submit">enviar</button>
      </Form>
    );
    fireEvent.click(screen.getByText("enviar"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("renders the action bar slot", () => {
    render(
      <Form onSubmit={vi.fn()} actionBar={<div>barra-acoes</div>}>
        <p>x</p>
      </Form>
    );
    expect(screen.getByText("barra-acoes")).toBeInTheDocument();
  });
});
