import {
  NodeClusterSocketShardManager,
  NodeRuntime,
} from "@effect/platform-node"
import { Layer, LogLevel, Logger } from "effect"
import { SqlLayer } from "./Sql"

NodeClusterSocketShardManager.layer({ storage: "sql" }).pipe(
  Layer.provide(SqlLayer),
  Layer.provide(Logger.minimumLogLevel(LogLevel.All)),
  Layer.launch,
  NodeRuntime.runMain,
)
