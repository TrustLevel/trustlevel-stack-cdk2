# Trustlevel grpc container

## Local execution

```bash
# build the container
docker build -t trustlevel-grpc-server .
# run the container
docker run --name trustlevel-grpc-server -p 7077:7077 -e STAGE_URL=<stage-url> -e STAGE_API_KEY=<stage-api-key> trustlevel-grpc-server

# example:
docker run --name trustlevel-grpc-server -p 7077:7077 -e STAGE_URL=https://2q2ffhhelb.execute-api.eu-west-1.amazonaws.com/v1/ -e STAGE_API_KEY=<dev-stage-api-key> trustlevel-grpc-server

# connect to the container bash
docker exec -it trustlevel-grpc-server bash
# execute test client
python client.py --host localhost --port 7077
```