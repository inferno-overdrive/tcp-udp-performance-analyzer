import socket

HOST = "0.0.0.0"
PORT = 5002

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
try:
    server.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2 * 1024 * 1024)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 2 * 1024 * 1024)
except Exception:
    pass

server.bind((HOST, PORT))
server.listen(5)

local_ip = get_local_ip()
print(f"TCP Server listening on {HOST}:{PORT} ...", flush=True)
print(f"Server IP for client config: {local_ip}")
print("Make sure both devices are on the same Wi-Fi network.")
print("Allow inbound connections on this port through your firewall if prompted.", flush=True)

packets_count = 0
try:
    while True:
        connection, address = server.accept()
        try:
            connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            connection.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2 * 1024 * 1024)
            connection.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 2 * 1024 * 1024)
        except Exception:
            pass
        try:
            while True:
                data = connection.recv(65536)
                if not data:
                    break
                packets_count += 1
                connection.sendall(data)
        finally:
            connection.close()

        # If we processed actual client test packets, test is complete
        if packets_count > 0:
            break
finally:
    server.close()
    print(f"TCP session finished. Total packets processed: {packets_count}", flush=True)