// src/validate-semver-label.test.ts
import { describe, it, expect } from "vitest";
import { ContextArgument } from "./context";
import { assertSemverLabel, validateSemverLabel } from "./validate-semver-label";

function fakeContext({ labels = [] }: { labels?: string[] }) {
  return {
    octokit: {} as unknown,
    context: {
      repo: { owner: "o", repo: "r" },
      sha: "sha",
      payload: { pull_request: { labels: labels.map((name) => ({ name })) } },
    },
    logger: { debug: () => {}, info: () => {}, warning: () => {}, error: () => {} },
  } as unknown as ContextArgument;
}

describe("assertSemverLabel", () => {
  it("returns the bump for exactly one semver label", () => {
    expect(assertSemverLabel(["semver:major", "bug"])).toBe("major");
    expect(assertSemverLabel(["semver:minor"])).toBe("minor");
    expect(assertSemverLabel(["semver:patch"])).toBe("patch");
  });
  it("throws when none, multiple, or unrecognised", () => {
    expect(() => assertSemverLabel(["bug"])).toThrow(/must have exactly one/);
    expect(() => assertSemverLabel([])).toThrow(/must have exactly one/);
    expect(() => assertSemverLabel(["semver:major", "semver:patch"])).toThrow(/multiple semver/i);
    expect(() => assertSemverLabel(["semver:huge"])).toThrow(/Unrecognised semver label/);
  });
});

describe("validateSemverLabel (action fn)", () => {
  it("reads labels from the PR payload", async () => {
    expect(await validateSemverLabel(fakeContext({ labels: ["semver:minor"] }), {})).toEqual({
      bump: "minor",
    });
  });
  it("labels-override takes precedence over payload", async () => {
    const ctx = fakeContext({ labels: ["semver:major"] });
    expect(await validateSemverLabel(ctx, { labelsOverride: "bug, semver:patch" })).toEqual({
      bump: "patch",
    });
  });
  it("rejects when the payload has no valid label", async () => {
    await expect(validateSemverLabel(fakeContext({ labels: [] }), {})).rejects.toThrow(
      /must have exactly one/
    );
  });
});
