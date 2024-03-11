"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = void 0;
const core_1 = __importDefault(require("@actions/core"));
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
            debug: core_1.default.debug,
            info: core_1.default.info,
            warning: core_1.default.warning,
            error: core_1.default.error,
        },
    };
}
exports.createContext = createContext;
//# sourceMappingURL=context.js.map