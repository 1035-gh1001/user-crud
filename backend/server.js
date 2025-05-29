require('dotenv').config();

const mongoose = require('mongoose');
const app = require('./app'); // Import the app from app.js

// Note: cors and express.json are already configured in app.js
// No need for:
// const express = require('express');
// const cors = require('cors');
// const router = require('./router'); (app.js already uses the router)
// const app = express(); (app is imported)
// app.use(cors());
// app.use(express.json());
// app.use('/api', router); (already in app.js)


const {
    HOST: host,
    PORT: port,
    DB_HOST: dbHost,
    DB_APP_NAME: dbAppName,
    DB_USERNAME: dbUsername,
    DB_PASSWORD: dbPassword,
} = process.env;

const uri = `mongodb+srv://${dbUsername}:${dbPassword}@${dbHost}`
    + `/?retryWrites=true&w=majority&appName=${dbAppName}`;

const connect = async () => {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.log('MongoDB connection error: ', error);
    }
};

connect();

const server = app.listen(port, host, () => {
    console.log(
        'Node server is listening to '
        + `http://${server.address().address}:${server.address().port}`
    );
});

app.use('/api', router);
