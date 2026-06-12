// src/action-calculate-prerelease-version.ts
import * as github from "@actions/github";
import * as core from "@actions/core";
import { createContext } from "./context";
import { calculatePrereleaseVersion } from "./calculate-prerelease-version";

const githubToken = core.getInput("github-token");
const bump = core.getInput("bump") || undefined;
const prereleaseIdentifier = core.getInput("prerelease-identifier") || undefined;
const octokit = github.getOctokit(githubToken);

calculatePrereleaseVersion(createContext(octokit, github.context), { bump, prereleaseIdentifier })
  .then((result) => {
    core.setOutput("version", result.version);
    core.setOutput("tag", `v${result.version}`);
    core.setOutput("base-version", result.baseVersion);
    core.setOutput("base-tag", `v${result.baseVersion}`);
    core.setOutput("bump", result.bump);
    core.setOutput("effective-bump", result.effectiveBump);
  })
  .catch((e) => {
    core.setFailed(e);
  });
