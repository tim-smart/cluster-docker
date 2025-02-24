import {
  NodeClusterSocketShardManager,
  NodeRuntime,
} from "@effect/platform-node"
import { Layer } from "effect"
import { SqlLayer } from "./Sql"

NodeClusterSocketShardManager.layer({ storage: "sql" }).pipe(
  Layer.provide(SqlLayer),
  Layer.launch,
  NodeRuntime.runMain,
)
