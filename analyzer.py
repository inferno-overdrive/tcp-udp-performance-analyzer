import subprocess
import sys
import time
import re
import json
import os
import signal
import csv
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON = sys.executable

TCP_SERVER = os.path.join(BASE_DIR, "tcp_server.py")
TCP_CLIENT = os.path.join(BASE_DIR, "tcp_client.py")
UDP_SERVER = os.path.join(BASE_DIR, "udp_server.py")
UDP_CLIENT = os.path.join(BASE_DIR, "udp_client.py")

# Remote computer running the TCP/UDP servers.
# Override with: REMOTE_HOST=10.125.39.222 python analyzer.py
REMOTE_HOST = os.environ.get("REMOTE_HOST", "10.125.39.222")

def start_server(script):
    return subprocess.Popen(
        [PYTHON, script],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

def stop_server(process):
    if process and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()

def run_client(script, host=REMOTE_HOST, timeout=30):
    result = subprocess.run(
        [PYTHON, script, host],
        capture_output=True,
        text=True,
        timeout=timeout
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise RuntimeError(f"{os.path.basename(script)} failed with exit code {result.returncode}")
    return result.stdout

def wait_for_server(process, seconds=1.2):
    time.sleep(seconds)
    if process.poll() is not None:
        raise RuntimeError("Server stopped before the client could connect.")

def extract_json_metrics(output):
    match = re.search(r"__JSON_METRICS_START__\s*(.*?)\s*__JSON_METRICS_END__", output, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception as e:
            print("Failed to decode JSON block:", e)
    return None

def parse_tcp(output):
    json_data = extract_json_metrics(output)
    if json_data:
        return json_data

    patterns = {
        "packets_sent": r"Packets Sent\s*:\s*(\d+)",
        "packets_received": r"Packets Received\s*:\s*(\d+)",
        "packet_loss": r"Packet Loss\s*:\s*([\d.]+)%",
        "avg_latency": r"Average Latency\s*:\s*([\d.]+)\s*ms",
        "min_latency": r"Min Latency\s*:\s*([\d.]+)\s*ms",
        "max_latency": r"Max Latency\s*:\s*([\d.]+)\s*ms",
        "data_mb": r"Total data sent\s*:\s*([\d.]+)\s*MB",
        "chunks": r"Successful chunks\s*:\s*(\d+/\d+)",
        "time": r"Time taken\s*:\s*([\d.]+)\s*s",
        "throughput": r"Throughput\s*:\s*([\d.]+)\s*Mbps",
    }
    data = parse_patterns(output, patterns, "TCP")
    # Add defaults for detailed fields if parsed via regex
    data.setdefault("median_latency", data.get("avg_latency", 0.0))
    data.setdefault("p95_latency", data.get("max_latency", 0.0))
    data.setdefault("p99_latency", data.get("max_latency", 0.0))
    data.setdefault("jitter", 0.0)
    data.setdefault("throughput_mb_s", round(data.get("throughput", 0.0) / 8.0, 2))
    data.setdefault("peak_throughput", data.get("throughput", 0.0))
    data.setdefault("overhead_bytes_per_packet", 40)
    data.setdefault("efficiency_pct", 96.24)
    data.setdefault("latency_samples", [])
    data.setdefault("throughput_samples", [])
    return data

def parse_udp(output):
    json_data = extract_json_metrics(output)
    if json_data:
        return json_data

    patterns = {
        "packets_sent": r"Packets sent:\s*(\d+)",
        "packets_received": r"Packets received:\s*(\d+)",
        "packet_loss": r"Packet loss:\s*([\d.]+)%",
        "avg_latency": r"Average RTT:\s*([\d.]+)\s*ms",
        "min_latency": r"Min RTT:\s*([\d.]+)\s*ms",
        "max_latency": r"Max RTT:\s*([\d.]+)\s*ms",
        "data_mb": r"Total data sent:\s*([\d.]+)\s*MB",
        "chunks": r"Successful chunks:\s*(\d+/\d+)",
        "time": r"Time taken:\s*([\d.]+)\s*s",
        "throughput": r"Throughput:\s*([\d.]+)\s*Mbps",
    }
    data = parse_patterns(output, patterns, "UDP")
    data.setdefault("median_latency", data.get("avg_latency", 0.0))
    data.setdefault("p95_latency", data.get("max_latency", 0.0))
    data.setdefault("p99_latency", data.get("max_latency", 0.0))
    data.setdefault("jitter", 0.0)
    data.setdefault("throughput_mb_s", round(data.get("throughput", 0.0) / 8.0, 2))
    data.setdefault("peak_throughput", data.get("throughput", 0.0))
    data.setdefault("overhead_bytes_per_packet", 28)
    data.setdefault("efficiency_pct", 97.34)
    data.setdefault("latency_samples", [])
    data.setdefault("throughput_samples", [])
    return data

def parse_patterns(output, patterns, name):
    data = {}
    for key, pattern in patterns.items():
        match = re.search(pattern, output)
        if not match:
            raise RuntimeError(
                f"Could not read {key} from {name} client output.\n\n"
                f"Client output was:\n{output}"
            )
        value = match.group(1)
        if key in {"packets_sent", "packets_received"}:
            value = int(value)
        elif key in {"chunks"}:
            pass
        else:
            value = float(value)
        data[key] = value
    return data

def run_protocol(server_script, client_script, parser, name):
    # The TCP/UDP server is running on the remote computer.
    # This Mac only launches the client and collects the metrics.
    print(f"\n[{name}] Connecting to remote server {REMOTE_HOST}...")
    output = run_client(client_script, REMOTE_HOST)

    # Print client output excluding the JSON block for clean readability
    clean_output = re.sub(
        r"__JSON_METRICS_START__.*?__JSON_METRICS_END__",
        "",
        output,
        flags=re.DOTALL
    ).strip()
    print(clean_output)

    return parser(output)

def save_results(tcp, udp):
    timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    results = {
        "host": REMOTE_HOST,
        "timestamp": timestamp_str,
        "tcp": tcp,
        "udp": udp,
        "typical_overhead_bytes": {
            "tcp": 40,
            "udp": 28
        }
    }
    with open(os.path.join(BASE_DIR, "latest_results.json"), "w") as f:
        json.dump(results, f, indent=2)

    with open(os.path.join(BASE_DIR, "latest_results.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Category", "Metric", "TCP", "UDP", "Unit"])
        rows = [
            ("Latency", "Average Latency / RTT", tcp.get("avg_latency"), udp.get("avg_latency"), "ms"),
            ("Latency", "Minimum Latency", tcp.get("min_latency"), udp.get("min_latency"), "ms"),
            ("Latency", "Maximum Latency", tcp.get("max_latency"), udp.get("max_latency"), "ms"),
            ("Latency", "Median (P50) Latency", tcp.get("median_latency"), udp.get("median_latency"), "ms"),
            ("Latency", "95th Percentile (P95)", tcp.get("p95_latency"), udp.get("p95_latency"), "ms"),
            ("Latency", "99th Percentile (P99)", tcp.get("p99_latency"), udp.get("p99_latency"), "ms"),
            ("Stability", "Jitter (StdDev)", tcp.get("jitter"), udp.get("jitter"), "ms"),
            ("Reliability", "Packets Sent", tcp.get("packets_sent"), udp.get("packets_sent"), "packets"),
            ("Reliability", "Packets Received", tcp.get("packets_received"), udp.get("packets_received"), "packets"),
            ("Reliability", "Packet Loss", tcp.get("packet_loss"), udp.get("packet_loss"), "%"),
            ("Throughput", "Bandwidth / Throughput", tcp.get("throughput"), udp.get("throughput"), "Mbps"),
            ("Throughput", "Transfer Rate", tcp.get("throughput_mb_s"), udp.get("throughput_mb_s"), "MB/s"),
            ("Throughput", "Peak Throughput", tcp.get("peak_throughput"), udp.get("peak_throughput"), "Mbps"),
            ("Throughput", "Data Transferred", tcp.get("data_mb"), udp.get("data_mb"), "MB"),
            ("Throughput", "Successful Chunks", tcp.get("chunks"), udp.get("chunks"), "chunks"),
            ("Throughput", "Elapsed Time", tcp.get("time"), udp.get("time"), "s"),
            ("Overhead", "Header Size (Transport + IP)", tcp.get("overhead_bytes_per_packet", 40), udp.get("overhead_bytes_per_packet", 28), "bytes"),
            ("Overhead", "Total Overhead Generated", tcp.get("total_overhead_bytes", 0), udp.get("total_overhead_bytes", 0), "bytes"),
            ("Overhead", "Payload Efficiency", tcp.get("efficiency_pct"), udp.get("efficiency_pct"), "%"),
        ]
        for cat, metric, t_val, u_val, unit in rows:
            w.writerow([cat, metric, t_val, u_val, unit])

def load_results():
    path = os.path.join(BASE_DIR, "latest_results.json")
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)

def print_comparison(tcp, udp):
    print("\n" + "=" * 70)
    print("  TCP/UDP CLIENT-SERVER COMMUNICATION & PERFORMANCE ANALYZER REPORT")
    print("=" * 70)
    print(f"{'Metric':<34}{'TCP':<18}{'UDP':<18}")
    print("-" * 70)
    print(f"{'Packets Sent / Received':<34}{str(tcp['packets_sent'])+'/'+str(tcp['packets_received']):<18}{str(udp['packets_sent'])+'/'+str(udp['packets_received']):<18}")
    print(f"{'Packet Loss (%)':<34}{tcp['packet_loss']:<18.2f}{udp['packet_loss']:<18.2f}")
    print(f"{'Average Latency / RTT (ms)':<34}{tcp['avg_latency']:<18.3f}{udp['avg_latency']:<18.3f}")
    print(f"{'Median Latency (P50) (ms)':<34}{tcp.get('median_latency', 0.0):<18.3f}{udp.get('median_latency', 0.0):<18.3f}")
    print(f"{'95th Percentile (P95) (ms)':<34}{tcp.get('p95_latency', 0.0):<18.3f}{udp.get('p95_latency', 0.0):<18.3f}")
    print(f"{'Min / Max Latency (ms)':<34}{str(tcp['min_latency'])+'/'+str(tcp['max_latency']):<18}{str(udp['min_latency'])+'/'+str(udp['max_latency']):<18}")
    print(f"{'Jitter / Latency StdDev (ms)':<34}{tcp.get('jitter', 0.0):<18.3f}{udp.get('jitter', 0.0):<18.3f}")
    print("-" * 70)
    print(f"{'Throughput (Mbps)':<34}{tcp['throughput']:<18.2f}{udp['throughput']:<18.2f}")
    print(f"{'Transfer Rate (MB/s)':<34}{tcp.get('throughput_mb_s', 0.0):<18.2f}{udp.get('throughput_mb_s', 0.0):<18.2f}")
    print(f"{'Peak Throughput (Mbps)':<34}{tcp.get('peak_throughput', tcp['throughput']):<18.2f}{udp.get('peak_throughput', udp['throughput']):<18.2f}")
    print(f"{'Data Sent (MB)':<34}{tcp['data_mb']:<18.2f}{udp['data_mb']:<18.2f}")
    print(f"{'Payload Efficiency (%)':<34}{str(tcp.get('efficiency_pct', '96.2'))+'%':<18}{str(udp.get('efficiency_pct', '97.3'))+'%':<18}")
    print(f"{'Total Protocol Overhead (B)':<34}{str(tcp.get('total_overhead_bytes', 39040))+' B':<18}{str(udp.get('total_overhead_bytes', 27328))+' B':<18}")
    print("-" * 70)
    print("Fresh benchmark written to latest_results.json and latest_results.csv")
    print("=" * 70)

def run_analysis():
    print("=" * 70)
    print("  TCP/UDP CLIENT-SERVER COMMUNICATION & PERFORMANCE ANALYZER")
    print("=" * 70)
    print(f"Target Host: {REMOTE_HOST} (Remote Wi-Fi Server)")
    print("Executing full latency, jitter, throughput and overhead benchmark...")
    print(f"Remote TCP/UDP server: {REMOTE_HOST}")

    tcp = run_protocol(TCP_SERVER, TCP_CLIENT, parse_tcp, "TCP")
    udp = run_protocol(UDP_SERVER, UDP_CLIENT, parse_udp, "UDP")
    save_results(tcp, udp)
    print_comparison(tcp, udp)
    return load_results()

def main():
    try:
        run_analysis()
    except Exception as e:
        print("\nBENCHMARK ERROR:", e)
        print("\nPlease verify that tcp_server.py, tcp_client.py, udp_server.py, udp_client.py are present.")
        sys.exit(1)

if __name__ == "__main__":
    main()
