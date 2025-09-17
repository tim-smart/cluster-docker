tsup
# docker build -t timsmart/effect-cluster:shard-manager -f shardManager.Dockerfile .
docker build -t timsmart/effect-cluster:runner -f runner.Dockerfile .
# docker push timsmart/effect-cluster:shard-manager
docker push timsmart/effect-cluster:runner
