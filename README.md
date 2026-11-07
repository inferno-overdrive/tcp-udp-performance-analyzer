# TCP/UDP Client-Server Performance Analyzer

A Python-based client-server application designed to benchmark and compare the performance of TCP and UDP transport layer protocols through an interactive web dashboard.

## Overview

The TCP/UDP Performance Analyzer evaluates the behavior of TCP and UDP communication by conducting network performance tests and presenting the results through a web-based dashboard.

The application measures important network performance parameters, including latency, throughput, jitter, packet loss, reliability and protocol overhead.

It provides a visual comparison of both protocols, helping users understand their performance characteristics under the tested network conditions.

## Features

- **TCP Performance Testing:** Measures TCP communication performance using client-server socket programming.
- **UDP Performance Testing:** Evaluates connectionless UDP communication.
- **Latency Analysis:** Calculates average, minimum, maximum, median (P50), P95 and P99 latency.
- **Throughput Measurement:** Measures network throughput, transfer speed and peak throughput.
- **Packet Loss Monitoring:** Tracks sent and received packets to calculate packet loss.
- **Jitter Analysis:** Measures variations in packet response times.
- **Protocol Overhead:** Estimates TCP and UDP header overhead and payload efficiency.
- **Interactive Dashboard:** Displays TCP and UDP performance metrics through a web interface.
- **Data Export:** Supports exporting benchmark results in JSON and CSV formats.

## Technologies Used

| Component | Technology |
|---|---|
| Backend | Python |
| Networking | Python Socket Programming |
| Frontend | HTML5, CSS3, JavaScript |
| API | Python HTTP Server |
| Data Storage | JSON and CSV |
| Protocols | TCP and UDP |

## Project Structure

```text
tcp-udp-performance-analyzer/
│
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── backend/
│   ├── analyzer.py
│   ├── server.py
│   ├── tcp_client.py
│   ├── tcp_server.py
│   ├── udp_client.py
│   ├── udp_server.py
│   ├── start_analyzer.bat
│   ├── latest_results.json  # generated locally; ignored by Git
│   └── latest_results.csv   # generated locally; ignored by Git
│
├── .gitignore
├── README.md
└── LICENSE
```

## How It Works

1. TCP and UDP servers listen for incoming client connections.
2. The respective clients send test packets to the server.
3. The application performs latency, reliability and throughput tests.
4. Performance metrics are calculated and collected by the analyzer.
5. The backend provides the collected results through HTTP API endpoints.
6. The frontend dashboard displays a comparison of TCP and UDP performance.
7. Results can be exported in JSON and CSV formats.

## Installation and Setup

### Prerequisites

- Python 3 installed.
- Git installed.
- Two computers connected to the same network (for remote testing), or one computer for local testing.

### 1. Clone the Repository

```bash
git clone https://github.com/inferno-overdrive/tcp-udp-performance-analyzer.git
```

```bash
cd tcp-udp-performance-analyzer
```

### 2. Configure the Server

On the computer that will act as the TCP/UDP server, open two terminals.

Start the TCP server:

```bash
python backend/tcp_server.py
```

Start the UDP server in another terminal:

```bash
python backend/udp_server.py
```

### 3. Configure the Target Host

Set the IP address of the computer running the TCP and UDP servers.

On macOS/Linux:

```bash
export REMOTE_HOST="127.0.0.1"
```

On Windows PowerShell:

```powershell
$env:REMOTE_HOST="127.0.0.1"
```

Replace `127.0.0.1` with the server computer's LAN IP address when testing across two computers.

### 4. Start the Web Application

```bash
python backend/server.py
```

Open the following URL in your browser:

```text
http://127.0.0.1:8080
```

### 5. Run the Benchmark

- Open the dashboard.
- Check the server connectivity indicators.
- Click the Run Benchmark button.
- Wait for the TCP and UDP tests to complete.
- View the performance comparison.
- Export the results in JSON or CSV format.

**Note:** Allow TCP port 5002 and UDP port 5001 through the server computer's firewall when testing across devices.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Checks backend availability |
| GET | `/api/connectivity` | Checks network connectivity |
| GET | `/api/results` | Retrieves benchmark results |
| GET | `/api/status` | Retrieves test execution status |
| POST | `/api/run` | Executes the benchmark |

## Performance Metrics

The application evaluates the following parameters:

- Latency (ms)
- Throughput (Mbps)
- Packet Loss (%)
- Jitter (ms)
- Communication Overhead (Bytes)
- Payload Efficiency (%)
- Packet Delivery and Reliability

## Learning Outcomes

This project demonstrates practical implementation of:

- TCP and UDP socket programming.
- Client-server communication.
- Transport layer protocol comparison.
- Network performance measurement.
- Python backend development.
- Frontend and backend integration.
- Performance data processing and visualization.

## Future Improvements

- Support for configurable packet sizes and test durations.
- Historical benchmark tracking.
- Multiple network testing environments.
- Automated performance report generation.
- Additional network performance visualizations.

## License

This project is licensed under the MIT License.

---

**Project:** TCP/UDP Client-Server Communication and Performance Analyzer

**Domain:** Computer Networks | Transport Layer | Network Performance Analysis
