"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataBase = void 0;
const types_1 = require("./types");
require("reflect-metadata");
const databaseManager_1 = require("./databaseManager");
function isGuildData(data) {
    return ["member", "channel", "role"].includes(data.type);
}
class DataBase extends databaseManager_1.DataBaseManager {
    emitter;
    database = "forge.db";
    entityManager = {
        sqlite: [types_1.SQLiteRecord, types_1.Cooldown],
        mongodb: [types_1.MongoRecord, types_1.MongoCooldown],
        mysql: [types_1.MySQLRecord, types_1.Cooldown],
        postgres: [types_1.PostgreSQLRecord, types_1.Cooldown],
    };
    static entities;
    db;
    static db;
    static emitter;
    constructor(emitter, options) {
        super(options ?? { type: "sqlite" });
        this.emitter = emitter;
        this.type = options?.type || "sqlite";
        this.db = this.getDB();
        DataBase.entities = {
            Record: this.entityManager[this.type === "better-sqlite3" ? "sqlite" : this.type][0],
            Cooldown: this.entityManager[this.type === "better-sqlite3" ? "sqlite" : this.type][1],
        };
    }
    async init() {
        DataBase.emitter = this.emitter;
        DataBase.db = await this.db;
        DataBase.emitter.emit("connect");
    }
    static make_intetifier(data) {
        return `${data.type}_${data.name}_${isGuildData(data) ? `${data.guildId}_` : ""}${data.id}`;
    }
    static async set(data) {
        const newData = new DataBase.entities.Record();
        newData.identifier = DataBase.make_intetifier(data);
        newData.name = data.name;
        newData.id = data.id;
        newData.type = data.type;
        newData.value = data.value;
        if (isGuildData(data))
            newData.guildId = data.guildId;
        const oldData = (await DataBase.db.getRepository(DataBase.entities.Record).findOneBy({ identifier: DataBase.make_intetifier(data) }));
        if (oldData && DataBase.type === "mongodb") {
            DataBase.emitter.emit("variableUpdate", { newData, oldData });
            DataBase.db.getRepository(DataBase.entities.Record).update(oldData, newData);
        }
        else {
            oldData ? DataBase.emitter.emit("variableUpdate", { newData, oldData }) : DataBase.emitter.emit("variableCreate", { data: newData });
            await DataBase.db.getRepository(DataBase.entities.Record).save(newData);
        }
    }
    static async get(data) {
        const identifier = data.identifier ?? DataBase.make_intetifier(data);
        return await DataBase.db.getRepository(DataBase.entities.Record).findOneBy({ identifier });
    }
    static async getAll() {
        return await DataBase.db.getRepository(DataBase.entities.Record).find();
    }
    static async find(data) {
        return await DataBase.db.getRepository(DataBase.entities.Record).find({
            where: { ...data },
        });
    }
    static async delete(data) {
        const identifier = data.identifier ?? DataBase.make_intetifier(data);
        DataBase.emitter.emit("variableDelete", { data: (await DataBase.db.getRepository(DataBase.entities.Record).findOneBy({ identifier })) });
        return await DataBase.db.getRepository(DataBase.entities.Record).delete({ identifier });
    }
    static async wipe() {
        return await DataBase.db.getRepository(DataBase.entities.Record).clear();
    }
    static async cdWipe() {
        return await DataBase.db.getRepository(DataBase.entities.Cooldown).clear();
    }
    static make_cdIdentifier(data) {
        return `${data.name}${data.id ? `_${data.id}` : ""}`;
    }
    static async cdAdd(data) {
        const cd = new DataBase.entities.Cooldown();
        cd.identifier = DataBase.make_cdIdentifier(data);
        cd.name = data.name;
        cd.id = data.id;
        cd.startedAt = Date.now();
        cd.duration = data.duration;
        const oldCD = await DataBase.db.getRepository(DataBase.entities.Cooldown).findOneBy({ identifier: DataBase.make_cdIdentifier(data) });
        if (oldCD && DataBase.type === "mongodb")
            return await DataBase.db.getRepository(DataBase.entities.Cooldown).update(oldCD, cd);
        else
            return await DataBase.db.getRepository(DataBase.entities.Cooldown).save(cd);
    }
    static async cdDelete(identifier) {
        await DataBase.db.getRepository(DataBase.entities.Cooldown).delete({ identifier });
    }
    static async cdTimeLeft(identifier) {
        const data = await DataBase.db.getRepository(DataBase.entities.Cooldown).findOneBy({ identifier });
        return data ? { ...data, left: Math.max(data.duration - (Date.now() - data.startedAt), 0) } : { left: 0 };
    }
    static async query(query) {
        return await DataBase.db.query(query);
    }
}
exports.DataBase = DataBase;
//# sourceMappingURL=database.js.map