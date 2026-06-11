const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
const CONSUMER_SECRET = process.env.CANVAS_CONSUMER_SECRET;

// Configure secure tracking sessions
app.use(session({
    secret: 'a-secure-random-local-string',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if running on production https
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));

function decodeSignedRequest(signedRequest, secret) {
    if (!signedRequest || !secret) return null;
    const parts = signedRequest.split('.');
    if (parts.length !== 2) return null;
    const [signature, payload] = parts;
    const check = crypto.createHmac('sha256', secret).update(payload).digest('base64');
    if (signature !== check) return null;
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
}

// 1. Capture Signed Request and save tokens into the user's session
app.post('/canvas', (req, res) => {
    const canvasContext = decodeSignedRequest(req.body.signed_request, CONSUMER_SECRET);
    if (!canvasContext) return res.status(401).send('Validation Failed.');

    // Save tokens securely on the server side
    req.session.sfToken = canvasContext.client.oauthToken;
    req.session.sfInstance = canvasContext.client.instanceUrl;

    // Clean redirect: No messy, unsecure URL params passed to the frontend
    res.redirect('/');
});

// 2. Clear API Route: Pulls tokens directly from session memory
app.post('/api/upsert-account', async (req, res) => {
    const { accountName } = req.body;
    
    // Retrieve authentication securely from session state
    const token = req.session.sfToken;
    const instanceUrl = req.session.sfInstance;

    if (!token || !instanceUrl) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Salesforce Canvas context session expired.' });
    }

    const targetUrl = `${instanceUrl}/services/data/v60.0/sobjects/Account/Name/${encodeURIComponent(accountName)}`;

    try {
        const response = await fetch(targetUrl, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ Description: "Processed securely via Node.js Server-Side Session Storage." })
        });

        if (response.status === 201 || response.status === 204) {
            return res.json({ success: true, message: `Account "${accountName}" successfully updated!` });
        }
        const errData = await response.json();
        return res.status(response.status).json({ success: false, errors: errData });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(process.env.PORT || 5183);
