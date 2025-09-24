import * as K from "@fpk/k8s"
import { pipe } from "effect"
import { postgresCredentials } from "../pg/.env"
import type { Role, RoleBinding } from "kubernetes-types/rbac/v1"

const name = "runner"
const image = "timsmart/effect-cluster:runner"

const sa = K.serviceAccount(name)

const healthCheckRole = K.rbac<Role>("Role", "health-check-role", {
  rules: [
    {
      apiGroups: [""],
      resources: ["pods"],
      verbs: ["list"],
    },
  ],
})

const binding = K.rbac<RoleBinding>("RoleBinding", "health-check-rb", {
  roleRef: {
    apiGroup: "rbac.authorization.k8s.io",
    name: healthCheckRole.metadata!.name!,
    kind: "Role",
  },
  subjects: [
    {
      kind: "ServiceAccount",
      name: sa.metadata!.name!,
      namespace: name,
    },
  ],
})

const container = pipe(
  K.containerWithPorts(name, image, { tcp: 34431 }),
  K.setImagePullPolicy("Always"),
  K.concatEnv(postgresCredentials),
  K.concatEnv({
    SHARD_MANAGER_HOST: "shard-manager.shard-manager.svc",
    HOST: { fieldRef: { fieldPath: "status.podIP" } },
  }),
  K.setResourceRequests({
    cpu: "100m",
    memory: "128Mi",
  }),
  K.setLivenessProbe({
    httpGet: undefined!,
    tcpSocket: { port: 34431 },
    periodSeconds: 10,
  }),
  K.setReadinessProbe({
    httpGet: undefined!,
    tcpSocket: { port: 34431 },
    periodSeconds: 10,
  }),
)
const deployment = pipe(
  K.deploymentWithContainer(name, container),
  K.setReplicas(5),
  K.overPodTemplate((pod) => ({
    ...pod,
    spec: {
      ...pod.spec!,
      serviceAccountName: sa.metadata!.name!,
    },
  })),
)

export default K.withNamespace(name)({
  "10-sa": sa,
  "20-role": healthCheckRole,
  "30-rolebinding": binding,
  "40-deploy": deployment,
})
