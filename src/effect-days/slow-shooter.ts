import { NodeClusterRunnerSocket, NodeRuntime } from "@effect/platform-node"
import { Effect, Iterable, Layer } from "effect"
import { SqlLayer } from "../Sql"
import { Battleship } from "./schema"

const program = Effect.gen(function* () {
  const client = yield* Battleship.client

  yield* Effect.forEach(
    Iterable.range(1, 10),
    Effect.fnUntraced(function* (i) {
      const ship = `ship-${i}`
      yield* Effect.log(`Shooting at ${ship}`)
      yield* client(ship).ShootWithDelay({
        target: 123,
        delay: 20_000,
      })
      yield* Effect.log(`Shot at ${ship}!`)
    }),
    { concurrency: "unbounded" },
  )
})

const ClusterLayer = NodeClusterRunnerSocket.layer({
  storage: "sql",
  clientOnly: true,
}).pipe(Layer.provide(SqlLayer))

program.pipe(Effect.provide(ClusterLayer), NodeRuntime.runMain)
