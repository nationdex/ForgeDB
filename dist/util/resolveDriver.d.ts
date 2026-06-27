export type SqliteDriverType = "sqlite" | "better-sqlite3";
/**
 * Resolves optional SQLite driver packages from the consumer's project.
 * TypeORM resolves drivers from its own install path, which breaks under pnpm.
 */
export declare function resolveSqliteDriver(type: SqliteDriverType): unknown;
//# sourceMappingURL=resolveDriver.d.ts.map