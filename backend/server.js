require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const router = require('./router');

const app = express();

app.use(cors());
app.use(express.json());

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
