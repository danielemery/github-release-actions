// src/semver.ts
export const SEMVER_LABEL_PREFIX = "semver:";

export const VALID_BUMPS = ["major", "minor", "patch"] as const;

export type Bump = (typeof VALID_BUMPS)[number];

/** Type guard narrowing an arbitrary string to a valid bump. */
export function isBump(value: string): value is Bump {
  return (VALID_BUMPS as readonly string[]).includes(value);
}
