import time
import logging
from concurrent import futures
import grpc
import sys
sys.path.append('/usr/src/app/spec')

from spec import trustlevel_pb2
from spec import trustlevel_pb2_grpc


# Assuming calculate_trust_level is in the same directory
from trust_level_client import calculate_trust_level  # Replace with the correct module name

_ONE_DAY_IN_SECONDS = 60 * 60 * 24

class TrustlevelService(trustlevel_pb2_grpc.ServiceDefinitionServicer):
    def determineTrustLevel(self, request, context):
        logging.info(f"Received request: {request}")
        input_string = request.input_string
        # Use the calculate_trust_level function
        try:
            trust_level = calculate_trust_level(input_string)
            logging.info(f"Calculated trust level: {trust_level} for input: {input_string}")
            return trustlevel_pb2.Output(trust_level=trust_level)
        except Exception as e:
            logging.error(f"Error in calculate_trust_level: {e}")
            raise grpc.RpcError(grpc.StatusCode.INTERNAL, "Internal server error")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    trustlevel_pb2_grpc.add_ServiceDefinitionServicer_to_server(TrustlevelService(), server)
    server.add_insecure_port('[::]:7077')
    server.start()
    logging.info('Server running on port 7077')
    try:
        while True:
            time.sleep(_ONE_DAY_IN_SECONDS)
    except KeyboardInterrupt:
        server.stop(0)
        logging.info('Server stopped')

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
