import * as K from "@fpk/k8s"
import { pipe } from "effect"
import { mysqlCredentials } from "../mysql/.env"
import { hostnameAffinity } from "../../lib/affinity"

const name = "battleships"
const image = "timsmart/effect-cluster:runner"

const container = pipe(
  K.containerWithPorts(name, image, { tcp: 34431 }),
  K.setArgs(["node", "ed-runner.js"]),
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
  K.setLivenessProbe({
    httpGet: undefined,
    tcpSocket: { port: 34431 },
    initialDelaySeconds: 5,
    periodSeconds: 10,
  }),
  K.setReadinessProbe({
    httpGet: undefined,
    tcpSocket: { port: 34431 },
    initialDelaySeconds: 5,
    periodSeconds: 10,
  }),
)

const deployment = pipe(
  K.deploymentWithContainer(name, container, {
    spec: {
      template: {
        spec: {
          affinity: hostnameAffinity(name),
        },
      },
    },
  }),
  K.setReplicas(1),
)

export default K.withNamespace(name)({
  "10-deploy": deployment,
})
