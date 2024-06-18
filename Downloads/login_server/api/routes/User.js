const express = require('express');
const app = express();
const User = require('./../models/User.js');
const UserVerification = require('./../models/UserVerification.js');
const nodemailer = require('nodemailer');
const {v4: uuidv4} = require('uuid');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser=require('cookie-parser');

// Password handler
const bcrypt = require('bcrypt');
const jwtSecret=process.env.JWT_SECRET;

// middleware to parse json data from req.body
app.use(express.json());
app.use(cookieParser());

// nodemailer stuff
const transporter = nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.AUTH_EMAIL,
        pass:process.env.AUTH_PASS,
    }
})

// testing success
transporter.verify((error,success)=>{
    if(error){
        console.log(error);
    }else{
        console.log("Ready for messages");
        console.log(success);
    }
})

// send Email Verification
const sendVerificationEmail = ({_id,email},res)=>{
    // url to be used in the email
    const currentUrl="http://localhost:8000/";

    const uniqueString = uuidv4()+_id;

    // mail options
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify Your Email",
        html: `<p>Verify your email address to complete the signup and login into your account.</p><p>This link 
        <b>expires in 2 min</b>.</p><p>Press <a href=${
            currentUrl + "user/verify/" + _id + "/" + uniqueString
        }>here</a> to proceed.</p>`
    }

    // hash the uniqueString
    const saltRounds = 10;
    bcrypt.hash(uniqueString,saltRounds)
    .then((hashedUniqueString)=>{
        // set values in userVerification collection
        const newVerification = new UserVerification({
            userId:_id,
            uniqueString:hashedUniqueString,
            expiresAt:Date.now() + 120000,
        })

        newVerification.save()
        .then(()=>{
            transporter.sendMail(mailOptions)
            .then(()=>{
                // email sent and verification record saved
                res.status(200).json({
                    status:"Pending",
                    message:"Verification email sent"
                })
            })
            .catch(error=>{
                console.log(error);
                res.status(400).json({
                    status:"Failed",
                    message:"Verification Email Failed"
                })
            })
        })
        .catch(error=>{
            res.status(400).json({
                status:"Failed",
                message:"Couldn't save verification email data!"
            })
        })
    })
    .catch((error)=>{
        res.status(400).json({
            status:"Failed",
            message:"An error ocurred while hashing email data!",
        })
    })
}

// verify email
app.get("/verify/:userId/:uniqueString",(req,res)=>{
    const {userId,uniqueString} = req.params;

    UserVerification.find({userId})
    .then((result)=>{
        if(result.length>0){
            // User verification record exists so we proceed    

            // we have to check web code is expires or not
            const {expiresAt} = result[0];
            const hashedUniqueString=result[0].uniqueString;

            // checking for expired unique string
            if(expiresAt < Date.now()){
                // record has expired so we delete it
                UserVerification.deleteOne({userId})
                .then(result=>{
                    //if user verification code is expired we have to delete the user also
                    User.deleteOne({_id:userId})
                    .then(()=>{
                        res.status(400).json({
                            status:"Failed",
                            message:"Link has expired. Please sign up again."
                        })
                    })
                    .catch(error=>{
                        res.status(400).json({
                            status:"Failed",
                            message:"Clearing user with expired unique string failed"
                        })
                    })
                })
                .catch(error=>{
                    console.log(err);
                    res.status(400).json({
                        status:"Failed",
                        message:"An error occurred while clearing expired user verification record"
                    })
                })
            }else{
                // valid record exists so we validate the user string
                // first compare the hashed unique string
                bcrypt.compare(uniqueString,hashedUniqueString)
                .then(result=>{
                    if(result){
                        // strings match
                        User.updateOne({_id:userId},{verified:true})
                        .then(()=>{
                            UserVerification.deleteOne({userId})
                            .then(()=>{
                                res.status(200).json({
                                    status:"Success",
                                    message:"Email verified Successfully"
                                })
                            })
                            .catch(error=>{
                                res.status(400).json({
                                    status:"Failed",
                                    message:"An error occurred while finalizing successful verification."
                                })
                            })
                        })
                        .catch(error=>{
                            res.status(400).json({
                                status:"Failed",
                                message:"An error occurred while updating user record to show verified."
                            })
                        })
                    }else{
                        // existing record but incorrect verification details passed
                        res.status(400).json({
                            status:"Failed",
                            message:"Invalid verification details passed. Check your inbox."
                        })
                    }
                })
                .catch(error=>{
                    res.status(400).json({
                        status:"Failed",
                        message:"An error ocurred while comparing unique strings."
                    })
                })
            }

        }else{
            // User verification record doesn't exists 
            console.log(error);
            res.status(400).json({
                status:"Failed",
                message:"Account doesn't exist or has been verified already.Please sign up or log in"
            })
        }
    })
    .catch(error=>{
        console.log(error);
        res.status(400).json({
            status:"Failed",
            message:"An error occurred in while checking for existing user verification record"
        })
    })
})

// SignUp
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    // Check for empty input fields
    if (!name || !email || !password) {
        return res.status(400).json({
            status: "Failed",
            message: "Empty Input Fields!"
        });
    }
     // Validate name format (e.g., only letters, spaces, hyphens, and apostrophes)
     if (!/^[a-zA-Z\s'-]+$/.test(name)) {
        return res.status(400).json({
            status: "Failed",
            message: "Invalid name entered"
        });
    }
    // Validate email format
    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.status(400).json({
            status: "Failed",
            message: "Invalid email entered"
        });
    }

    // Check password length
    if (password.length < 8) {
        return res.status(400).json({
            status: "Failed",
            message: "Password is too short!"
        });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                status: "Failed",
                message: "User with the provided email already exists"
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            verified: false,
        });

        const result = await newUser.save();

        // Handle account verification
        sendVerificationEmail(result, res);
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "Failed",
            message: "An error occurred while processing your request."
        });
    }
});

// SignIn
app.post('/login',(req,res)=>{
    const {email,password} = req.body;
    if(email === "" || password === ""){
        res.json({
            status:"Failed",
            message:"Empty credentials supplied"
        })
    }else{
        User.find({email}).then(data=>{
            if(data){
                // User exists
                // check if user is verified
                if(!data[0].verified){
                    res.status(400).json({
                        status:"Failed",
                        message:"Email hasn't verify yet. Check your inbox.",
                    })
                }
                else{
                    const hashedPassword=data[0].password;
                    bcrypt.compare(password,hashedPassword).then(result=>{
                        if(result){
                            jwt.sign({
                                email:data[0].email,
                                id:data[0]._id
                                },jwtSecret,{},(err,token)=>{
                                if(err) throw err;
                                res.cookie('token',token).json(data[0]);
                            })
                        }else{
                            res.status(422).json({
                                status:"Failed",
                                message:"Invalid password entered!"
                            })
                        }
                    }).catch(err=>{
                        res.json({
                            status:"Failed",
                            message:"An error occurred while comaring passwords"
                        })
                    })
                }
            }else{
                res.json({
                    status:"Failed",
                    message:"Invalid credentials entered!"
                })
            }
        }).catch(err=>{
            res.json({
                status:"Failed",
                message:"An error occurred while checking for existing user"
            })
        })
    }
})

module.exports = app;