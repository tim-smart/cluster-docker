import { Entity, Singleton } from "@effect/cluster"
import { NodeClusterRunnerSocket, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer, Schedule } from "effect"
import { SqlLayer } from "../Sql"
import { Battleship } from "./schema"

const BattleshipLive = Battleship.toLayer(
  Effect.gen(function* () {
    const address = yield* Entity.CurrentAddress
    return {
      Shoot: Effect.fnUntraced(
        function* (_) {
          yield* Effect.log("Shoot done")
        },
        (effect, { payload }) =>
          Effect.annotateLogs(effect, {
            address,
            target: payload.target,
          }),
      ),
      ShootWithDelay: Effect.fnUntraced(
        function* (envelope) {
          yield* Effect.log("ShootWithDelay received")
          yield* Effect.sleep(envelope.payload.delay)
          yield* Effect.log("ShootWithDelay done")
        },
        (effect, { payload }) =>
          Effect.annotateLogs(effect, {
            address,
            target: payload.target,
          }),
      ),
      ShootAt: Effect.fnUntraced(
        function* (_) {
          yield* Effect.log("ShootAt done")
        },
        (effect, { payload }) =>
          Effect.annotateLogs(effect, {
            address,
            target: payload.target,
          }),
      ),
    }
  }),
)

const CronShip = Singleton.make(
  "CronShip",
  Effect.log("The CronShip is cronning").pipe(
    Effect.repeat(Schedule.cron("* * * * *")),
  ),
)

const Entities = Layer.mergeAll(BattleshipLive, CronShip)

const RunnerLive = NodeClusterRunnerSocket.layer({ storage: "sql" }).pipe(
  Layer.provide(SqlLayer),
)

Entities.pipe(Layer.provide(RunnerLive), Layer.launch, NodeRuntime.runMain)
