import { createRequire } from "node:module"
import path from "node:path"

export type SqliteDriverType = "sqlite" | "better-sqlite3"

const PACKAGE_NAMES: Record<SqliteDriverType, string> = {
    sqlite: "sqlite3",
    "better-sqlite3": "better-sqlite3",
}

function tryRequirePackage(fromDir: string, packageName: string): unknown | undefined {
    try {
        const req = createRequire(path.join(fromDir, "package.json"))
        return req(packageName)
    } catch {
        return undefined
    }
}

/**
 * Resolves optional SQLite driver packages from the consumer's project.
 * TypeORM resolves drivers from its own install path, which breaks under pnpm.
 */
export function resolveSqliteDriver(type: SqliteDriverType): unknown {
    const packageName = PACKAGE_NAMES[type]

    let dir = process.cwd()
    for (let depth = 0; depth < 15; depth++) {
        const driver = tryRequirePackage(dir, packageName)
        if (driver !== undefined) return driver

        const parent = path.dirname(dir)
        if (parent === dir) break
        dir = parent
    }

    const localDriver = tryRequirePackage(path.resolve(__dirname, "../.."), packageName)
    if (localDriver !== undefined) return localDriver

    throw new Error(
        [
            `ForgeDB could not load "${packageName}".`,
            `Install it in your project (for example: pnpm add ${packageName}).`,
            `With pnpm v10+, allow native builds in package.json:`,
            `"pnpm": { "onlyBuiltDependencies": ["${packageName}"] }`,
        ].join(" ")
    )
}
