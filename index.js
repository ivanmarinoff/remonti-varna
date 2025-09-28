// const http = require('http'); // Unused, so it can be removed
const port = process.env.PORT || 3000;
const express = require('express');
const app = express();
const path = require('path');
// const nodemailer = require('nodemailer');
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
// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST, // SMTP server (e.g., smtp.gmail.com)
//     port: parseInt(process.env.EMAIL_PORT), // Convert string to number
//     secure: parseInt(process.env.EMAIL_PORT) === 465, // true for port 465 (SSL), false otherwise (e.g., 587 for TLS)
//     auth: {
//         user: process.env.EMAIL_USER, // Your email address
//         pass: process.env.EMAIL_PASS  // Your email password or app-specific password
//     }
// });

// Function to send an email notification
// async function sendEmail(visitorIP, browser, os, time) {
//     let ipAddress = '';
//
//     async function fetchIpAddress() {
//         try {
//             const response = await fetch('https://api.ipify.org?format=json');
//             const data = await response.json();
//             ipAddress = data.ip;
//         } catch (error) {
//             console.error('Failed to fetch IP address:', error);
//         }
//     }
//
//     // Fetch IP address on page load
//     await fetchIpAddress();
//
//     // fetch('https://api.ipify.org?format=json')
//     //     .then(response => response.json())
//     //     .then(data => {
//     //         ipAddress = data.ip;
//     //     });
//
//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: process.env.EMAIL_USER1, // Sending the email to yourself
//         subject: 'A new visitor has accessed your page.',
//         text: `
//             A visitor has left your page.
//             IP: ${visitorIP}
//             Browser: ${browser}
//             OS: ${os}
//             Session Ended: ${time}
//         `
//     };
//
//     try {
//         const info = await transporter.sendMail(mailOptions);
//         console.log('Email sent:', info.response);
//     } catch (error) {
//         console.log('Error sending email:', error);
//     }
// }

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
        name: "My Resume Site",
        short_name: "Resume",
        description: "This is a Resume site on my portfolio.",
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
                    "static/js/jquery.js",
                    "static/js/bootstrap.min.js",
                    "static/js/jquery.singlePageNav.min.js",
                    "static/js/typed.js",
                    "static/js/wow.min.js",
                    "static/js/custom.js",
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
                    "static/js/jquery.js",
                    "static/js/bootstrap.min.js",
                    "static/js/jquery.singlePageNav.min.js",
                    "static/js/typed.js",
                    "static/js/wow.min.js",
                    "static/js/custom.js",
                    "static/js/cookieinfo.min.js",
                    "static/js/body_tagscript.js",
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
    res.status(200).send(JSON.stringify(manifest, null, 2));
});


// Set up your index route
app.get('/', function (req, res) {
    // const visitorIP = req.ip; // Get the visitor's IP address
    // const browser = req.useragent.browser; // Get the browser information
    // const os = req.useragent.os; // Get the OS information
    // const time = new Date().toLocaleString(); // Get the current time

    // Send an email notification with all details
    // sendEmail(visitorIP, browser, os, time);

    // Serve the HTML file
    res.sendFile(__dirname + '/index.html');
});


// Start the server
app.listen(port, function () {
    console.log(`Server is listening on port ${port}`);
});

app.post('/session-end', express.json(), (req, res) => {
    const {ip, browser, os, time} = req.body;

    // Send an email with the collected data
    sendEmail(ip, browser, os, time);

    res.sendStatus(200); // Respond with a status to indicate successful handling
});


// Mixpanel setup (if needed)
// const Mixpanel = require('mixpanel', {track_pageview: true});
//
// // Create an instance of the Mixpanel client
// const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN, {host: "api-eu.mixpanel.com"});
