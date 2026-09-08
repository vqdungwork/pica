import { describe, it, expect } from "vitest";
import { approve } from "../src/approve";

/* BR-01 A payment above the limit needs a second approver. Asserted on the server
 * path, because a rule enforced by hiding a button is not enforced. */
describe("BR-01 a payment above the limit needs a second approver", () => {
  it("BR-01 refuses a single approval above the limit", async () => {
    await expect(approve("p-above-limit", "actor-1")).rejects.toThrow(/second approver/);
  });
  it("BR-01 accepts the release once a second approver has signed", async () => {
    await expect(approve("p-above-limit", "actor-2")).resolves.toMatchObject({ status: "released" });
  });
});
