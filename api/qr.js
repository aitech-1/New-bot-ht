import { NowRequest, NowResponse } from '@vercel/node';
import QRCode from 'qrcode';

export default async (req: NowRequest, res: NowResponse) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sessionId = Date.now(); // Generate a unique session ID based on time

    const qrCodeUrl = `http://your-server.com/qr/${sessionId}`; // Update with your server's URL

    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

    // Send the QR code as an event stream
    res.write(`data: ${qrCodeDataUrl}\n\n`);

    // Optionally: Handle connection close
    req.on('close', () => {
        console.log('Connection closed');
    });
};