from http.server import HTTPServer, BaseHTTPRequestHandler
import logging
import threading
import time

class LoggingHTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Log request path
        logging.info(f"[HEALTH] Received request: {self.path}")

        # Send response status code
        self.send_response(200)

        # Send headers
        self.send_header('Content-type', 'text/html')
        self.end_headers()

        # Send message back to client
        message = "Health Check OK"
        # Write content as utf-8 data
        self.wfile.write(bytes(message, "utf8"))
        return

def heartbeat():
    while True:
        logging.info("[HEALTH] Heartbeat - health check server is running")
        time.sleep(30)  # Wait for 30 seconds before the next log

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    # Start the heartbeat thread
    heartbeat_thread = threading.Thread(target=heartbeat)
    heartbeat_thread.daemon = True  # Daemonize thread
    heartbeat_thread.start()

    # Start the HTTP server
    server_address = ('', 8080)
    httpd = HTTPServer(server_address, LoggingHTTPRequestHandler)
    logging.info('[HEALTH] Starting httpd...\n')
    httpd.serve_forever()
