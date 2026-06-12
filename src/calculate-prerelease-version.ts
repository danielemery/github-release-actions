// src/calculate-prerelease-version.ts
/**
 * Calculate a prerelease version from existing tags and a requested bump.
 *   PR merge -> v1.2.3-unstable.0 -> production release -> v1.2.3 (stable)
 */
import { ContextArgument } from "./context";
import { SEMVER_LABEL_PREFIX, VALID_BUMPS, Bump, isBump } from "./semver";

const STABLE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;
const VALID_IDENTIFIER = /^[0-9A-Za-z-]+$/;

interface SemverParts {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(version: unknown): SemverParts | null {
  if (typeof version !== "string") return null;
  const match = (version.startsWith("v") ? version : `v${version}`).match(STABLE_TAG);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function findLatestStable(tags: string[]): string {
  const stable = tags
    .map((t) => {
      const parsed = parseVersion(t);
      return parsed ? { tag: t, ...parsed } : null;
    })
    .filter((x): x is { tag: string } & SemverParts => x !== null)
    .sort((a, b) => {
      if (a.major !== b.major) return b.major - a.major;
      if (a.minor !== b.minor) return b.minor - a.minor;
      return b.patch - a.patch;
    });
  if (stable.length === 0) return "0.0.0";
  const latest = stable[0];
  return `${latest.major}.${latest.minor}.${latest.patch}`;
}

export function bumpVersion(version: string, bump: string): string {
  const parsed = parseVersion(version);
  if (!parsed) throw new Error(`Cannot bump unparseable version: ${version}`);
  if (!isBump(bump)) {
    throw new Error(`Invalid bump type '${bump}': expected one of ${VALID_BUMPS.join(", ")}.`);
  }
  let { major, minor, patch } = parsed;
  if (bump === "major") {
    major++;
    minor = 0;
    patch = 0;
  } else if (bump === "minor") {
    minor++;
    patch = 0;
  } else {
    patch++;
  }
  return `${major}.${minor}.${patch}`;
}

export function findNextPrereleaseNumber(tags: string[], baseVersion: string, identifier: string): number {
  const pattern = `v${baseVersion}-${identifier}.`;
  const matching = tags.filter((t) => t && t.startsWith(pattern));
  if (matching.length === 0) return 0;
  // identifier is validated against VALID_IDENTIFIER before reaching here.
  const re = new RegExp(`-${identifier}\\.(\\d+)$`);
  const numbers = matching.map((t) => {
    const m = t.match(re);
    return m ? parseInt(m[1], 10) : -1;
  });
  return Math.max(...numbers) + 1;
}

export function compareSemver(a: string, b: string): number {
  const A = parseVersion(a);
  const B = parseVersion(b);
  if (!A || !B) throw new Error(`Cannot compare unparseable versions: ${a}, ${b}`);
  if (A.major !== B.major) return A.major - B.major;
  if (A.minor !== B.minor) return A.minor - B.minor;
  return A.patch - B.patch;
}

/** The highest component that changed going from `from` to `to`. */
export function deriveBump(from: string, to: string): Bump {
  const a = parseVersion(from);
  const b = parseVersion(to);
  if (!a || !b) throw new Error(`Cannot derive bump between '${from}' and '${to}'`);
  if (b.major !== a.major) return "major";
  if (b.minor !== a.minor) return "minor";
  return "patch";
}

export function findMaxPrereleaseBase(tags: string[], identifier: string): string | null {
  const re = new RegExp(`^v(\\d+\\.\\d+\\.\\d+)-${identifier}\\.\\d+$`);
  const bases = tags
    .map((t) => t && t.match(re))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => m[1]);
  if (bases.length === 0) return null;
  return bases.sort(compareSemver).at(-1) ?? null;
}

/**
 * Returns the raw bump string from the single semver:* label (or null when
 * absent) — NOT narrowed to Bump. The caller validates with isBump so an
 * unrecognised label (e.g. semver:huge) fails with the same
 * "Invalid bump type" error the .cjs action produced, not "No bump type".
 */
export function getBumpFromLabels(labels: string[]): string | null {
  const semverLabels = labels.filter((l) => l.startsWith(SEMVER_LABEL_PREFIX));
  if (semverLabels.length > 1) {
    throw new Error(
      `Multiple semver:* labels found on the PR: ${semverLabels.join(", ")}. ` +
        "Remove all but one of these labels and re-run, or pass the `bump` input to override."
    );
  }
  if (semverLabels.length === 0) return null;
  return semverLabels[0].slice(SEMVER_LABEL_PREFIX.length);
}

export interface CalculateOptions {
  bump?: string;
  prereleaseIdentifier?: string;
}

export interface CalculateResult {
  version: string;
  baseVersion: string;
  bump: Bump;
  effectiveBump: Bump;
  clamped?: { from: string; to: string };
}

export async function calculatePrereleaseVersion(
  { octokit, context, logger }: ContextArgument,
  opts: CalculateOptions
): Promise<CalculateResult> {
  const identifier = opts.prereleaseIdentifier ?? "unstable";
  if (!VALID_IDENTIFIER.test(identifier)) {
    throw new Error(`Invalid prerelease-identifier '${identifier}': must match ${VALID_IDENTIFIER}.`);
  }

  const labels: string[] =
    context.payload.pull_request?.labels?.map((l: { name: string }) => l.name) ?? [];

  let bump: Bump;
  if (opts.bump) {
    if (!isBump(opts.bump)) {
      throw new Error(`Invalid bump input '${opts.bump}': expected one of ${VALID_BUMPS.join(", ")}.`);
    }
    bump = opts.bump;
  } else {
    const fromLabels = getBumpFromLabels(labels);
    if (!fromLabels) {
      throw new Error(
        "No bump type could be determined: expected a 'semver:major', 'semver:minor', " +
          "or 'semver:patch' label on the PR, or an explicit 'bump' input."
      );
    }
    if (!isBump(fromLabels)) {
      // Error parity with the .cjs action, where the raw label value reached
      // bumpVersion and failed there with this message.
      throw new Error(
        `Invalid bump type '${fromLabels}': expected one of ${VALID_BUMPS.join(", ")}.`
      );
    }
    bump = fromLabels;
  }

  const tagObjects = await octokit.paginate(octokit.rest.repos.listTags, {
    owner: context.repo.owner,
    repo: context.repo.repo,
    per_page: 100,
  });
  const tags = tagObjects.map((t) => t.name);
  logger.info(`Found ${tags.length} tags`);

  const latestStable = findLatestStable(tags);
  const computedBase = bumpVersion(latestStable, bump);
  let baseVersion = computedBase;
  let clamped: { from: string; to: string } | undefined;

  // Respect an in-flight prerelease that already cut a higher base: adopt it and
  // continue its sequence rather than starting a divergent lower line. A higher
  // computed base (e.g. a major bump) supersedes the in-flight line instead.
  const maxPrereleaseBase = findMaxPrereleaseBase(tags, identifier);
  if (maxPrereleaseBase && compareSemver(baseVersion, maxPrereleaseBase) < 0) {
    clamped = { from: computedBase, to: maxPrereleaseBase };
    baseVersion = maxPrereleaseBase;
    logger.warning(
      `Computed base ${computedBase} is lower than the in-flight prerelease base ${maxPrereleaseBase}; ` +
        `adopting ${maxPrereleaseBase} and continuing its prerelease sequence. ` +
        `If this is unexpected, check for a stray tag.`
    );
  }

  const effectiveBump = deriveBump(latestStable, baseVersion);
  const prereleaseNum = findNextPrereleaseNumber(tags, baseVersion, identifier);
  const version = `${baseVersion}-${identifier}.${prereleaseNum}`;
  logger.info(`Resolved v${version} (bump=${bump}, effective-bump=${effectiveBump})`);

  return { version, baseVersion, bump, effectiveBump, ...(clamped ? { clamped } : {}) };
}
