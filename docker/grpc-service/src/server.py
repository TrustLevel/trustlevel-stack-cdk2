import time
import logging
from concurrent import futures
import grpc
import sys
import os

sys.path.append("/usr/src/app/spec")

from spec import trustlevel_pb2
from spec import trustlevel_pb2_grpc

LOGLEVEL = os.environ.get("LOGLEVEL", "INFO").upper()
logger = logging.getLogger(__name__)
logger.setLevel(level=LOGLEVEL)

# Assuming determine_bias_score is in the same directory
from bias_score_client import (
    determine_bias_score,
)  # Replace with the correct module name

_ONE_DAY_IN_SECONDS = 60 * 60 * 24


class TrustlevelService(trustlevel_pb2_grpc.ServiceDefinitionServicer):
    def determineBias(self, request, context):
        logging.info(f"Received request: {request}")
        input_string = request.input_string
        # Use the determine_bias_score function
        try:
            bias_score, explanations = determine_bias_score(input_string)
            logging.info(
                f"Determined bias score: {bias_score} for input: {input_string}"
            )
            return trustlevel_pb2.BiasOutput(
                score=bias_score, explanations=explanations
            )
        except Exception as e:
            logging.error(f"Error in determine_bias_score: {e}")
            raise grpc.RpcError(grpc.StatusCode.INTERNAL, "Internal server error")


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    trustlevel_pb2_grpc.add_ServiceDefinitionServicer_to_server(
        TrustlevelService(), server
    )
    server.add_insecure_port("[::]:7077")
    server.start()
    logging.info("Server running on port 7077")
    try:
        while True:
            time.sleep(_ONE_DAY_IN_SECONDS)
    except KeyboardInterrupt:
        server.stop(0)
        logging.info("Server stopped")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    serve()
