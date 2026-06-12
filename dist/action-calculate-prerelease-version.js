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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// src/action-calculate-prerelease-version.ts
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const context_1 = require("./context");
const calculate_prerelease_version_1 = require("./calculate-prerelease-version");
const githubToken = core.getInput("github-token");
const bump = core.getInput("bump") || undefined;
const prereleaseIdentifier = core.getInput("prerelease-identifier") || undefined;
const octokit = github.getOctokit(githubToken);
(0, calculate_prerelease_version_1.calculatePrereleaseVersion)((0, context_1.createContext)(octokit, github.context), { bump, prereleaseIdentifier })
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
//# sourceMappingURL=action-calculate-prerelease-version.js.map