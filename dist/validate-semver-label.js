"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertSemverLabel = assertSemverLabel;
exports.validateSemverLabel = validateSemverLabel;
const semver_1 = require("./semver");
/** Pure rule: exactly one recognised `semver:*` label. */
function assertSemverLabel(labels) {
    const semverLabels = labels.filter((l) => l.startsWith(semver_1.SEMVER_LABEL_PREFIX));
    if (semverLabels.length === 0) {
        throw new Error("PR must have exactly one semver:* label: expected one of 'semver:major', " +
            "'semver:minor', or 'semver:patch'.");
    }
    if (semverLabels.length > 1) {
        throw new Error(`PR has multiple semver:* labels: ${semverLabels.join(", ")}. Remove all but one and re-run.`);
    }
    const bump = semverLabels[0].slice(semver_1.SEMVER_LABEL_PREFIX.length);
    if (!(0, semver_1.isBump)(bump)) {
        throw new Error(`Unrecognised semver label '${semverLabels[0]}': expected one of ` +
            semver_1.VALID_BUMPS.map((b) => `semver:${b}`).join(", ") + ".");
    }
    return bump;
}
async function validateSemverLabel({ context, logger }, opts) {
    const override = opts.labelsOverride ?? "";
    const overrideLabels = override
        ? override.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
        : null;
    const labels = overrideLabels ??
        context.payload.pull_request?.labels?.map((l) => l.name) ??
        [];
    const bump = assertSemverLabel(labels);
    logger.info(`Valid semver label: semver:${bump}`);
    return { bump };
}
//# sourceMappingURL=validate-semver-label.js.map