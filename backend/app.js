const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // Added cookie-parser

// const controller = require('./controller'); // No longer directly used here

const app = express();

app.use(cors());
app.use(
    express.urlencoded({
        extended: true,
    })
);

app.use(express.json());
app.use(cookieParser()); // Added cookie-parser middleware

// Use the router for all API routes
app.use('/api', require('./router'));

module.exports = app;
