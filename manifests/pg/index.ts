import * as K from "@fpk/k8s"
import { pipe } from "effect"
import { postgresCredentials } from "./.env"

const name = "postgres"
const image = "postgres"

const pvc = K.pvc("data", "100Gi")
const volume = K.volumeFromPvc("data", pvc)

const container = pipe(
  K.containerWithPorts(name, image, {
    postgres: 5432,
  }),
  K.setArgs(["-c", "max_connections=1000"]),
  K.concatEnv({
    POSTGRES_USER: postgresCredentials.DB_USER,
    POSTGRES_PASSWORD: postgresCredentials.DB_PASSWORD,
    POSTGRES_DB: postgresCredentials.DB_DATABASE,
  }),
)
const deployment = pipe(
  K.deploymentWithContainer(name, container),
  K.setDeploymentRollingUpdate({ maxSurge: 1, maxUnavailable: 1 }),
  K.appendVolumeAndMount({
    volume,
    mountPath: "/var/lib/postgresql/data",
    mount: {
      subPath: "data",
    },
  }),
)

const service = K.serviceFromPod(name, deployment)

export default K.withNamespace(name)({
  "10-pvc": pvc,
  "10-deploy": deployment,
  "20-service": service,
})
