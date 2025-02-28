import { DeliverAt, Entity, Singleton } from "@effect/cluster"
import { NodeClusterSocketPods, NodeRuntime } from "@effect/platform-node"
import { Rpc } from "@effect/rpc"
import {
  Array,
  DateTime,
  Effect,
  Layer,
  Logger,
  Mailbox,
  PrimaryKey,
  Schema,
  Stream,
} from "effect"
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

  Rpc.make("Never", {
    payload: class NeverPayload extends Schema.Class<NeverPayload>(
      "NeverPayload",
    )({
      messageId: Schema.String,
    }) {
      [PrimaryKey.symbol]() {
        return this.messageId
      }
    },
  }),

  Rpc.make("Sleep", {
    payload: class SleepPayload
      extends Schema.Class<SleepPayload>("SleepPayload")({
        wakeUpAt: Schema.Number,
      })
      implements DeliverAt.DeliverAt
    {
      [DeliverAt.symbol]() {
        return DateTime.unsafeMake(this.wakeUpAt)
      }
    },
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
      Never: (envelope) => {
        console.log("Never", envelope)
        return Effect.never
      },
      Sleep: (envelope) => {
        console.log("Sleep", envelope)
        return Effect.void
      },
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

const SendStreams = Array.makeBy(1, (i) =>
  Singleton.make(
    `SendStreams${i}`,
    Effect.gen(function* () {
      const makeClient = yield* Counter.client
      console.log("SendStreams started")
      for (let i = 0; i < 5; i++) {
        const client = makeClient(`client-${i}`)
        yield* client.Stream().pipe(
          Stream.runForEach((i) => Effect.log("stream", i)),
          Effect.forkScoped,
        )
      }
    }),
  ),
)

const SendNever = Singleton.make(
  "SendNever",
  Effect.gen(function* () {
    const makeClient = yield* Counter.client
    const client = makeClient("client")
    console.log("SendNever started")
    yield* client.Never({ messageId: "1" })
  }),
)

const SendSleep = Singleton.make(
  "SendSleep",
  Effect.gen(function* () {
    const makeClient = yield* Counter.client
    const client = makeClient("2")
    console.log("SendSleep started")
    yield* client.Sleep({ wakeUpAt: Date.now() + 30000 })
  }),
)

const Entities = Layer.mergeAll(
  CounterLive,
  SendNever,
  SendSleep,
  ...SendMessages,
  ...SendStreams,
)

const ShardingLive = NodeClusterSocketPods.layer({
  storage: "sql",
  shardingConfig: {
    numberOfShards: 1000,
  },
}).pipe(Layer.provide(SqlLayer))

Entities.pipe(
  Layer.provide(ShardingLive),
  Layer.provide(Logger.json),
  Layer.launch,
  NodeRuntime.runMain({ disablePrettyLogger: true }),
)
