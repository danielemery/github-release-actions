// src/calculate-prerelease-version.test.ts
import { describe, it, expect } from "vitest";
import { ContextArgument } from "./context";
import {
  parseVersion,
  findLatestStable,
  bumpVersion,
  findNextPrereleaseNumber,
  compareSemver,
  deriveBump,
  findMaxPrereleaseBase,
  getBumpFromLabels,
  calculatePrereleaseVersion,
} from "./calculate-prerelease-version";

function fakeContext({ tags = [], labels = [] }: { tags?: string[]; labels?: string[] }) {
  const warnings: string[] = [];
  const ctx = {
    octokit: {
      rest: { repos: { listTags: () => undefined } },
      paginate: async () => tags.map((name) => ({ name })),
    },
    context: {
      repo: { owner: "o", repo: "r" },
      sha: "sha",
      payload: { pull_request: { labels: labels.map((name) => ({ name })) } },
    },
    logger: {
      debug: () => {},
      info: () => {},
      warning: (m: string) => warnings.push(m),
      error: () => {},
    },
  } as unknown as ContextArgument;
  return { ctx, warnings };
}

describe("parseVersion", () => {
  it("parses with/without v prefix; null on malformed", () => {
    expect(parseVersion("v1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    for (const v of ["voodoo", "v1.2", "v1.2.3-unstable.0", "", null, undefined]) {
      expect(parseVersion(v)).toBe(null);
    }
  });
});

describe("findLatestStable", () => {
  it("defaults to 0.0.0; ignores unstable + non-version tags; sorts numerically", () => {
    expect(findLatestStable([])).toBe("0.0.0");
    expect(findLatestStable(["v1.0.0-unstable.0"])).toBe("0.0.0");
    expect(findLatestStable(["v1.0.0", "v1.1.0-unstable.0", "latest"])).toBe("1.0.0");
    expect(findLatestStable(["v1.0.0", "v2.0.0", "v1.10.0"])).toBe("2.0.0");
  });
});

describe("bumpVersion", () => {
  it("bumps each level; throws on bad input", () => {
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
    expect(bumpVersion("1.2.3", "minor")).toBe("1.3.0");
    expect(bumpVersion("1.2.3", "major")).toBe("2.0.0");
    expect(() => bumpVersion("1.2.3", "nope")).toThrow(/Invalid bump type/);
    expect(() => bumpVersion("voodoo", "patch")).toThrow(/Cannot bump unparseable/);
  });
});

describe("findNextPrereleaseNumber", () => {
  it("respects base + identifier", () => {
    const tags = ["v1.0.0-unstable.0", "v1.0.0-unstable.1", "v1.1.0-unstable.0", "v1.0.0-beta.0"];
    expect(findNextPrereleaseNumber(tags, "1.0.0", "unstable")).toBe(2);
    expect(findNextPrereleaseNumber(tags, "1.1.0", "unstable")).toBe(1);
    expect(findNextPrereleaseNumber(tags, "1.0.0", "beta")).toBe(1);
    expect(findNextPrereleaseNumber(tags, "2.0.0", "unstable")).toBe(0);
  });
});

describe("compareSemver", () => {
  it("orders by major, minor, patch", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
    expect(compareSemver("1.3.0", "1.2.99")).toBeGreaterThan(0);
    expect(compareSemver("1.2.3", "2.0.0")).toBeLessThan(0);
  });
});

describe("deriveBump", () => {
  it("returns the highest changed component; throws on bad input", () => {
    expect(deriveBump("1.2.3", "1.2.4")).toBe("patch");
    expect(deriveBump("1.2.3", "1.3.0")).toBe("minor");
    expect(deriveBump("1.2.3", "2.5.7")).toBe("major");
    expect(() => deriveBump("voodoo", "1.0.0")).toThrow(/Cannot derive bump/);
  });
});

describe("findMaxPrereleaseBase", () => {
  it("returns highest base for the identifier, ignoring others", () => {
    const tags = ["v1.2.4-unstable.0", "v1.3.0-unstable.7", "v2.0.0-unstable.3", "v2.5.0-beta.0"];
    expect(findMaxPrereleaseBase(tags, "unstable")).toBe("2.0.0");
    expect(findMaxPrereleaseBase(tags, "beta")).toBe("2.5.0");
    expect(findMaxPrereleaseBase(["v1.2.3"], "unstable")).toBe(null);
  });
});

describe("getBumpFromLabels", () => {
  it("extracts the single semver bump (raw, unvalidated) or null; throws on multiple", () => {
    expect(getBumpFromLabels(["semver:minor", "bug"])).toBe("minor");
    expect(getBumpFromLabels(["bug"])).toBe(null);
    expect(getBumpFromLabels(["semver:huge"])).toBe("huge");
    expect(() => getBumpFromLabels(["semver:major", "semver:patch"])).toThrow(/Multiple semver/);
  });
});

