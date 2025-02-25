import { MysqlClient } from "@effect/sql-mysql2"
import { Config } from "effect"

export const SqlLayer = MysqlClient.layerConfig({
  database: Config.string("DB_DATABASE"),
  username: Config.string("DB_USER"),
  password: Config.redacted("DB_PASSWORD"),
  host: Config.string("DB_HOST"),
  port: Config.integer("DB_PORT"),
})
