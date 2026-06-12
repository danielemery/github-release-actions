// src/validate-semver-label.ts
import { ContextArgument } from "./context";
import { SEMVER_LABEL_PREFIX, VALID_BUMPS, Bump, isBump } from "./semver";

/** Pure rule: exactly one recognised `semver:*` label. */
export function assertSemverLabel(labels: string[]): Bump {
  const semverLabels = labels.filter((l) => l.startsWith(SEMVER_LABEL_PREFIX));
  if (semverLabels.length === 0) {
    throw new Error(
      "PR must have exactly one semver:* label: expected one of 'semver:major', " +
        "'semver:minor', or 'semver:patch'."
    );
  }
  if (semverLabels.length > 1) {
    throw new Error(
      `PR has multiple semver:* labels: ${semverLabels.join(", ")}. Remove all but one and re-run.`
    );
  }
  const bump = semverLabels[0].slice(SEMVER_LABEL_PREFIX.length);
  if (!isBump(bump)) {
    throw new Error(
      `Unrecognised semver label '${semverLabels[0]}': expected one of ` +
        VALID_BUMPS.map((b) => `semver:${b}`).join(", ") + "."
    );
  }
  return bump;
}

export interface ValidateOptions {
  labelsOverride?: string;
}

export async function validateSemverLabel(
  { context, logger }: ContextArgument,
  opts: ValidateOptions
): Promise<{ bump: Bump }> {
  const override = opts.labelsOverride ?? "";
  const overrideLabels = override
    ? override.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
    : null;

  const labels: string[] =
    overrideLabels ??
    context.payload.pull_request?.labels?.map((l: { name: string }) => l.name) ??
    [];

  const bump = assertSemverLabel(labels);
  logger.info(`Valid semver label: semver:${bump}`);
  return { bump };
}