describe("calculatePrereleaseVersion (action fn)", () => {
  it("first prerelease from empty repo", async () => {
    const { ctx } = fakeContext({ tags: [], labels: ["semver:patch"] });
    expect(await calculatePrereleaseVersion(ctx, {})).toEqual({
      version: "0.0.1-unstable.0",
      baseVersion: "0.0.1",
      bump: "patch",
      effectiveBump: "patch",
    });
  });

  it("increments the counter for the same base", async () => {
    const { ctx } = fakeContext({
      tags: ["v1.2.3", "v1.2.4-unstable.0", "v1.2.4-unstable.1"],
      labels: ["semver:patch"],
    });
    expect(await calculatePrereleaseVersion(ctx, {})).toEqual({
      version: "1.2.4-unstable.2",
      baseVersion: "1.2.4",
      bump: "patch",
      effectiveBump: "patch",
    });
  });

  it("handles minor and major bumps", async () => {
    const minor = fakeContext({ tags: ["v1.2.3"], labels: ["semver:minor"] });
    expect(await calculatePrereleaseVersion(minor.ctx, {})).toEqual({
      version: "1.3.0-unstable.0",
      baseVersion: "1.3.0",
      bump: "minor",
      effectiveBump: "minor",
    });
    const major = fakeContext({ tags: ["v1.2.3"], labels: ["semver:major"] });
    expect(await calculatePrereleaseVersion(major.ctx, {})).toEqual({
      version: "2.0.0-unstable.0",
      baseVersion: "2.0.0",
      bump: "major",
      effectiveBump: "major",
    });
  });

  it("uses the bump override (ignoring labels) and a custom identifier", async () => {
    const o = fakeContext({ tags: ["v1.2.3"], labels: ["semver:patch"] });
    expect(await calculatePrereleaseVersion(o.ctx, { bump: "major" })).toEqual({
      version: "2.0.0-unstable.0",
      baseVersion: "2.0.0",
      bump: "major",
      effectiveBump: "major",
    });
    const b = fakeContext({ tags: ["v1.2.3"], labels: ["semver:patch"] });
    expect(await calculatePrereleaseVersion(b.ctx, { prereleaseIdentifier: "beta" })).toEqual({
      version: "1.2.4-beta.0",
      baseVersion: "1.2.4",
      bump: "patch",
      effectiveBump: "patch",
    });
  });

  it("throws when no bump can be determined or input is invalid", async () => {
    const none = fakeContext({ tags: ["v1.2.3"], labels: [] });
    await expect(calculatePrereleaseVersion(none.ctx, {})).rejects.toThrow(/No bump type/);
    const badId = fakeContext({ tags: [], labels: ["semver:patch"] });
    await expect(
      calculatePrereleaseVersion(badId.ctx, { prereleaseIdentifier: "bad.id" })
    ).rejects.toThrow(/Invalid prerelease-identifier/);
    const badBump = fakeContext({ tags: ["v1.2.3"], labels: [] });
    await expect(calculatePrereleaseVersion(badBump.ctx, { bump: "patchy" })).rejects.toThrow(
      /Invalid bump input/
    );
    const badLabel = fakeContext({ tags: ["v1.2.3"], labels: ["semver:huge"] });
    await expect(calculatePrereleaseVersion(badLabel.ctx, {})).rejects.toThrow(
      /Invalid bump type 'huge'/
    );
  });

  it("clamps a patch PR up to an in-flight minor base (and warns)", async () => {
    const { ctx, warnings } = fakeContext({
      tags: ["v1.2.3", "v1.3.0-unstable.0"],
      labels: ["semver:patch"],
    });
    expect(await calculatePrereleaseVersion(ctx, {})).toEqual({
      version: "1.3.0-unstable.1",
      baseVersion: "1.3.0",
      bump: "patch",
      effectiveBump: "minor",
      clamped: { from: "1.2.4", to: "1.3.0" },
    });
    expect(warnings).toHaveLength(1);
  });

  it("clamps up to an in-flight major base", async () => {
    const { ctx } = fakeContext({ tags: ["v1.2.3", "v2.0.0-unstable.3"], labels: ["semver:patch"] });
    expect(await calculatePrereleaseVersion(ctx, {})).toEqual({
      version: "2.0.0-unstable.4",
      baseVersion: "2.0.0",
      bump: "patch",
      effectiveBump: "major",
      clamped: { from: "1.2.4", to: "2.0.0" },
    });
  });

  it("does not clamp when the bump meets or exceeds the in-flight base", async () => {
    const meet = fakeContext({ tags: ["v1.2.3", "v1.3.0-unstable.0"], labels: ["semver:minor"] });
    const meetResult = await calculatePrereleaseVersion(meet.ctx, {});
    expect(meetResult.version).toBe("1.3.0-unstable.1");
    expect(meetResult.clamped).toBeUndefined();
    expect(meet.warnings).toHaveLength(0);

    const exceed = fakeContext({ tags: ["v1.2.3", "v1.3.0-unstable.0"], labels: ["semver:major"] });
    const exceedResult = await calculatePrereleaseVersion(exceed.ctx, {});
    expect(exceedResult.version).toBe("2.0.0-unstable.0");
    expect(exceedResult.clamped).toBeUndefined();
  });

  it("ignores prerelease tags of other identifiers as in-flight", async () => {
    const { ctx } = fakeContext({ tags: ["v1.2.3", "v2.0.0-beta.0"], labels: ["semver:patch"] });
    const result = await calculatePrereleaseVersion(ctx, {});
    expect(result.version).toBe("1.2.4-unstable.0");
    expect(result.clamped).toBeUndefined();
  });
});
