import * as github from "@actions/github";
import * as core from "@actions/core";
import { createContext } from "./context";
import { createPrerelease } from "./create-prerelease";

const githubToken = core.getInput("github-token");
const tag = core.getInput("release-version");
const octokit = github.getOctokit(githubToken);
createPrerelease(createContext(octokit, github.context), tag).catch((e) => {
  core.setFailed(e);
});
