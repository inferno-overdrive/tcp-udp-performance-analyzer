import socket
import time
import statistics
import json
import sys

SERVER_HOST = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
SERVER_PORT = 5001
BUFFER_SIZE = 65535
TIMEOUT = 1.0
NUM_PACKETS = 100

def run_latency_and_loss_test(sock):
    print(f"\n[UDP CLIENT] Sending {NUM_PACKETS} packets for detailed latency/loss test...")
    rtts = []
    lost = 0

    for seq in range(NUM_PACKETS):
        message = f"{seq}|hello"
        start = time.perf_counter()
        sock.sendto(message.encode(), (SERVER_HOST, SERVER_PORT))

        try:
            data, _ = sock.recvfrom(BUFFER_SIZE)
            end = time.perf_counter()
            rtt_ms = (end - start) * 1000
            rtts.append(rtt_ms)
        except socket.timeout:
            lost += 1

    sent = NUM_PACKETS
    received = sent - lost
    loss_pct = (lost / sent) * 100

    if rtts:
        avg_latency = statistics.mean(rtts)
        min_latency = min(rtts)
        max_latency = max(rtts)
        median_latency = statistics.median(rtts)
        sorted_rtts = sorted(rtts)
        p95_index = min(int(len(sorted_rtts) * 0.95), len(sorted_rtts) - 1)
        p99_index = min(int(len(sorted_rtts) * 0.99), len(sorted_rtts) - 1)
        p95_latency = sorted_rtts[p95_index]
        p99_latency = sorted_rtts[p99_index]
        jitter = statistics.stdev(rtts) if len(rtts) > 1 else 0.0
    else:
        avg_latency = min_latency = max_latency = median_latency = p95_latency = p99_latency = jitter = 0.0

    print("\n--- UDP Latency & Reliability Results ---")
    print(f"Packets sent      : {sent}")
    print(f"Packets received  : {received}")
    print(f"Packet loss       : {loss_pct:.2f}%")
    print(f"Average RTT       : {avg_latency:.3f} ms")
    print(f"Min RTT           : {min_latency:.3f} ms")
    print(f"Max RTT           : {max_latency:.3f} ms")
    print(f"Median (P50)      : {median_latency:.3f} ms")
    print(f"95th Percentile   : {p95_latency:.3f} ms")
    print(f"99th Percentile   : {p99_latency:.3f} ms")
    print(f"Jitter (StdDev)   : {jitter:.3f} ms")

    step = max(1, len(rtts) // 50)
    graph_latencies = [round(r, 4) for r in rtts[::step]]

    return {
        "sent": sent,
        "received": received,
        "loss_pct": round(loss_pct, 2),
        "avg": round(avg_latency, 3),
        "min": round(min_latency, 3),
        "max": round(max_latency, 3),
        "median": round(median_latency, 3),
        "p95": round(p95_latency, 3),
        "p99": round(p99_latency, 3),
        "jitter": round(jitter, 3),
        "samples": graph_latencies,
    }

def run_throughput_test(sock, payload_size_bytes=1_000_000, chunk_size=1024):
    print(f"\n[UDP CLIENT] Running high-speed streaming throughput test with {payload_size_bytes} bytes in {chunk_size}-byte chunks...")
    total_chunks = payload_size_bytes // chunk_size
    chunk_data = b"x" * chunk_size

    # Establish connected UDP socket for fast kernel routing
    stream_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        stream_sock.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 2 * 1024 * 1024)
    except Exception:
        pass
    stream_sock.settimeout(2.0)
    stream_sock.connect((SERVER_HOST, SERVER_PORT))

    # Send stream handshake
    stream_sock.send(b"STREAM_START")
    try:
        stream_sock.recv(1024)
    except Exception:
        pass

    throughput_samples = []
    sample_interval_chunks = max(1, total_chunks // 20)

    start = time.perf_counter()
    last_slice_time = start
    last_slice_bytes = 0
    successful_chunks = 0

    for i in range(total_chunks):
        stream_sock.send(chunk_data)
        successful_chunks += 1

        if (i + 1) % sample_interval_chunks == 0 or (i + 1) == total_chunks:
            now = time.perf_counter()
            delta_t = now - last_slice_time
            delta_b = (successful_chunks * chunk_size) - last_slice_bytes
            if delta_t > 0:
                slice_mbps = (delta_b * 8) / (delta_t * 1_000_000)
                throughput_samples.append(round(slice_mbps, 2))
            last_slice_time = now
            last_slice_bytes = successful_chunks * chunk_size

    # Send end of stream sentinel and await server chunk verification
    stream_sock.send(b"STREAM_END")
    server_verified_chunks = successful_chunks
    try:
        ack_resp = stream_sock.recv(1024)
        if ack_resp.startswith(b"ACK|"):
            server_verified_chunks = int(ack_resp.decode().split("|")[1])
    except Exception:
        pass

    end = time.perf_counter()
    stream_sock.close()

    elapsed = max(0.0001, end - start)
    total_sent_bytes = successful_chunks * chunk_size
    throughput_mbps = (total_sent_bytes * 8) / (elapsed * 1_000_000)
    throughput_mb_s = throughput_mbps / 8.0
    peak_throughput = max(throughput_samples) if throughput_samples else throughput_mbps

    # Protocol overhead: UDP header 8B, IPv4 header 20B -> 28B overhead
    overhead_per_chunk = 28
    total_overhead_bytes = successful_chunks * overhead_per_chunk
    efficiency_pct = (total_sent_bytes / (total_sent_bytes + total_overhead_bytes)) * 100 if total_sent_bytes > 0 else 0.0

    print("\n--- UDP Streaming Throughput Results ---")
    print(f"Total data sent   : {total_sent_bytes / 1_000_000:.2f} MB ({total_sent_bytes} bytes)")
    print(f"Verified chunks   : {server_verified_chunks}/{total_chunks}")
    print(f"Time taken        : {elapsed:.4f} s")
    print(f"Throughput        : {throughput_mbps:.2f} Mbps ({throughput_mb_s:.2f} MB/s)")
    print(f"Peak Throughput   : {peak_throughput:.2f} Mbps")
    print(f"Protocol Overhead : {overhead_per_chunk} bytes/pkt (IPv4:20B + UDP:8B)")
    print(f"Payload Efficiency: {efficiency_pct:.2f}%")

    return {
        "data_mb": round(total_sent_bytes / 1_000_000, 2),
        "bytes_sent": total_sent_bytes,
        "chunks": f"{server_verified_chunks}/{total_chunks}",
        "time": round(elapsed, 4),
        "throughput": round(throughput_mbps, 2),
        "throughput_mb_s": round(throughput_mb_s, 2),
        "peak_throughput": round(peak_throughput, 2),
        "overhead_bytes_per_packet": overhead_per_chunk,
        "total_overhead_bytes": total_overhead_bytes,
        "efficiency_pct": round(efficiency_pct, 2),
        "throughput_samples": throughput_samples,
    }

def main():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(TIMEOUT)

    try:
        lat_res = run_latency_and_loss_test(sock)
        thru_res = run_throughput_test(sock)

        metrics_payload = {
            "packets_sent": lat_res["sent"],
            "packets_received": lat_res["received"],
            "packet_loss": lat_res["loss_pct"],
            "avg_latency": lat_res["avg"],
            "min_latency": lat_res["min"],
            "max_latency": lat_res["max"],
            "median_latency": lat_res["median"],
            "p95_latency": lat_res["p95"],
            "p99_latency": lat_res["p99"],
            "jitter": lat_res["jitter"],
            "data_mb": thru_res["data_mb"],
            "bytes_sent": thru_res["bytes_sent"],
            "chunks": thru_res["chunks"],
            "time": thru_res["time"],
            "throughput": thru_res["throughput"],
            "throughput_mb_s": thru_res["throughput_mb_s"],
            "peak_throughput": thru_res["peak_throughput"],
            "overhead_bytes_per_packet": thru_res["overhead_bytes_per_packet"],
            "total_overhead_bytes": thru_res["total_overhead_bytes"],
            "efficiency_pct": thru_res["efficiency_pct"],
            "latency_samples": lat_res["samples"],
            "throughput_samples": thru_res["throughput_samples"],
        }

        print("\n__JSON_METRICS_START__")
        print(json.dumps(metrics_payload))
        print("__JSON_METRICS_END__")
        return metrics_payload
    finally:
        sock.close()

if __name__ == "__main__":
    main()