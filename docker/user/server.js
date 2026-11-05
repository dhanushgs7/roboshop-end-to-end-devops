const instana = require('@instana/collector');
// init tracing
// MUST be done before loading anything else!
instana({
    tracing: {
        enabled: true
    }
});

const { MongoClient } = require('mongodb');
const { hashPassword, verifyPassword, toPublicUser } = require('./password-utils');
const { createClient } = require('redis');
const bodyParser = require('body-parser');
const express = require('express');
const pino = require('pino');
const expPino = require('express-pino-logger');

// MongoDB
let db;
let usersCollection;
let ordersCollection;
let mongoConnected = false;

const logger = pino({
    level: 'info',
    prettyPrint: false,
    useLevelLabels: true
});
const expLogger = expPino({
    logger: logger
});

const app = express();

app.use(expLogger);

app.use((req, res, next) => {
    res.set('Timing-Allow-Origin', '*');
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

app.use((req, res, next) => {
    let dcs = [
        "asia-northeast2",
        "asia-south1",
        "europe-west3",
        "us-east1",
        "us-west1"
    ];
    let span = instana.currentSpan();
    span.annotate('custom.sdk.tags.datacenter', dcs[Math.floor(Math.random() * dcs.length)]);

    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/health', (req, res) => {
    const stat = {
        app: 'OK',
        mongo: mongoConnected
    };
    res.json(stat);
});

// use REDIS INCR to track anonymous users
app.get('/uniqueid', async (req, res) => {
    try {
        const r = await redisClient.incr('anonymous-counter');
        res.json({
            uuid: 'anonymous-' + r
        });
    } catch (err) {
        req.log.error('ERROR', err);
        res.status(500).send(err);
    }
});

// check user exists
app.get('/check/:id', async (req, res) => {
    if (mongoConnected) {
        try {
            const user = await usersCollection.findOne({ name: req.params.id });
            if (user) {
                res.send('OK');
            } else {
                res.status(404).send('user not found');
            }
        } catch (e) {
            req.log.error(e);
            res.status(500).send(e);
        }
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// return all users for debugging only
app.get('/users', async (req, res) => {
    if (mongoConnected) {
        try {
            const users = await usersCollection.find({}, { projection: { password: 0 } }).toArray();
            res.json(users);
        } catch (e) {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        }
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.post('/login', async (req, res) => {
    const name = req.body.name;
    const password = req.body.password;
    req.log.info({ name }, 'login request');

    if (typeof name !== 'string' || name.length === 0 ||
        typeof password !== 'string' || password.length === 0) {
        res.status(400).send('name or password not supplied');
    } else if (mongoConnected) {
        try {
            const user = await usersCollection.findOne({ name });
            if (!user) {
                res.status(404).send('name not found');
                return;
            }

            const verification = await verifyPassword(password, user.password);
            if (!verification.valid) {
                res.status(404).send('incorrect password');
                return;
            }

            if (verification.needsRehash) {
                const upgradedPassword = await hashPassword(password);
                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: { password: upgradedPassword } }
                );
                user.password = upgradedPassword;
            }

            res.json(toPublicUser(user));
        } catch (e) {
            req.log.error('ERROR', e);
            res.status(500).send('login failed');
        }
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// TODO - validate email address format
app.post('/register', async (req, res) => {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const password = req.body.password;
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    req.log.info({ name }, 'registration request');

    if (name.length === 0 || typeof password !== 'string' ||
        password.length === 0 || email.length === 0) {
        res.status(400).send('insufficient data');
    } else if (mongoConnected) {
        try {
            const existingUser = await usersCollection.findOne({ name });
            if (existingUser) {
                res.status(400).send('name already exists');
                return;
            }

            const passwordHash = await hashPassword(password);
            await usersCollection.insertOne({ name, password: passwordHash, email });
            res.send('OK');
        } catch (e) {
            req.log.error('ERROR', e);
            res.status(500).send('registration failed');
        }
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.post('/order/:id', async (req, res) => {
    req.log.info('order', req.body);
    if (mongoConnected) {
        try {
            const user = await usersCollection.findOne({
                name: req.params.id
            });
            if (user) {
                const history = await ordersCollection.findOne({
                    name: req.params.id
                });
                if (history) {
                    const list = history.history;
                    list.push(req.body);
                    await ordersCollection.updateOne(
                        { name: req.params.id },
                        { $set: { history: list } }
                    );
                    res.send('OK');
                } else {
                    await ordersCollection.insertOne({
                        name: req.params.id,
                        history: [req.body]
                    });
                    res.send('OK');
                }
            } else {
                res.status(404).send('name not found');
            }
        } catch (e) {
            req.log.error(e);
            res.status(500).send(e);
        }
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.get('/history/:id', async (req, res) => {
    if (mongoConnected) {
        try {
            const history = await ordersCollection.findOne({
                name: req.params.id
            });
            if (history) {
                res.json(history);
            } else {
                res.status(404).send('history not found');
            }
        } catch (e) {
            req.log.error(e);
            res.status(500).send(e);
        }
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// connect to Redis
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (e) => {
    logger.error('Redis ERROR', e);
});
redisClient.on('connect', () => {
    logger.info('Redis connected');
});
redisClient.connect();

// set up Mongo
async function mongoConnect() {
    try {
        const mongoURL = process.env.MONGO_URL || 'mongodb://localhost:27017/users';
        const client = await MongoClient.connect(mongoURL, { useNewUrlParser: true, useUnifiedTopology: true });
        db = client.db('users');
        usersCollection = db.collection('users');
        ordersCollection = db.collection('orders');
        mongoConnected = true;
        logger.info('MongoDB connected');
    } catch (error) {
        mongoConnected = false;
        logger.error('ERROR', error);
        setTimeout(mongoLoop, 2000);
    }
}

function mongoLoop() {
    mongoConnect().catch((e) => {
        logger.error('ERROR', e);
        setTimeout(mongoLoop, 2000);
    });
}

mongoLoop();

// fire it up!
const port = process.env.USER_SERVER_PORT || '8080';
app.listen(port, () => {
    logger.info('Started on port', port);
});