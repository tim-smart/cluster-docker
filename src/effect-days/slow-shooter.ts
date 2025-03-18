import { NodeClusterRunnerSocket } from "@effect/platform-node"
import { Config, Effect, Iterable, Layer, Logger } from "effect"
import { SqlLayer } from "../Sql"
import { Battleship } from "./schema"

const program = Effect.gen(function* () {
  const client = yield* Battleship.client
  const start = yield* Config.integer("START_SHIP")

  yield* Effect.forEach(
    Iterable.range(start, start + 9),
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

  yield* Effect.never
})

const ClusterLayer = NodeClusterRunnerSocket.layer({
  storage: "sql",
  clientOnly: true,
}).pipe(Layer.provide(SqlLayer))

program.pipe(
  Effect.provide(ClusterLayer.pipe(Layer.provide(Logger.pretty))),
  Effect.runFork,
)
