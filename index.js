const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore,
    generateWAMessageFromContent,
    proto
} = require('@whiskeysockets/baileys');
const crypto = require('crypto'); // Ranje erè "crypto is not defined"
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 5000;
let globalSock = null;

app.use(express.json());

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

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
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        printQRInTerminal: false,
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

        // Egzanp Kòmand Menu ak BOUTON
        if (text === config.PREFIX + 'menu') {
            const buttons = [
                { buttonId: '.ping', buttonText: { displayText: '⚡ SPEED' }, type: 1 },
                { buttonId: '.owner', buttonText: { displayText: '👤 OWNER' }, type: 1 }
            ];

            const buttonMessage = {
                text: `Bonjour! Chwazi yon opsyon nan ${config.BOT_NAME}:`,
                footer: "© Edwa-MD",
                buttons: buttons,
                headerType: 1
            };
            await sock.sendMessage(from, buttonMessage);
        }
    });
}

app.listen(PORT, '0.0.0.0', () => { startBot(); });

