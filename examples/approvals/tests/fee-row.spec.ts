import { describe, it, expect } from "vitest";
import { render } from "./helpers/render";

describe("the fee row", () => {
  it("the fee row has no collapsed state at any viewport", () => {
    for (const w of [375, 768, 1440]) {
      const el = render("fee-row", { width: w });
      expect(el.querySelector("[hidden]")).toBeNull();
    }
  });
  it("an empty queue reads as empty and not as loading", () => {
    const el = render("queue", { rows: [] });
    expect(el.textContent).toContain("Nothing is waiting");
    expect(el.querySelector("[aria-busy=true]")).toBeNull();
  });
});
