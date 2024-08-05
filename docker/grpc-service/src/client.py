import logging
import argparse
import grpc
import sys

sys.path.append("/usr/src/app/spec")

from spec import trustlevel_pb2
from spec import trustlevel_pb2_grpc


def run(host, port):
    try:
        channel = grpc.insecure_channel(f"{host}:{port}")
        stub = trustlevel_pb2_grpc.ServiceDefinitionStub(channel)
        logging.info(f"Connecting to server at {host}:{port}")
        response = stub.determineBias(
            trustlevel_pb2.Input(input_string="This is some factual news article")
        )
        logging.info(f"Received bias score: {response.score}")
        logging.info(f"Received bias explanations: {response.explanations}")
    except grpc.RpcError as e:
        logging.error(f"RPC failed: {e}")
    finally:
        channel.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1", type=str, help="host")
    parser.add_argument("--port", default=7077, type=int, help="port")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    run(args.host, args.port)
