import { NodeClusterRunnerSocket, NodeRuntime } from "@effect/platform-node"
import { Array, Effect, Layer, Schedule } from "effect"
import { SqlLayer } from "../Sql"
import { Battleship } from "./schema"

const getTarget = () => Math.floor(Math.random() * 1000)

const program = Effect.gen(function* () {
  const client = yield* Battleship.client
  let counter = 0

  const semaphore = yield* Effect.makeSemaphore(30)
  const clients = Array.makeBy(500, (i) => client(`ship-${i}`))

  yield* Effect.suspend(() => {
    const count = counter
    counter = 0
    return Effect.log(`Shots fired: ${count}`)
  }).pipe(Effect.schedule(Schedule.spaced(1000)), Effect.fork)

  while (true) {
    const client = clients[Math.floor(Math.random() * clients.length)]

    yield* semaphore.take(1)
    yield* client.Shoot({ target: getTarget() }).pipe(
      Effect.tap(() => {
        counter++
        return semaphore.release(1)
      }),
      Effect.fork,
    )
  }
})

const ClusterLayer = NodeClusterRunnerSocket.layer({
  storage: "sql",
  clientOnly: true,
}).pipe(Layer.provide(SqlLayer))

program.pipe(Effect.provide(ClusterLayer), NodeRuntime.runMain)
