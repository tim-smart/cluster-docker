import * as K from "@fpk/k8s"
import { pipe } from "effect"
import { postgresCredentials } from "../pg/.env"

const name = "shard-manager"
const image = "timsmart/effect-cluster:shard-manager"

const container = pipe(
  K.containerWithPorts(name, image, { tcp: 8080 }),
  K.setImagePullPolicy("Always"),
  K.concatEnv(postgresCredentials),
  K.concatEnv({
    SHARD_MANAGER_HOST: { fieldRef: { fieldPath: "status.podIP" } },
  }),
  K.setResourceRequests({
    cpu: "100m",
    memory: "128Mi",
  }),
)
const deployment = K.deploymentWithContainer(name, container)

const service = K.serviceFromPod(name, deployment, {
  spec: {
    clusterIP: "None",
  },
})

export default K.withNamespace(name)({
  "10-deploy": deployment,
  "20-service": service,
})
