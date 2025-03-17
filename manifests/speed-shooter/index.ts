import * as K from "@fpk/k8s"
import { pipe } from "effect"
import { mysqlCredentials } from "../mysql/.env"

const name = "speed-shooter"
const image = "timsmart/effect-cluster:runner"

const container = pipe(
  K.containerWithPorts(name, image, { tcp: 34431 }),
  K.setArgs(["node", "ed-speed-shooter.js"]),
  K.setImagePullPolicy("Always"),
  K.concatEnv(mysqlCredentials),
  K.concatEnv({
    SHARD_MANAGER_HOST: "shard-manager.shard-manager.svc",
    HOST: { fieldRef: { fieldPath: "status.podIP" } },
  }),
  K.setResourceRequests({
    cpu: "100m",
    memory: "128Mi",
  }),
)
const deployment = pipe(
  K.deploymentWithContainer(name, container),
  K.setReplicas(0),
)

export default K.withNamespace(name)({
  "10-deploy": deployment,
})
