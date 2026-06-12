// src/perform-prerelease.test.ts
import { describe, it, expect } from "vitest";
import { ContextArgument } from "./context";
import { deriveStableTag, performPreRelease } from "./perform-prerelease";

interface FakeRelease {
  tag_name: string;
  id: number;
  draft?: boolean;
  prerelease?: boolean;
  html_url?: string;
}

interface FakeTag {
  sha: string;
  type: "commit" | "tag";
  /** For annotated tags: the commit the tag object points at. */
  dereferenced?: string;
}

function fakeContext({
  releases = [],
  tags = {},
  latestTag = "v1.0.0",
}: {
  releases?: FakeRelease[];
  tags?: Record<string, FakeTag>;
  latestTag?: string;
}) {
  const created: Record<string, unknown>[] = [];
  const notesRequests: Record<string, unknown>[] = [];
  const ctx = {
    octokit: {
      paginate: {
        iterator: () =>
          (async function* () {
            yield { data: releases };
          })(),
      },
      rest: {
        repos: {
          listReleases: () => undefined,
          getReleaseByTag: async ({ tag }: { tag: string }) => {
            const release = releases.find(
              (r) => r.tag_name === tag && !r.draft
            );
            if (!release) throw { status: 404 };
            return { data: release };
          },
          getLatestRelease: async () => ({ data: { tag_name: latestTag } }),
          generateReleaseNotes: async (args: Record<string, unknown>) => {
            notesRequests.push(args);
            return { data: { body: "notes" } };
          },
          createRelease: async (args: Record<string, unknown>) => {
            created.push(args);
            return { data: { id: 42, html_url: "http://release/42" } };
          },
        },
        git: {
          getRef: async ({ ref }: { ref: string }) => {
            const tag = tags[ref.replace(/^tags\//, "")];
            if (!tag) throw { status: 404 };
            return { data: { object: { sha: tag.sha, type: tag.type } } };
          },
          getTag: async ({ tag_sha }: { tag_sha: string }) => {
            const tag = Object.values(tags).find((t) => t.sha === tag_sha);
            if (!tag?.dereferenced) throw { status: 404 };
            return {
              data: { object: { sha: tag.dereferenced, type: "commit" } },
            };
          },
        },
      },
    },
    context: { repo: { owner: "o", repo: "r" }, sha: "sha", payload: {} },
    logger: {
      debug: () => {},
      info: () => {},
      warning: () => {},
      error: () => {},
    },
  } as unknown as ContextArgument;
  return { ctx, created, notesRequests };
}

describe("deriveStableTag", () => {
  it("strips the prerelease suffix from semver prerelease tags", () => {
    expect(deriveStableTag("v1.2.3-rc.2")).toBe("v1.2.3");
    expect(deriveStableTag("v0.5.0-unstable.0")).toBe("v0.5.0");
    expect(deriveStableTag("v10.20.30-my-id.99")).toBe("v10.20.30");
  });
  it("returns null for anything else", () => {
    for (const tag of ["v1.2.3", "1.2.3-rc.2", "2026-06-12_15_30", "v1.2-rc.0", "v1.2.3-rc", ""]) {
      expect(deriveStableTag(tag)).toBe(null);
    }
  });
});

describe("performPreRelease", () => {
  it("throws when no release exists for the tag", async () => {
    const { ctx } = fakeContext({});
    await expect(performPreRelease(ctx, "v1.1.0")).rejects.toThrow(
      /No release found/
    );
  });

  it("creates a draft on the same tag without promote-to-stable", async () => {
    const { ctx, created } = fakeContext({
      releases: [{ tag_name: "2026-06-12", id: 1, prerelease: true }],
    });
    const result = await performPreRelease(ctx, "2026-06-12");
    expect(result).toEqual({
      releaseId: 42,
      isExistingRelease: false,
      releaseUrl: "http://release/42",
      releaseTag: "2026-06-12",
    });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ tag_name: "2026-06-12", draft: true });
    expect(created[0]).not.toHaveProperty("target_commitish");
  });

  it("creates a draft on the stable tag anchored to the prerelease commit", async () => {
    const { ctx, created, notesRequests } = fakeContext({
      releases: [{ tag_name: "v1.1.0-rc.2", id: 1, prerelease: true }],
      tags: { "v1.1.0-rc.2": { sha: "abc123", type: "commit" } },
    });
    const result = await performPreRelease(ctx, "v1.1.0-rc.2", true);
    expect(result.isExistingRelease).toBe(false);
    expect(result.releaseTag).toBe("v1.1.0");
    expect(created[0]).toMatchObject({
      tag_name: "v1.1.0",
      name: "v1.1.0",
      draft: true,
      target_commitish: "abc123",
    });
    expect(notesRequests[0]).toMatchObject({
      tag_name: "v1.1.0",
      target_commitish: "abc123",
    });
  });

  it("dereferences annotated prerelease tags to the underlying commit", async () => {
    const { ctx, created } = fakeContext({
      releases: [{ tag_name: "v1.1.0-rc.0", id: 1, prerelease: true }],
      tags: {
        "v1.1.0-rc.0": { sha: "tagobj", type: "tag", dereferenced: "abc123" },
      },
    });
    await performPreRelease(ctx, "v1.1.0-rc.0", true);
    expect(created[0]).toMatchObject({ target_commitish: "abc123" });
  });

  it("tolerates an existing stable tag on the same commit", async () => {
    const { ctx, created } = fakeContext({
      releases: [{ tag_name: "v1.1.0-rc.2", id: 1, prerelease: true }],
      tags: {
        "v1.1.0-rc.2": { sha: "abc123", type: "commit" },
        "v1.1.0": { sha: "abc123", type: "commit" },
      },
    });
    await performPreRelease(ctx, "v1.1.0-rc.2", true);
    expect(created).toHaveLength(1);
  });

  it("refuses an existing stable tag on a different commit", async () => {
    const { ctx } = fakeContext({
      releases: [{ tag_name: "v1.1.0-rc.2", id: 1, prerelease: true }],
      tags: {
        "v1.1.0-rc.2": { sha: "abc123", type: "commit" },
        "v1.1.0": { sha: "fff999", type: "commit" },
      },
    });
    await expect(
      performPreRelease(ctx, "v1.1.0-rc.2", true)
    ).rejects.toThrow(/already exists and points at fff999/);
  });

  it("refuses promote-to-stable when the target is not a prerelease tag", async () => {
    const { ctx } = fakeContext({
      releases: [{ tag_name: "v1.0.0", id: 1, prerelease: false }],
      tags: { "v1.0.0": { sha: "abc123", type: "commit" } },
    });
    await expect(performPreRelease(ctx, "v1.0.0", true)).rejects.toThrow(
      /Cannot promote 'v1.0.0' to stable/
    );
  });

  it("refuses promote-to-stable when the target release is already full", async () => {
    const { ctx } = fakeContext({
      releases: [{ tag_name: "v1.1.0-rc.2", id: 1, prerelease: false }],
      tags: { "v1.1.0-rc.2": { sha: "abc123", type: "commit" } },
    });
    await expect(performPreRelease(ctx, "v1.1.0-rc.2", true)).rejects.toThrow(
      /already a full release/
    );
  });

  it("takes the rollback path for a full release without stable-tag-name", async () => {
    const { ctx, created } = fakeContext({
      releases: [
        { tag_name: "v1.0.0", id: 7, prerelease: false, html_url: "http://release/7" },
      ],
    });
    const result = await performPreRelease(ctx, "v1.0.0");
    expect(result).toEqual({
      releaseId: 7,
      isExistingRelease: true,
      releaseUrl: "http://release/7",
      releaseTag: "v1.0.0",
    });
    expect(created).toHaveLength(0);
  });
});
