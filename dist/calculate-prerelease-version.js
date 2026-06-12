"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseVersion = parseVersion;
exports.findLatestStable = findLatestStable;
exports.bumpVersion = bumpVersion;
exports.findNextPrereleaseNumber = findNextPrereleaseNumber;
exports.compareSemver = compareSemver;
exports.deriveBump = deriveBump;
exports.findMaxPrereleaseBase = findMaxPrereleaseBase;
exports.getBumpFromLabels = getBumpFromLabels;
exports.calculatePrereleaseVersion = calculatePrereleaseVersion;
const semver_1 = require("./semver");
const STABLE_TAG = /^v(\d+)\.(\d+)\.(\d+)$/;
const VALID_IDENTIFIER = /^[0-9A-Za-z-]+$/;
function parseVersion(version) {
    if (typeof version !== "string")
        return null;
    const match = (version.startsWith("v") ? version : `v${version}`).match(STABLE_TAG);
    if (!match)
        return null;
    return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}
function findLatestStable(tags) {
    const stable = tags
        .map((t) => {
        const parsed = parseVersion(t);
        return parsed ? { tag: t, ...parsed } : null;
    })
        .filter((x) => x !== null)
        .sort((a, b) => {
        if (a.major !== b.major)
            return b.major - a.major;
        if (a.minor !== b.minor)
            return b.minor - a.minor;
        return b.patch - a.patch;
    });
    if (stable.length === 0)
        return "0.0.0";
    const latest = stable[0];
    return `${latest.major}.${latest.minor}.${latest.patch}`;
}
function bumpVersion(version, bump) {
    const parsed = parseVersion(version);
    if (!parsed)
        throw new Error(`Cannot bump unparseable version: ${version}`);
    if (!(0, semver_1.isBump)(bump)) {
        throw new Error(`Invalid bump type '${bump}': expected one of ${semver_1.VALID_BUMPS.join(", ")}.`);
    }
    let { major, minor, patch } = parsed;
    if (bump === "major") {
        major++;
        minor = 0;
        patch = 0;
    }
    else if (bump === "minor") {
        minor++;
        patch = 0;
    }
    else {
        patch++;
    }
    return `${major}.${minor}.${patch}`;
}
function findNextPrereleaseNumber(tags, baseVersion, identifier) {
    const pattern = `v${baseVersion}-${identifier}.`;
    const matching = tags.filter((t) => t && t.startsWith(pattern));
    if (matching.length === 0)
        return 0;
    // identifier is validated against VALID_IDENTIFIER before reaching here.
    const re = new RegExp(`-${identifier}\\.(\\d+)$`);
    const numbers = matching.map((t) => {
        const m = t.match(re);
        return m ? parseInt(m[1], 10) : -1;
    });
    return Math.max(...numbers) + 1;
}
function compareSemver(a, b) {
    const A = parseVersion(a);
    const B = parseVersion(b);
    if (!A || !B)
        throw new Error(`Cannot compare unparseable versions: ${a}, ${b}`);
    if (A.major !== B.major)
        return A.major - B.major;
    if (A.minor !== B.minor)
        return A.minor - B.minor;
    return A.patch - B.patch;
}
/** The highest component that changed going from `from` to `to`. */
function deriveBump(from, to) {
    const a = parseVersion(from);
    const b = parseVersion(to);
    if (!a || !b)
        throw new Error(`Cannot derive bump between '${from}' and '${to}'`);
    if (b.major !== a.major)
        return "major";
    if (b.minor !== a.minor)
        return "minor";
    return "patch";
}
function findMaxPrereleaseBase(tags, identifier) {
    const re = new RegExp(`^v(\\d+\\.\\d+\\.\\d+)-${identifier}\\.\\d+$`);
    const bases = tags
        .map((t) => t && t.match(re))
        .filter((m) => Boolean(m))
        .map((m) => m[1]);
    if (bases.length === 0)
        return null;
    return bases.sort(compareSemver).at(-1) ?? null;
}
/**
 * Returns the raw bump string from the single semver:* label (or null when
 * absent) — NOT narrowed to Bump. The caller validates with isBump so an
 * unrecognised label (e.g. semver:huge) fails with the same
 * "Invalid bump type" error the .cjs action produced, not "No bump type".
 */
function getBumpFromLabels(labels) {
    const semverLabels = labels.filter((l) => l.startsWith(semver_1.SEMVER_LABEL_PREFIX));
    if (semverLabels.length > 1) {
        throw new Error(`Multiple semver:* labels found on the PR: ${semverLabels.join(", ")}. ` +
            "Remove all but one of these labels and re-run, or pass the `bump` input to override.");
    }
    if (semverLabels.length === 0)
        return null;
    return semverLabels[0].slice(semver_1.SEMVER_LABEL_PREFIX.length);
}
async function calculatePrereleaseVersion({ octokit, context, logger }, opts) {
    const identifier = opts.prereleaseIdentifier ?? "unstable";
    if (!VALID_IDENTIFIER.test(identifier)) {
        throw new Error(`Invalid prerelease-identifier '${identifier}': must match ${VALID_IDENTIFIER}.`);
    }
    const labels = context.payload.pull_request?.labels?.map((l) => l.name) ?? [];
    let bump;
    if (opts.bump) {
        if (!(0, semver_1.isBump)(opts.bump)) {
            throw new Error(`Invalid bump input '${opts.bump}': expected one of ${semver_1.VALID_BUMPS.join(", ")}.`);
        }
        bump = opts.bump;
    }
    else {
        const fromLabels = getBumpFromLabels(labels);
        if (!fromLabels) {
            throw new Error("No bump type could be determined: expected a 'semver:major', 'semver:minor', " +
                "or 'semver:patch' label on the PR, or an explicit 'bump' input.");
        }
        if (!(0, semver_1.isBump)(fromLabels)) {
            // Error parity with the .cjs action, where the raw label value reached
            // bumpVersion and failed there with this message.
            throw new Error(`Invalid bump type '${fromLabels}': expected one of ${semver_1.VALID_BUMPS.join(", ")}.`);
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
    let clamped;
    // Respect an in-flight prerelease that already cut a higher base: adopt it and
    // continue its sequence rather than starting a divergent lower line. A higher
    // computed base (e.g. a major bump) supersedes the in-flight line instead.
    const maxPrereleaseBase = findMaxPrereleaseBase(tags, identifier);
    if (maxPrereleaseBase && compareSemver(baseVersion, maxPrereleaseBase) < 0) {
        clamped = { from: computedBase, to: maxPrereleaseBase };
        baseVersion = maxPrereleaseBase;
        logger.warning(`Computed base ${computedBase} is lower than the in-flight prerelease base ${maxPrereleaseBase}; ` +
            `adopting ${maxPrereleaseBase} and continuing its prerelease sequence. ` +
            `If this is unexpected, check for a stray tag.`);
    }
    const effectiveBump = deriveBump(latestStable, baseVersion);
    const prereleaseNum = findNextPrereleaseNumber(tags, baseVersion, identifier);
    const version = `${baseVersion}-${identifier}.${prereleaseNum}`;
    logger.info(`Resolved v${version} (bump=${bump}, effective-bump=${effectiveBump})`);
    return { version, baseVersion, bump, effectiveBump, ...(clamped ? { clamped } : {}) };
}
//# sourceMappingURL=calculate-prerelease-version.js.map