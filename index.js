require('dotenv').config(); // Pèmèt li li fichye .env la
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const crypto = require('crypto'); 
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;
let globalSock = null;

app.use(express.json());

// Sèvi paj HTML la
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

// API pou Pairing Code (pou sit web la)
app.post('/api/pair', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.json({ success: false, error: 'Nimewo obligatwa' });
    try {
        if (!globalSock) return res.json({ success: false, error: 'Bot la ap demare...' });
        const code = await globalSock.requestPairingCode(phone.trim());
        res.json({ success: true, code: code });
    } catch (e) { res.json({ success: false, error: e.message }); }
});

async function startBot() {
    // KREYE FOLDER AUTH SI L PA EGZISTE
    if (!fs.existsSync('./auth')) { fs.mkdirSync('./auth'); }

    // DEKODE SESSION_ID SI L NAN .ENV POU EVITE RE-SKANE
    if (process.env.SESSION_ID && !fs.existsSync('./auth/creds.json')) {
        try {
            console.log("🛠️ Restaurasyon sesyon depi nan .env...");
            const base64Data = process.env.SESSION_ID.includes(';;;') 
                ? process.env.SESSION_ID.split(';;;')[1] 
                : process.env.SESSION_ID;
            fs.writeFileSync('./auth/creds.json', Buffer.from(base64Data, 'base64').toString());
            console.log("✅ Sesyon restore ak siksè!");
        } catch (e) {
            console.error("❌ Erè nan lekti SESSION_ID:", e.message);
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    globalSock = sock;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(startBot, 5000);
            }
        } else if (connection === 'open') {
            console.log("🚀 EDWA-MD ONLINE SOU PANEL LAN!");
            // Voye Session ID a bay owner si se premye fwa li konekte
            const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
            if (!process.env.SESSION_ID) {
                const credsData = fs.readFileSync('./auth/creds.json', 'utf-8');
                const sessionID = Buffer.from(credsData).toString('base64');
                await sock.sendMessage(ownerJid, { text: `EDWA-MD;;;${sessionID}` });
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

        const prefix = process.env.PREFIX || config.PREFIX;

        if (text === prefix + 'menu') {
            const buttons = [
                { buttonId: prefix + 'ping', buttonText: { displayText: '⚡ SPEED' }, type: 1 },
                { buttonId: prefix + 'owner', buttonText: { displayText: '👤 OWNER' }, type: 1 }
            ];

            await sock.sendMessage(from, {
                text: `Bonjour! Chwazi yon opsyon nan ${process.env.BOT_NAME || config.BOT_NAME || 'EDWA-MD'}:`,
                footer: "© Edwa-MD",
                buttons: buttons,
                headerType: 1
            });
        }
    });
}

app.listen(PORT, '0.0.0.0', () => { startBot(); });

