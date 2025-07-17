# Modern P2P Chat & File Sharing Application

A lightweight, browser-based peer-to-peer chat and file sharing application that enables direct communication between users without relying on centralized servers for data exchange.

![P2P Chat Application](https://via.placeholder.com/800x400?text=P2P+Chat+Application)

## Features

- **Real-time P2P Messaging**: Direct browser-to-browser communication
- **File Sharing**: Transfer files directly between peers
- **WebRTC Technology**: Secure, encrypted connections
- **Mobile Support**: Responsive design works on smartphones and tablets
- **No Data Routing**: Messages and files are transmitted directly between peers
- **Hungarian Interface**: Multi-language support
- **Automatic Peer Discovery**: Easy connection to other users
- **No Account Required**: Generate random names for quick access

## How It Works

The application uses a hybrid architecture:
- **Signaling Server**: A lightweight Node.js WebSocket server for initial peer discovery and WebRTC handshake
- **P2P Communication**: Direct browser-to-browser connections using WebRTC data channels
- **No Central Storage**: All messages and files are transmitted directly between peers

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- A modern web browser with WebRTC support (Chrome, Firefox, Edge, Safari)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vektast/p2p-chat-app.git
   cd p2p-chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the application**
   
   On Windows:
   ```bash
   start_chat_app.bat
   ```
   
   Or manually:
   ```bash
   node unified_server.js
   ```

4. **Access the application**
   
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

### Configuration Options

The server supports various environment variables for configuration:

- `PORT`: Primary HTTP/WebSocket port (default: 3000)
- `FALLBACK_PORT_START` and `FALLBACK_PORT_END`: Port range for automatic fallback (default: 3000-3010)
- `ENABLE_CORS`: Enable Cross-Origin Resource Sharing (default: true)
- `LOG_LEVEL`: Logging verbosity - 'info', 'warn', or 'error' (default: 'info')

Example:
```bash
PORT=8080 LOG_LEVEL=warn node unified_server.js
```

## Usage

1. **Open the application** in your browser
2. **Wait for the connection** to the signaling server
3. **Share the URL** with others to join the chat
4. **Select a recipient** from the peer list or broadcast to everyone
5. **Send messages** or files directly to peers
6. **Accept or reject** incoming file transfers

## Local Network Usage

For local network usage, share your local IP address with others:

```
http://YOUR_LOCAL_IP:3000
```

Replace `YOUR_LOCAL_IP` with your computer's local IP address (e.g., 192.168.1.100).

## Security Considerations

- All WebRTC connections are encrypted by default
- No data is stored on any server
- The signaling server only facilitates initial connections
- File transfers require explicit user permission (can be set to auto-accept)

## Development

### Project Structure

```
/
├── p2p_chat.html         # Main application (HTML, CSS, JavaScript)
├── unified_server.js     # Combined HTTP and WebSocket server
├── start_chat_app.bat    # Windows startup script
├── package.json          # Node.js dependencies
└── README.md             # Documentation
```

### Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js with Express and WebSocket (ws library)
- **Communication**: WebRTC for peer-to-peer connections
- **Styling**: CSS Custom Properties, Responsive Design

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.