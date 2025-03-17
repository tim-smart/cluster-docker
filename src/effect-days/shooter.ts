import { NodeClusterRunnerSocket, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { SqlLayer } from "../Sql"
import { Battleship } from "./schema"

const getShipId = () => `ship-${Math.floor(Math.random() * 1000)}`
const getTarget = () => Math.floor(Math.random() * 1000)

const program = Effect.gen(function* () {
  const client = yield* Battleship.client

  while (true) {
    const ship = getShipId()
    yield* Effect.log(`Shooting at ${ship}`)
    yield* client(ship).Shoot({ target: getTarget() })
    yield* Effect.sleep(1000)
  }
})

const ClusterLayer = NodeClusterRunnerSocket.layer({
  storage: "sql",
  clientOnly: true,
}).pipe(Layer.provide(SqlLayer))

program.pipe(Effect.provide(ClusterLayer), NodeRuntime.runMain)
