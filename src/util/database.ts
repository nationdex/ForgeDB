import type { TypedEmitter } from "tiny-typed-emitter"
import type { DataSource } from "typeorm"
import type { TransformEvents } from ".."
import type { IDBEvents } from "../structures"
import { Cooldown, type GuildData, type IDataBaseOptions, MongoCooldown, MongoRecord, MySQLRecord, PostgreSQLRecord, type RecordData, SQLiteRecord } from "./types"
import "reflect-metadata"
import { DataBaseManager } from "./databaseManager"

function isGuildData(data: RecordData): data is GuildData {
    return ["member", "channel", "role"].includes(data.type!)
}

type AnyRecord = typeof SQLiteRecord | typeof MongoRecord | typeof MySQLRecord | typeof PostgreSQLRecord
type AnyCooldown = typeof MongoCooldown | typeof Cooldown
export class DataBase extends DataBaseManager {
    public database = "forge.db"
    public entityManager = {
        sqlite: [SQLiteRecord, Cooldown],
        mongodb: [MongoRecord, MongoCooldown],
        mysql: [MySQLRecord, Cooldown],
        postgres: [PostgreSQLRecord, Cooldown],
    }
    private static entities: {
        Record: typeof SQLiteRecord | typeof MySQLRecord | typeof PostgreSQLRecord | typeof MongoRecord
        Cooldown: typeof Cooldown | typeof MongoCooldown
    }

    private db: Promise<DataSource>
    private static db: DataSource
    private static emitter: TypedEmitter<TransformEvents<IDBEvents>>

    constructor(
        private emitter: TypedEmitter<TransformEvents<IDBEvents>>,
        options?: IDataBaseOptions
    ) {
        super(options ?? { type: "sqlite" })
        this.type = options?.type || "sqlite"
        this.db = this.getDB()
        DataBase.entities = {
            Record: this.entityManager[this.type === "better-sqlite3" ? "sqlite" : this.type][0] as AnyRecord,
            Cooldown: this.entityManager[this.type === "better-sqlite3" ? "sqlite" : this.type][1] as AnyCooldown,
        }
    }

    public async init() {
        DataBase.emitter = this.emitter
        DataBase.db = await this.db
        DataBase.emitter.emit("connect")
    }

    public static make_intetifier(data: RecordData) {
        return `${data.type}_${data.name}_${isGuildData(data) ? `${data.guildId}_` : ""}${data.id}`
    }

    public static async set(data: RecordData) {
        const newData = new DataBase.entities.Record()
        newData.identifier = DataBase.make_intetifier(data)
        newData.name = data.name!
        newData.id = data.id!
        newData.type = data.type!
        newData.value = data.value!
        if (isGuildData(data)) newData.guildId = data.guildId
        const oldData = (await DataBase.db.getRepository(DataBase.entities.Record).findOneBy({ identifier: DataBase.make_intetifier(data) })) as SQLiteRecord
        if (oldData && DataBase.type === "mongodb") {
            DataBase.emitter.emit("variableUpdate", { newData, oldData })
            DataBase.db.getRepository(DataBase.entities.Record).update(oldData, newData)
        } else {
            oldData ? DataBase.emitter.emit("variableUpdate", { newData, oldData }) : DataBase.emitter.emit("variableCreate", { data: newData })
            await DataBase.db.getRepository(DataBase.entities.Record).save(newData)
        }
    }

    public static async get(data: RecordData) {
        const identifier = data.identifier ?? DataBase.make_intetifier(data)
        return await DataBase.db.getRepository(DataBase.entities.Record).findOneBy({ identifier })
    }

    public static async getAll() {
        return await DataBase.db.getRepository(DataBase.entities.Record).find()
    }

    public static async find(data?: RecordData) {
        return await DataBase.db.getRepository(DataBase.entities.Record).find({
            where: { ...data },
        })
    }

    public static async delete(data: RecordData) {
        const identifier = data.identifier ?? DataBase.make_intetifier(data)
        DataBase.emitter.emit("variableDelete", { data: (await DataBase.db.getRepository(DataBase.entities.Record).findOneBy({ identifier })) as SQLiteRecord })
        return await DataBase.db.getRepository(DataBase.entities.Record).delete({ identifier })
    }

    public static async wipe() {
        return await DataBase.db.getRepository(DataBase.entities.Record).clear()
    }

    public static async cdWipe() {
        return await DataBase.db.getRepository(DataBase.entities.Cooldown).clear()
    }

    public static make_cdIdentifier(data: { name?: string; id?: string }) {
        return `${data.name}${data.id ? `_${data.id}` : ""}`
    }

    public static async cdAdd(data: { name: string; id?: string; duration: number }) {
        const cd = new DataBase.entities.Cooldown()
        cd.identifier = DataBase.make_cdIdentifier(data)
        cd.name = data.name
        cd.id = data.id
        cd.startedAt = Date.now()
        cd.duration = data.duration

        const oldCD = await DataBase.db.getRepository(DataBase.entities.Cooldown).findOneBy({ identifier: DataBase.make_cdIdentifier(data) })
        if (oldCD && DataBase.type === "mongodb") return await DataBase.db.getRepository(DataBase.entities.Cooldown).update(oldCD, cd)
        else return await DataBase.db.getRepository(DataBase.entities.Cooldown).save(cd)
    }

    public static async cdDelete(identifier: string) {
        await DataBase.db.getRepository(DataBase.entities.Cooldown).delete({ identifier })
    }

    public static async cdTimeLeft(identifier: string) {
        const data = await DataBase.db.getRepository(DataBase.entities.Cooldown).findOneBy({ identifier })
        return data ? { ...data, left: Math.max(data.duration - (Date.now() - data.startedAt), 0) } : { left: 0 }
    }

    public static async query(query: string) {
        return await DataBase.db.query(query)
    }
}
