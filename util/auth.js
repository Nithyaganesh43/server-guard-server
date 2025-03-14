    const auth = require('express').Router(); 
    const cors = require('cors');

    const allowedOrigins = [
    'http://localhost:3000',
    'https://zenova-two.vercel.app',
    ];

    auth.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    })
    );

    auth.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
        );
        res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
        );
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') return res.status(200).end();
    next();
    });

    auth.post('/getAccess', (req, res) => {
    try {
        const password = req.body.password;
        if (password === process.env.PASSWORD) {
        res.cookie('access_token', process.env.PASSWORD, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.send('success');
        }
        res.status(400).send('Wrong Password');
    } catch (error) {
        console.error('Error in getAccess:', error.message);
        res.status(500).send('Server Error');
    }
    });

    auth.get('/checkAccess', (req, res) => {
    try {
        if (
        !req.cookies.access_token ||
        req.cookies.access_token !== process.env.PASSWORD
        )
        return res.status(403).send('Access Denied');
        res.send('Authorized');
    } catch (error) {
        console.error('Error in checkAccess:', error.message);
        res.status(500).send('Server Error');
    }
    });

    module.exports=auth;