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
exports.createContext = void 0;
const core = __importStar(require("@actions/core"));
/**
 * Create a context object containing everything each action needs to run.
 *
 * @param octokit The Octokit instance
 * @param githubContext The context object from the GitHub action
 * @returns Fully initialized context object
 */
function createContext(octokit, 
/*
 * A partial is used here to make mocking easier.
 * Additonal fields can be added as needed.
 */
githubContext) {
    return {
        octokit,
        context: {
            repo: githubContext.repo,
            sha: githubContext.sha,
        },
        logger: {
            debug: core.debug,
            info: core.info,
            warning: core.warning,
            error: core.error,
        },
    };
}
exports.createContext = createContext;
//# sourceMappingURL=context.js.map