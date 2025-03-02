import { PgClient } from "@effect/sql-pg"
import { MysqlClient } from "@effect/sql-mysql2"
import { Config } from "effect"
import { constVoid } from "effect/Function"

export const SqlLayer = MysqlClient.layerConfig({
  database: Config.string("DB_DATABASE"),
  username: Config.string("DB_USER"),
  password: Config.redacted("DB_PASSWORD"),
  host: Config.succeed("mysql.mysql.svc"),
})
