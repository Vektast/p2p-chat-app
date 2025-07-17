// unified_server.js
// Unified Node.js server combining HTTP static file serving and WebSocket signaling
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');

// Server Configuration with Environment Variable Support
const config = {
    // Primary port configuration
    port: parseInt(process.env.PORT) || parseInt(process.env.HTTP_PORT) || 3000,
    
    // Fallback port range for conflict resolution
    fallbackPortStart: parseInt(process.env.FALLBACK_PORT_START) || 3000,
    fallbackPortEnd: parseInt(process.env.FALLBACK_PORT_END) || 3010,
    
    // Server behavior configuration
    enableCors: process.env.ENABLE_CORS !== 'false', // Default true
    staticPath: process.env.STATIC_PATH || '.',
    logLevel: process.env.LOG_LEVEL || 'info', // info, warn, error
    
    // Connection settings
    maxRetries: parseInt(process.env.MAX_PORT_RETRIES) || 10,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 100
};

// Logging utility based on log level
const log = {
    info: (msg) => config.logLevel === 'info' && console.log(`ℹ️  ${msg}`),
    warn: (msg) => ['info', 'warn'].includes(config.logLevel) && console.warn(`⚠️  ${msg}`),
    error: (msg) => console.error(`❌ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`)
};

// Port availability checker
const isPortAvailable = (port) => {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.listen(port, () => {
            server.once('close', () => resolve(true));
            server.close();
        });
        
        server.on('error', () => resolve(false));
    });
};

// Find available port with fallback logic
const findAvailablePort = async (preferredPort) => {
    log.info(`Checking port availability starting from ${preferredPort}`);
    
    // First try the preferred port
    if (await isPortAvailable(preferredPort)) {
        log.info(`Preferred port ${preferredPort} is available`);
        return preferredPort;
    }
    
    log.warn(`Preferred port ${preferredPort} is not available, searching for alternatives`);
    
    // Try fallback range
    for (let port = config.fallbackPortStart; port <= config.fallbackPortEnd; port++) {
        if (port === preferredPort) continue; // Skip already tested port
        
        if (await isPortAvailable(port)) {
            log.warn(`Using fallback port ${port} instead of ${preferredPort}`);
            return port;
        }
    }
    
    // If no port in range is available, try random ports
    for (let attempt = 0; attempt < config.maxRetries; attempt++) {
        const randomPort = Math.floor(Math.random() * (65535 - 1024)) + 1024;
        if (await isPortAvailable(randomPort)) {
            log.warn(`Using random available port ${randomPort} after ${attempt + 1} attempts`);
            return randomPort;
        }
    }
    
    throw new Error(`No available ports found after checking preferred port, fallback range (${config.fallbackPortStart}-${config.fallbackPortEnd}), and ${config.maxRetries} random attempts`);
};

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Configure Express for static file serving
app.use(express.static('.', {
    index: 'p2p_chat.html'
}));

// Serve the main chat application at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'p2p_chat.html'));
});

// Add CORS headers for cross-origin requests if needed
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Create WebSocket server on the same HTTP server
const wss = new WebSocket.Server({ server });

// WebSocket signaling logic (ported from existing signaling_server.js)
const generateUniqueId = () => '_' + Math.random().toString(36).substring(2, 11);
const clients = new Map(); // Map<string, WebSocket>

console.log(`Unified P2P Chat Server starting...`);
console.log(`HTTP Server will serve static files from: ${__dirname}`);
console.log(`WebSocket Server will handle signaling on the same port`);

wss.on('connection', (ws, req) => {
    const clientId = generateUniqueId();
    ws.id = clientId;
    
    // Detect device type from User-Agent header
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    ws.deviceType = isMobile ? 'mobile' : 'desktop';
    
    clients.set(clientId, ws);

    console.log(`Új kliens csatlakozott: ${clientId} (Összesen: ${clients.size})`);

    // Send client their own ID
    ws.send(JSON.stringify({ type: 'id', id: clientId }));

    // Notify other clients about the new peer with device type information
    clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ 
                type: 'discover', 
                id: clientId,
                deviceType: ws.deviceType || 'unknown'
            }));
        }
    });

    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);

        // Forward message to target client
        if (message.dest) {
            const targetClient = clients.get(message.dest);
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                let payloadToSend = { id: clientId };
                if (message.data && message.data.sdp) payloadToSend.sdp = message.data.sdp;
                if (message.data && message.data.candidate) payloadToSend.candidate = message.data.candidate;
                if (message.data && message.data.name) payloadToSend.name = message.data.name;

                console.log(`Továbbítás ${clientId}-tól -> ${message.dest}-nek`);
                targetClient.send(JSON.stringify(payloadToSend));
            } else {
                console.log(`Célkliens (${message.dest}) nem található vagy nem nyitott.`);
            }
        } else {
            console.log(`Ismeretlen formátumú üzenet ${clientId}-tól, 'dest' nélkül:`, message);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Kliens (${clientId}) lecsatlakozott. Maradt: ${clients.size}`);
        
        // Notify other clients about disconnection
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'user_left', id: clientId }));
            }
        });
    });

    ws.on('error', (err) => {
        console.error(`Hiba a klienssel (${clientId}):`, err.message);
    });
});

wss.on('error', (err) => {
    console.error('WebSocket szerver hiba:', err);
});

// Start the unified server with port management
const startServer = async () => {
    try {
        const availablePort = await findAvailablePort(config.port);
        
        server.listen(availablePort, () => {
            log.success(`=====================================`);
            log.success(`🚀 Unified P2P Chat Server running!`);
            log.success(`📁 HTTP Server: http://localhost:${availablePort}`);
            log.success(`🔌 WebSocket Server: ws://localhost:${availablePort}`);
            log.success(`📱 Chat application: http://localhost:${availablePort}/p2p_chat.html`);
            log.success(`=====================================`);
            
            if (availablePort !== config.port) {
                log.warn(`Note: Using port ${availablePort} instead of preferred port ${config.port}`);
            }
        });
        
    } catch (error) {
        log.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

// Graceful shutdown handling
process.on('SIGINT', () => {
    console.log('\n🛑 Szerver leállítása...');
    
    // Close all WebSocket connections
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.close();
        }
    });
    
    // Close WebSocket server
    wss.close(() => {
        console.log('✅ WebSocket szerver leállítva');
    });
    
    // Close HTTP server
    server.close(() => {
        console.log('✅ HTTP szerver leállítva');
        console.log('👋 Viszlát!');
        process.exit(0);
    });
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        log.error(`Port ${config.port} is already in use!`);
        log.error(`Try using a different port: PORT=3001 node unified_server.js`);
        log.error(`Or let the server find an available port automatically`);
    } else {
        log.error(`Server error: ${err.message}`);
    }
    process.exit(1);
});