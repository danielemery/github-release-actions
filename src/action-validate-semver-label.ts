// src/action-validate-semver-label.ts
import * as github from "@actions/github";
import * as core from "@actions/core";
import { createContext } from "./context";
import { validateSemverLabel } from "./validate-semver-label";

const githubToken = core.getInput("github-token");
const labelsOverride = core.getInput("labels-override") || undefined;
const octokit = github.getOctokit(githubToken);

validateSemverLabel(createContext(octokit, github.context), { labelsOverride })
  .then((result) => {
    core.setOutput("bump", result.bump);
  })
  .catch((e) => {
    core.setFailed(e);
  });
