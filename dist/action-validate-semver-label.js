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
// src/action-validate-semver-label.ts
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const context_1 = require("./context");
const validate_semver_label_1 = require("./validate-semver-label");
const githubToken = core.getInput("github-token");
const labelsOverride = core.getInput("labels-override") || undefined;
const octokit = github.getOctokit(githubToken);
(0, validate_semver_label_1.validateSemverLabel)((0, context_1.createContext)(octokit, github.context), { labelsOverride })
    .then((result) => {
    core.setOutput("bump", result.bump);
})
    .catch((e) => {
    core.setFailed(e);
});
//# sourceMappingURL=action-validate-semver-label.js.map