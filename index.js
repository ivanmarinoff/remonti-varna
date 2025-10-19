// const http = require('http'); // Unused, so it can be removed
const port = process.env.PORT || 3000;
const express = require('express');
const app = express();
const path = require('path');
const nodemailer = require('nodemailer');
const useragent = require('express-useragent');
const helmet = require('helmet');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64'); // Generate a unique nonce
    next();
});

app.use(useragent.express());
// require('dotenv').config();
// app.use((req, res, next) => {
//     res.setHeader("Content-Security-Policy", `script-src 'self' 'nonce-${res.locals.nonce}'; object-src 'none';`);
//     next();
// });

// Static file serving
app.use('/static', express.static(path.join(__dirname, 'static')));

// Pug template engine setup (if needed)
app.set('view engine', 'pug');

// Body parser for form data
app.use(require('body-parser').urlencoded({extended: true}));
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            fontSrc: ["'self'"],
            imgSrc: ["'self'"],
            scriptSrc: ["'self'", (req, res) => `'nonce-${res.locals.nonce}'`], // Use the generated nonce
            styleSrc: ["'self'"],
            frameSrc: ["'self'"],
        },
        reportOnly: true, // Set to 'true' to enable report-only mode
    })
);
// Nodemailer setup with custom host and port
// Email transporter (SMTP setup)
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10),
    secure: parseInt(process.env.EMAIL_PORT, 10) === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Send visitor info via email
// 🕒 Кеш за последно изпратени имейли (по IP)
const emailCooldowns = new Map(); // { ip: timestamp }

// Email sender с анти-flood защита
async function sendEmail(req) {
    const visitorIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
    const browser = req.useragent.browser || 'Unknown';
    const os = req.useragent.os || 'Unknown';
    const time = new Date().toLocaleString();

    // Проверка за flood (5 минути cooldown)
    const now = Date.now();
    const lastSent = emailCooldowns.get(visitorIP);

    const ONE_HOUR = 60 * 60 * 1000;

    if (lastSent && now - lastSent < ONE_HOUR) {
        console.log(`⏳ Email already sent recently for IP ${visitorIP}. Skipping.`);
        return; // Не пращаме втори имейл
    }

    // Записваме момента на последното изпращане
    emailCooldowns.set(visitorIP, now);

    const mailOptions = {
        from: `"Site Visitor" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER1,
        subject: 'New visitor on your site',
        text: `
New visitor detected:

IP: ${visitorIP}
Browser: ${browser}
OS: ${os}
Time: ${time}
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${process.env.EMAIL_USER1} for IP ${visitorIP}:`, info.response);
    } catch (error) {
        console.error('❌ Error sending email:', error);
        // Ако има грешка — премахни cooldown, за да може да се пробва пак
        emailCooldowns.delete(visitorIP);
    }
}


// Example use
app.get('/', async (req, res) => {
    await sendEmail(req);
    res.sendFile(path.join(__dirname, 'index.html'));
});

const isDesktop = (userAgent) => {
    return /Windows|Macintosh|Linux/.test(userAgent);
};

// Serve the manifest.json dynamically
const fs = require('fs'); // Import the file system module

app.get('/manifest.json', function (req, res) {
    const iconUrl = isDesktop(req.useragent.platform)
        ? '/static/fonts/fontawesome-webfont.svg'
        : '/static/fonts/fontawesome-webfont.svg';

    const manifest = {
        name: "Site from building service",
        short_name: "remontivarna",
        description: "This is a repair services site.",
        version: "1.0.0",
        start_url: "/",
        display: "standalone",
        orientation: "any",
        permissions: ["storage", "activeTab", "scripting"],
        host_permissions: [
            "*://cookieinfoscript.com/*",
            "*://google-analytics.com/*",
            "*://tagmanager.google.com/*",
            "*://fonts.googleapis.com/*"
        ],
        content_scripts: [
            {
                matches: ["<all_urls>"],
                js: [
                    "static/js/gtag.js",
                    "static/js/head_tagscript.js",
                    "static/js/jquery.backstretch.min.js",
                    "static/js/jquery.min.js",
                    "static/js/jtemplatemo_script.js",
                    "static/js/body_tagscript.js",
                    "static/js/cookieinfo.min.js",
                ]
            }
        ],
        background: {
            service_worker: "static/js/background.js"
        },
        web_accessible_resources: [
            {
                resources: [
                    "static/js/gtag.js",
                    "static/js/head_tagscript.js",
                    "static/js/jquery.backstretch.min.js",
                    "static/js/jquery.min.js",
                    "static/js/jtemplatemo_script.js",
                    "static/js/body_tagscript.js",
                    "static/js/cookieinfo.min.js",
                    "https://fonts.googleapis.com/css?family=Open+Sans:300,400,600,700,800"
                ],
                matches: ["<all_urls>"]
            }
        ],
        content_security_policy:
            "script-src 'self' 'nonce-randomNonceValue'; object-src 'self'; 'unsafe-inline' 'unsafe-eval' https://cookieinfoscript.com https://google-analytics.com; object-src 'self';",
        background_color: "#3367D6",
        theme_color: "#3367D6",
        icons: [
            {
                src: iconUrl,
                sizes: "512x512",
                type: "image/png"
            }
        ]
    };

    // Write the manifest to the root directory as 'manifest.json'
    fs.writeFileSync('./manifest.json', JSON.stringify(manifest, null, 2), 'utf-8');

    res.setHeader('Content-Type', 'application/json');
    res.json(manifest);
});


// Set up your index route
// app.get('/', function (req, res) {
//     // const visitorIP = req.ip; // Get the visitor's IP address
//     // const browser = req.useragent.browser; // Get the browser information
//     // const os = req.useragent.os; // Get the OS information
//     // const time = new Date().toLocaleString(); // Get the current time
//
//     // Send an email notification with all details
//     // sendEmail(visitorIP, browser, os, time);
//
//     // Serve the HTML file
//     res.sendFile(__dirname + '/index.html');
// });


// Start the server
app.listen(port, function () {
    console.log(`Server is listening on port ${port}`);
});

// app.post('/session-end', express.json(), (req, res) => {
//     const {ip, browser, os, time} = req.body;
//
//     // Send an email with the collected data
//     sendEmail(ip, browser, os, time);
//
//     res.sendStatus(200); // Respond with a status to indicate successful handling
// });


// Mixpanel setup (if needed)
// const Mixpanel = require('mixpanel', {track_pageview: true});
//
// // Create an instance of the Mixpanel client
// const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN, {host: "api-eu.mixpanel.com"});
