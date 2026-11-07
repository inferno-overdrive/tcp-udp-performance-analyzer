import socket

HOST = "0.0.0.0"
PORT = 5001
BUFFER_SIZE = 65535

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

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # 2MB receive buffer prevents loopback buffer overflow during high-speed blasts
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2 * 1024 * 1024)
    except Exception as e:
        print(f"[UDP SERVER] Could not set SO_RCVBUF: {e}", flush=True)

    sock.bind((HOST, PORT))
    print(f"[UDP SERVER] Listening on {HOST}:{PORT} ...", flush=True)

    local_ip = get_local_ip()
    print(f"Server IP for client config: {local_ip}")
    print("Make sure both devices are on the same Wi-Fi network.")
    print("Allow inbound connections on this port through your firewall if prompted.", flush=True)

    throughput_chunks = 0

    try:
        while True:
            data, client_addr = sock.recvfrom(BUFFER_SIZE)

            # 1. STREAM PROTOCOL: Control signals for throughput blast
            if data == b"STREAM_START":
                throughput_chunks = 0
                sock.sendto(b"READY", client_addr)
                continue
            elif data == b"STREAM_END":
                sock.sendto(f"ACK|{throughput_chunks}".encode(), client_addr)
                continue

            # 2. LATENCY TEST: Echo ping packets immediately
            if b"|hello" in data:
                sock.sendto(data, client_addr)
                continue

            # 3. THROUGHPUT BLAST: Count incoming payload chunks
            throughput_chunks += 1

    except KeyboardInterrupt:
        print("\n[UDP SERVER] Shutting down.", flush=True)
    finally:
        sock.close()

if __name__ == "__main__":
    main()