// signaling_server.js
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080; // Használhatsz más portot is, ha a 8080 foglalt

const wss = new WebSocket.Server({ port: PORT });

// Egyszerű ID generátor
const generateUniqueId = () => '_' + Math.random().toString(36).substr(2, 9);

// Tároljuk a klienseket (ID alapján)
const clients = new Map(); // Map<string, WebSocket>

console.log(`WebSocket Szignál Szerver fut a ws://localhost:${PORT} címen`);

wss.on('connection', (ws) => {
    const clientId = generateUniqueId();
    ws.id = clientId; // Hozzárendeljük az ID-t a ws objektumhoz
    clients.set(clientId, ws);

    console.log(`Új kliens csatlakozott: ${clientId} (Összesen: ${clients.size})`);

    // Küldjük el a kliensnek a saját ID-ját (opcionális, de hasznos lehet debuggoláshoz)
    // A mi kliens kódunk ezt jelenleg nem használja fel, de jó ha van.
    ws.send(JSON.stringify({ type: 'id', id: clientId }));

    // Értesítsük a többi klienst az új peer-ről (a mi kliensünk 'discover' üzenetet vár)
    clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'discover', id: clientId }));
        }
    });

    ws.on('message', (messageAsString) => {
        const message = JSON.parse(messageAsString);
        // console.log(`Üzenet érkezett ${clientId}-tól:`, message);

        // Üzenet továbbítása a célkliensnek (ha van 'dest' tulajdonság)
        // A mi kliensünk így küldi: { dest: 'targetClientId', data: { sdp: ..., name: ... } }
        // Vagy                     { dest: 'targetClientId', data: { candidate: ... } }
        if (message.dest) {
            const targetClient = clients.get(message.dest);
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
                // A kliens a küldő ID-ját 'id' mezőként várja, az adatot pedig 'data'-ban
                // (vagy közvetlenül sdp/candidate-ként, a mi kliensünk a message.sdp, message.candidate stb. formátumot preferálja)
                // A glitch szerver a küldő ID-ját 'id'-ként adja vissza, és a 'data'-t is.
                // Tehát a küldeménynek így kell kinéznie a fogadó oldalon: { id: senderId, sdp: ..., name: ... }
                // vagy { id: senderId, candidate: ... }
                // A `message.data` tartalmazza az sdp-t/candidate-et és a nevet.
                
                let payloadToSend = { id: clientId }; // A küldő ID-ja
                if (message.data && message.data.sdp) payloadToSend.sdp = message.data.sdp;
                if (message.data && message.data.candidate) payloadToSend.candidate = message.data.candidate;
                if (message.data && message.data.name) payloadToSend.name = message.data.name; // A nevet is továbbítjuk

                // Ha a kliens közvetlenül sdp/candidate-et várna a data objektum nélkül:
                // if (message.data && message.data.sdp) {
                //     targetClient.send(JSON.stringify({ id: clientId, sdp: message.data.sdp, name: message.data.name }));
                // } else if (message.data && message.data.candidate) {
                //     targetClient.send(JSON.stringify({ id: clientId, candidate: message.data.candidate }));
                // }
                console.log(`Továbbítás ${clientId}-tól -> ${message.dest}-nek: `, payloadToSend);
                targetClient.send(JSON.stringify(payloadToSend));

            } else {
                console.log(`Célkliens (${message.dest}) nem található vagy nem nyitott.`);
            }
        } else {
            // Ha nincs 'dest', akkor ez egy broadcast üzenet lehetne, de a mi logikánkban
            // a kliens közvetlenül a peer-eknek küld, nem a szerveren keresztül broadcastol adatot.
            // A 'discover' az egyetlen szerver oldali broadcast.
            console.log(`Ismeretlen formátumú üzenet ${clientId}-tól, 'dest' nélkül:`, message);
        }
    });

    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Kliens (${clientId}) lecsatlakozott. Maradt: ${clients.size}`);
        // Értesítsük a többi klienst a lecsatlakozásról (opcionális, a kliensünk ICE state alapján is kezeli)
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'user_left', id: clientId }));
            }
        });
    });

    ws.on('error', (err) => {
        console.error(`Hiba a klienssel (${clientId}):`, err.message);
        // A 'close' eseményt is kiváltja általában
    });
});

wss.on('error', (err) => {
    console.error('Szignál szerver hiba:', err);
});