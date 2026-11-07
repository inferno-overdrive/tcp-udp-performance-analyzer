import socket
import time
import statistics
import sys

SERVER_HOST = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
SERVER_PORT = 5002


client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    client.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 2 * 1024 * 1024)
    client.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 2 * 1024 * 1024)
    client.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
except Exception:
    pass
client.connect((SERVER_HOST, SERVER_PORT))

print("Connected to TCP server")


PACKETS = 100
MESSAGE = b"Hello TCP Performance Test"

latencies = []
packets_sent = 0
packets_received = 0

for i in range(PACKETS):

    start = time.perf_counter()

    client.sendall(MESSAGE)
    packets_sent += 1

    response = client.recv(1024)

    end = time.perf_counter()

    if response:
        packets_received += 1

        latency = (end - start) * 1000
        latencies.append(latency)


average_latency = statistics.mean(latencies)
min_latency = min(latencies)
max_latency = max(latencies)

packet_loss = (
    (packets_sent - packets_received)
    / packets_sent
) * 100



TOTAL_DATA = 1_000_000
CHUNK_SIZE = 1024

data = b"x" * CHUNK_SIZE
total_chunks = TOTAL_DATA // CHUNK_SIZE
expected_bytes = total_chunks * CHUNK_SIZE

throughput_samples = []
sample_interval = max(1, total_chunks // 20)

throughput_start = time.perf_counter()
last_slice_time = throughput_start
last_slice_bytes = 0

# 1. Send all chunks back-to-back using sendall() in a loop, with no recv() call between chunks
for i in range(total_chunks):
    client.sendall(data)
    if (i + 1) % sample_interval == 0 or (i + 1) == total_chunks:
        now = time.perf_counter()
        delta_t = now - last_slice_time
        delta_b = ((i + 1) * CHUNK_SIZE) - last_slice_bytes
        if delta_t > 0:
            slice_mbps = (delta_b * 8) / (delta_t * 1_000_000)
            throughput_samples.append(round(slice_mbps, 2))
        last_slice_time = now
        last_slice_bytes = (i + 1) * CHUNK_SIZE

# 2. After all chunks are sent, drain whatever has been echoed back in a single loop that reads until the expected total byte count is received (or a timeout is hit)
received_bytes = 0
client.settimeout(5.0)
try:
    while received_bytes < expected_bytes:
        chunk = client.recv(min(65536, expected_bytes - received_bytes))
        if not chunk:
            break
        received_bytes += len(chunk)
except socket.timeout:
    pass

# 3. Compute elapsed time from the start of sending to the end of that final drain
throughput_end = time.perf_counter()

elapsed_time = max(0.0001, throughput_end - throughput_start)
total_bytes = received_bytes
successful_chunks = received_bytes // CHUNK_SIZE

throughput_mbps = (
    total_bytes * 8
) / elapsed_time / 1_000_000
throughput_mb_s = throughput_mbps / 8.0
peak_throughput = max(throughput_samples) if throughput_samples else throughput_mbps

# Statistical percentiles & metrics
median_latency = statistics.median(latencies) if latencies else average_latency
sorted_lat = sorted(latencies) if latencies else [0.0]
p95_latency = sorted_lat[min(int(len(sorted_lat) * 0.95), len(sorted_lat) - 1)]
p99_latency = sorted_lat[min(int(len(sorted_lat) * 0.99), len(sorted_lat) - 1)]
jitter = statistics.stdev(latencies) if len(latencies) > 1 else 0.0

overhead_per_chunk = 40  # IPv4: 20B + TCP: 20B
total_overhead_bytes = successful_chunks * overhead_per_chunk
efficiency_pct = (total_bytes / (total_bytes + total_overhead_bytes)) * 100 if total_bytes > 0 else 0.0

print("\n========== TCP RESULTS ==========")

print(f"Packets Sent      : {packets_sent}")
print(f"Packets Received  : {packets_received}")
print(f"Packet Loss       : {packet_loss:.2f}%")

print(f"Average Latency   : {average_latency:.3f} ms")
print(f"Min Latency       : {min_latency:.3f} ms")
print(f"Max Latency       : {max_latency:.3f} ms")
print(f"Median (P50)      : {median_latency:.3f} ms")
print(f"95th Percentile   : {p95_latency:.3f} ms")
print(f"99th Percentile   : {p99_latency:.3f} ms")
print(f"Jitter (StdDev)   : {jitter:.3f} ms")

print("\n--- Throughput Results ---")

print(f"Total data sent   : {total_bytes / 1_000_000:.2f} MB")
print(f"Successful chunks : {successful_chunks}/{total_chunks}")
print(f"Time taken        : {elapsed_time:.4f} s")
print(f"Throughput        : {throughput_mbps:.2f} Mbps ({throughput_mb_s:.2f} MB/s)")
print(f"Peak Throughput   : {peak_throughput:.2f} Mbps")
print(f"Protocol Overhead : {overhead_per_chunk} bytes/pkt (IPv4:20B + TCP:20B)")
print(f"Payload Efficiency: {efficiency_pct:.2f}%")

print("\n=================================")

import json
metrics_payload = {
    "packets_sent": packets_sent,
    "packets_received": packets_received,
    "packet_loss": round(packet_loss, 2),
    "avg_latency": round(average_latency, 3),
    "min_latency": round(min_latency, 3),
    "max_latency": round(max_latency, 3),
    "median_latency": round(median_latency, 3),
    "p95_latency": round(p95_latency, 3),
    "p99_latency": round(p99_latency, 3),
    "jitter": round(jitter, 3),
    "data_mb": round(total_bytes / 1_000_000, 2),
    "bytes_sent": total_bytes,
    "chunks": f"{successful_chunks}/{total_chunks}",
    "time": round(elapsed_time, 4),
    "throughput": round(throughput_mbps, 2),
    "throughput_mb_s": round(throughput_mb_s, 2),
    "peak_throughput": round(peak_throughput, 2),
    "overhead_bytes_per_packet": overhead_per_chunk,
    "total_overhead_bytes": total_overhead_bytes,
    "efficiency_pct": round(efficiency_pct, 2),
    "latency_samples": [round(l, 4) for l in latencies[::max(1, len(latencies) // 50)]],
    "throughput_samples": throughput_samples,
}

print("\n__JSON_METRICS_START__")
print(json.dumps(metrics_payload))
print("__JSON_METRICS_END__")

client.close()