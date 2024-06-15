require('dotenv').config();
require('./config/db.js');

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const UserRouter = require('./api/User')

// Middleware to parse JSON bodies
app.use(express.json());

// Define a test route
app.get('/test', (req, res) => {
    res.json({ message: 'Testing Command' });
});

app.use('/user',UserRouter);

// Start the server
app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
});
