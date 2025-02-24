import { Entity, Singleton } from "@effect/cluster"
import { NodeClusterSocketPods, NodeRuntime } from "@effect/platform-node"
import { Rpc } from "@effect/rpc"
import { Array, Effect, Layer, Logger, LogLevel, Schema } from "effect"
import { SqlLayer } from "./Sql"

const Counter = Entity.make("Counter", [
  Rpc.make("Increment", {
    payload: { amount: Schema.Number },
    success: Schema.Number,
  }),

  Rpc.make("Decrement", {
    payload: { amount: Schema.Number },
    success: Schema.Number,
  }),
])

const CounterLive = Counter.toLayer(
  Effect.gen(function* () {
    const podAddress = yield* Entity.CurrentPodAddress
    const address = yield* Entity.CurrentAddress
    console.log("Creating Counter", address)

    let state = 0

    yield* Effect.addFinalizer(() => Effect.log("Finalizing", state))

    return {
      Increment: Effect.fnUntraced(function* ({
        payload: { amount },
        requestId,
      }) {
        console.log("Incrementing by", amount, requestId, podAddress)
        // yield* Effect.sleep(1000)
        state += amount
        return state
      }),
      Decrement: Effect.fnUntraced(function* ({ payload: { amount } }) {
        console.log("Decrementing by", amount)
        // yield* Effect.sleep(1000)
        state -= amount
        return state
      }),
    }
  }),
  { maxIdleTime: "10 seconds", concurrency: 1000 },
)

const SendMessages = Array.makeBy(10, (i) =>
  Singleton.make(
    `SendMessage${i}`,
    Effect.gen(function* () {
      const makeClient = yield* Counter.client
      const semaphore = yield* Effect.makeSemaphore(50)
      const clients = Array.makeBy(100, (i) => makeClient(`client-${i}`))
      console.log("SendMessages started")
      for (let i = 0; true; i++) {
        const client = clients[i % clients.length]
        yield* semaphore.take(1)
        yield* client.Increment({ amount: 1 }).pipe(
          Effect.flatMap((result) => Effect.log(`Client ${i}`, result)),
          Effect.ensuring(semaphore.release(1)),
          Effect.fork,
        )
      }
    }),
  ),
)

const Entities = Layer.mergeAll(CounterLive, ...SendMessages)

const ShardingLive = NodeClusterSocketPods.layer({
  storage: "sql",
}).pipe(Layer.provide(SqlLayer))

Entities.pipe(
  Layer.provide(ShardingLive),
  Layer.provide(Logger.minimumLogLevel(LogLevel.All)),
  Layer.launch,
  NodeRuntime.runMain,
)
