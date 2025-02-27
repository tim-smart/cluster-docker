import { Entity, Singleton } from "@effect/cluster"
import { NodeClusterSocketPods, NodeRuntime } from "@effect/platform-node"
import { Rpc } from "@effect/rpc"
import { Array, Effect, Layer, Logger, Mailbox, Schema, Stream } from "effect"
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

  Rpc.make("Stream", {
    success: Schema.Number,
    stream: true,
  }),
])

const CounterLive = Counter.toLayer(
  Effect.gen(function* () {
    const podAddress = yield* Entity.CurrentPodAddress
    const address = yield* Entity.CurrentAddress
    yield* Effect.annotateLogs(Effect.log("Creating Counter"), {
      address,
      pod: podAddress,
    })

    let state = 0

    return {
      Increment: Effect.fnUntraced(function* ({ payload: { amount } }) {
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
      Stream: Effect.fnUntraced(function* () {
        const mailbox = yield* Mailbox.make<number>()

        let i = 0
        yield* Effect.suspend(() => mailbox.offer(i++)).pipe(
          Effect.andThen(Effect.sleep(1000)),
          Effect.forever,
          Effect.forkScoped,
        )

        return mailbox
      }),
    }
  }),
  { maxIdleTime: "10 seconds", concurrency: 100 },
)

const SendMessages = Array.makeBy(1, (i) =>
  Singleton.make(
    `SendMessage${i}`,
    Effect.gen(function* () {
      const makeClient = yield* Counter.client
      const semaphore = yield* Effect.makeSemaphore(50)
      const clients = Array.makeBy(1000, (i) => makeClient(`client-${i}`))
      console.log("SendMessages started")
      for (let i = 0; true; i++) {
        const client = clients[i % clients.length]
        yield* semaphore.take(1)
        yield* client
          .Increment({ amount: 1 })
          .pipe(Effect.ensuring(semaphore.release(1)), Effect.fork)
      }
    }),
  ),
)

const SendStreams = Array.makeBy(30, (i) =>
  Singleton.make(
    `SendStreams${i}`,
    Effect.gen(function* () {
      const makeClient = yield* Counter.client
      console.log("SendStreams started")
      for (let i = 0; i < 10; i++) {
        const client = makeClient(`client-${i}`)
        yield* client.Stream().pipe(
          Stream.runForEach((i) => Effect.log("stream", i)),
          Effect.forkScoped,
        )
      }
    }),
  ),
)

const Entities = Layer.mergeAll(CounterLive, ...SendMessages, ...SendStreams)

const ShardingLive = NodeClusterSocketPods.layer({
  storage: "sql",
}).pipe(Layer.provide(SqlLayer))

Entities.pipe(
  Layer.provide(ShardingLive),
  Layer.provide(Logger.json),
  Layer.launch,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
