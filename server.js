const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5183;
const CONSUMER_SECRET = process.env.CANVAS_CONSUMER_SECRET;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Point Express to serve the compiled LWC production build bundle folder
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

// Intercept Salesforce Canvas Signed Request
app.post('/canvas', (req, res) => {
    const canvasContext = decodeSignedRequest(req.body.signed_request, CONSUMER_SECRET);
    if (!canvasContext) return res.status(401).send('Validation Failed.');

    const oauthToken = canvasContext.client.oauthToken;
    const instanceUrl = canvasContext.client.instanceUrl;

    // Redirect user to the compiled LWC frontend with security context tokens appended
    res.redirect(`/?token=${encodeURIComponent(oauthToken)}&instance=${encodeURIComponent(instanceUrl)}`);
});

// Proxy route processing standard Salesforce REST data upserts
app.post('/api/upsert-account', async (req, res) => {
    const { accountName, token, instanceUrl } = req.body;
    const targetUrl = `${instanceUrl}/services/data/v60.0/sobjects/Account/Name/${encodeURIComponent(accountName)}`;

    try {
        const response = await fetch(targetUrl, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ Description: "Processed seamlessly via independent LWC OSS container web application deployed on Render." })
        });

        if (response.status === 201 || response.status === 204) {
            return res.json({ success: true, message: `Account "${accountName}" successfully updated via LWC Open Source!` });
        }
        const errData = await response.json();
        return res.status(response.status).json({ success: false, errors: errData });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => console.log(`LWC OSS App active on port ${PORT}`));
