import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Skeleton, SkeletonRows } from "./Skeleton";

describe("Skeleton", () => {
  afterEach(() => cleanup());

  it("renders with given dimensions", () => {
    render(<Skeleton width={120} height={20} />);
    const node = screen.getByTestId("skeleton");
    expect(node).toBeInTheDocument();
    expect(node.style.width).toBe("120px");
    expect(node.style.height).toBe("20px");
  });

  it("accepts string dimensions and radius", () => {
    render(<Skeleton width="50%" height="2rem" radius={12} />);
    const node = screen.getByTestId("skeleton");
    expect(node.style.width).toBe("50%");
    expect(node.style.height).toBe("2rem");
    expect(node.style.borderRadius).toBe("12px");
  });
});

describe("SkeletonRows", () => {
  afterEach(() => cleanup());

  it("renders the requested number of rows", () => {
    render(<SkeletonRows count={4} />);
    const wrapper = screen.getByTestId("skeleton-rows");
    expect(wrapper.querySelectorAll(".skeleton")).toHaveLength(4);
  });

  it("defaults to three rows", () => {
    render(<SkeletonRows />);
    const wrapper = screen.getByTestId("skeleton-rows");
    expect(wrapper.querySelectorAll(".skeleton")).toHaveLength(3);
  });
});
