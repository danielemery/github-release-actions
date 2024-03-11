"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const context_1 = require("./context");
const perform_prerelease_1 = require("./perform-prerelease");
const githubToken = core.getInput("github-token");
const targetTagName = core.getInput("release-version");
const octokit = github.getOctokit(githubToken);
(0, perform_prerelease_1.performPreRelease)((0, context_1.createContext)(octokit, github.context), targetTagName)
    .then((result) => {
    core.setOutput("release-id", result.releaseId);
    core.setOutput("is-existing-release", result.isExistingRelease);
})
    .catch((e) => {
    core.setFailed(e);
});
//# sourceMappingURL=action-perform-prerelease.js.map