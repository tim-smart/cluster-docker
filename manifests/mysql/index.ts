import * as K from "@fpk/k8s"
import { pipe } from "effect"
import { mysqlCredentials } from "./.env"

const name = "mysql"
const image = "mysql:9"

const pvc = K.pvc("data", "100Gi", {
  spec: {
    storageClassName: "gp2",
  },
})
const volume = K.volumeFromPvc("data", pvc)

const container = pipe(
  K.containerWithPorts(name, image, {
    mysql: 3306,
  }),
  K.setArgs(["--max-connections=1000"]),
  K.concatEnv({
    MYSQL_ROOT_PASSWORD: mysqlCredentials.DB_PASSWORD,
    MYSQL_DATABASE: mysqlCredentials.DB_DATABASE,
    MYSQL_USER: mysqlCredentials.DB_USER,
    MYSQL_PASSWORD: mysqlCredentials.DB_PASSWORD,
  }),
)
const deployment = pipe(
  K.deploymentWithContainer(name, container),
  K.setDeploymentRollingUpdate({ maxSurge: 1, maxUnavailable: 1 }),
  K.appendVolumeAndMount({
    volume,
    mountPath: "/var/lib/mysql",
    mount: {
      subPath: "mysql-data",
    },
  }),
)

const service = K.serviceFromPod(name, deployment)

export default K.withNamespace(name)({
  "10-pvc": pvc,
  "10-deploy": deployment,
  "20-service": service,
})
