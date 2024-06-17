const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const UserRouter = require('./routes/User.js');
require('./config/db.js');
const cookieParser=require('cookie-parser');

// Use CORS middleware before defining routes
app.use(express.json());
app.use(cookieParser());

app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173'
}));

// Define routes after middleware
app.use('/user',UserRouter);

// for testing purpose only
app.get('/test',(req,res)=>{
    console.log(req.cookies);
    res.json('Hello World');
})

app.listen(process.env.PORT,()=>{
    console.log(`Server is running at ${process.env.port}`);
})