import { describe, expect, it } from "vitest";
import { hello } from "./index";

describe("chartmint", () => {
  it("says hello", () => {
    expect(hello()).toBe("Hello, world!");
  });
});
