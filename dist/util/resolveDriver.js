"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSqliteDriver = void 0;
const node_module_1 = require("node:module");
const node_path_1 = __importDefault(require("node:path"));
const PACKAGE_NAMES = {
    sqlite: "sqlite3",
    "better-sqlite3": "better-sqlite3",
};
function tryRequirePackage(fromDir, packageName) {
    try {
        const req = (0, node_module_1.createRequire)(node_path_1.default.join(fromDir, "package.json"));
        return req(packageName);
    }
    catch {
        return undefined;
    }
}
/**
 * Resolves optional SQLite driver packages from the consumer's project.
 * TypeORM resolves drivers from its own install path, which breaks under pnpm.
 */
function resolveSqliteDriver(type) {
    const packageName = PACKAGE_NAMES[type];
    let dir = process.cwd();
    for (let depth = 0; depth < 15; depth++) {
        const driver = tryRequirePackage(dir, packageName);
        if (driver !== undefined)
            return driver;
        const parent = node_path_1.default.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    const localDriver = tryRequirePackage(node_path_1.default.resolve(__dirname, "../.."), packageName);
    if (localDriver !== undefined)
        return localDriver;
    throw new Error([
        `ForgeDB could not load "${packageName}".`,
        `Install it in your project (for example: pnpm add ${packageName}).`,
        `With pnpm v10+, allow native builds in package.json:`,
        `"pnpm": { "onlyBuiltDependencies": ["${packageName}"] }`,
    ].join(" "));
}
exports.resolveSqliteDriver = resolveSqliteDriver;
//# sourceMappingURL=resolveDriver.js.map