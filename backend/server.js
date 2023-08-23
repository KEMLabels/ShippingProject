//Include Modules
const express = require("express");
const app = express();
const cors = require('cors');
const bcrypt = require("bcrypt");
const session = require('express-session');
const dotenv = require("dotenv");
const cookieParser = require('cookie-parser');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const crypto = require('crypto');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const { format } = require('date-fns');
require('express-async-errors');

//Configure mongoose, app, and dotenv
mongoose.set('strictQuery', false);
app.set('trust proxy', 1);
dotenv.config();

//Retrieve API keys from env
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const coinbaseApiKey = process.env.COINBASE_API;

//Initiate payment methods API's
const stripe = require("stripe")(stripeSecretKey);
var coinbase = require('coinbase-commerce-node');
var Client = coinbase.Client;
var resources = coinbase.resources;
Client.init(coinbaseApiKey);

//Connect to Mongo and set up MongoDBStore
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DB_STRING, { useNewUrlParser: true });
        console.log(`Connected to DB`);
    } catch (error) {
        console.log("Couldn't connect to DB: ", error);
        process.exit(1);
    }
}

const MongoDBStore = require('connect-mongodb-session')(session);
const store = new MongoDBStore({
    uri: process.env.DB_STRING,
    collection: 'sessions',
});

//Import schema modules
const User = require('./model/users.js');
const tempTokens = require('./model/tempToken.js');
const tempOTPS = require('./model/tempOTPs.js');

//Start app
app.use('/', express.static(__dirname + '/public'));
function customJsonParser(req, res, next) {
    if (req.path === '/webhook' && req.method === 'POST') {
        // If the request is for "/webhook" and it's a POST request, skip the JSON parsing
        next();
    } else {
        // For all other requests, use express.json()
        express.json()(req, res, next);
    }
}
app.use(customJsonParser);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const whitelist = 'http://localhost:3000/'
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", whitelist);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(cors({
    origin: "http://localhost:3000",
    methods: ['POST', 'GET', 'PATCH', 'OPTIONS'],
    credentials: true
}));
app.use(session({
    name: 'sessionID',
    secret: 'strongass',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 600000,
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    },
    store: store,
}));


//Set up transporter for nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    // host: 'smtp.gmail.com',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

//Middleware to check inactivity
// app.get("/isSessionActive", (req, res) => {
//     if (req.session && req.session.lastActivityTime) {
//         const currentTime = new Date().getTime();
//         const timeDifference = currentTime - req.session.lastActivityTime;

//         if (timeDifference >= 600000) {
//             // Session is inactive
//             res.status(401).send({ active: false });
//         } else {
//             // Session is active
//             res.status(200).send({ active: true });
//         }
//     } else {
//         // No session
//         res.status(401).send({ active: false });
//     }
// });

//STRIPE API
app.get("/getStripePublicKey", (req, res) => {
    const key = stripePublicKey;
    res.json(key);
})

const calculateOrderAmount = (amount) => {
    const totalVal = amount * 100;
    return Number(totalVal);
};

app.post("/create-payment-intent", async (req, res) => {
    try {
        // amount is in dollars so convert to cents in paymentIntent
        const { amount } = req.body;
        const { email } = req.body;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: calculateOrderAmount(amount),
            currency: "usd",
            automatic_payment_methods: {
                enabled: false,
            },
            metadata: {
                email: email,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (err) {
        console.log(err);
        res.send({ err });
    }
});

app.post('/webhook', express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    let event;

    console.log(req.body);

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.log("Failed to verify webook." + err);
        return;
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        console.log("Payment succeeded!", paymentIntent);
        let user = await User.findOne({ email: paymentIntent.metadata.email })
        if (!user)
            throw new Error('Does not exist.');
        let userExistingCredits = user.credits;
        User.updateOne({
            "_id": user._id.toString()
        }, {
                // set amount
                // paymentIntent.amount is in cents so convert to dollars
                "credits": Number(userExistingCredits) + Number(paymentIntent.amount / 100)
            })
            .then((obj) => {
                console.log("User credits updated");
            })
            .catch((err) => {
                console.log(err);
            })
    }
    res.status(200).end();
});

//COINBASE API
app.post("/payWithCrypto", async (req, res) => {
    const { amount } = req.body;

    try {
        const charge = await resources.Charge.create({
            name: "KEMLabels Credit Deposit",
            local_price: {
                amount: amount,
                currency: "USD"
            },
            pricing_type: "fixed_price",
            metadata: {
                email: "test@gmail.com"
            },
            cancel_url: "https://kemlabels.com/load-credits"
        })
        res.json({ redirect: charge.hosted_url });
    } catch (err) {
        console.log(err);
    }
})

//Error handler function
async function handleErr(err, req, res, next) {
    console.log(err.message)
    return res.json({ errMsg: err.message })
}

//Signing in
app.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body

        const data = {
            email: email,
            password: password
        }
        var emailAddress = data.email.toLowerCase();
        let user = await User.findOne({ email: emailAddress })
        if (!user)
            throw new Error('Incorrect email or password.');
        else {
            const comparePass = await bcrypt.compare(password, user.password);
            if (!comparePass) {
                throw new Error('Incorrect email or password.');
            } else {
                req.session.user = user;
                req.session.isLoggedIn = true;
                const userInfo = {
                    credits: user.credits,
                    userName: user.userName,
                    joinedDate: user.createdAt,
                }
                res.json({ redirect: '/', userInfo });
            }
        }
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

//Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    return res.json({ redirect: '/' })
})

//Signing up
app.post("/signup", async (req, res) => {
    try {
        const { userName, email, password } = req.body

        const data = {
            userName: userName.toLowerCase(),
            email: email.toLowerCase(),
            password: password
        }

        const userNameExists = await User.findOne({ userName: data.userName })
        if (userNameExists) throw new Error('This username is already associated with an account.');
        const emailExists = await User.findOne({ email: data.email })
        if (emailExists) throw new Error('This email is already associated with an account.');

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        const new_user = new User({
            userName: data.userName,
            email: data.email,
            password: hashedPassword,
        });
        new_user.save()

        const token = crypto.randomBytes(32).toString("hex");
        const create_token = new tempTokens({
            token: token,
            userid: new_user._id
        })
        create_token.save()
        const url = `https://kemlabels.com/users/${new_user._id}/verify/${token}`;
        await sendSignUpConfirmationEmail(data.email, url);

        req.session.user = new_user;
        req.session.isLoggedIn = true;
        res.json({ redirect: '/verify-email' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

//Email verification
app.get("/generateToken", async (req, res) => {
    const findToken = await tempTokens.findOne({ userid: req.session.user._id.toString() });
    if (findToken) {
        tempTokens.deleteOne({
            _id: findToken._id.toString()
        })
            .then(function () {
                console.log('successfuly deleted');
            }).catch(function (error) {
                console.log(error); // Failure
            });
    }
    generateTokenHelper(req.session.user._id, req.session.user.email);
})

async function generateTokenHelper(userID, email) {
    const token = crypto.randomBytes(32).toString("hex");
    const create_token = new tempTokens({
        token: token,
        userid: userID
    })
    create_token.save()
    const url = `https://kemlabels.com/users/${userID}/verify/${token}`;
    console.log(url);
    sendSignUpConfirmationEmail(email, url);
}

async function sendSignUpConfirmationEmail(emailAddress, url) {
    const signUpConfirmationEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels - Confirm Your Email',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <p>Thank you for signing up with us!</p>
        <p>Please use the following link to confirm your email address: <a href="${url}" target="_blank">${url}</a></p>
        <p>If you did not sign up for KEMLabels, you can safely ignore this email.</p>
        <p>Have any questions? Please contact us at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }
    transporter.sendMail(signUpConfirmationEmail, function (err, info) {
        if (err) console.log(err)
    });
}

app.get('/users/:id/verify/:token', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id });
        if (!user) throw new Error('Link Invalid');
        const token = await tempTokens.findOne({ token: req.params.token });
        if (!token) {
            const previoustoken = await tempTokens.findOne({ userid: req.params.id })
            if (previoustoken) {
                if (previoustoken.token !== req.params.token) throw new Error('Link Expired');
            } else throw new Error('Link Invalid');
        }

        User.updateOne({
            "_id": user._id.toString()
        }, {
                "verified": true
            })
            .then((obj) => {
                console.log("User has been verified");
            })
            .catch((err) => {
                console.log(err);
            })

        tempTokens.deleteOne({
            token: req.params.token
        })
            .then(function () {
                console.log('successfuly deleted');
            }).catch(function (error) {
                console.log(error); // Failure
            });

        return res.json({ redirect: '/' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

app.get('/isUserVerified', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.session.user._id });
        if (!user) throw new Error('An error occured.');
        const verified = user.verified;

        if (!verified) throw new Error('Please check your inbox for a verification link to verify your account.');
        else res.json({ redirect: '/' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }

})

app.get('/checkVerification', async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.session.user._id });
        if (!user) throw new Error('An error occured.');
        const verified = user.verified;
        if (!verified) throw new Error('User is not verified');
        res.json({ redirect: '/' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

//Forgot password
app.post("/emailExists", async (req, res) => {
    try {
        const { email } = req.body

        const data = {
            email: email.toLowerCase()
        }

        const emailExists = await User.findOne({ email: data.email })
        if (!emailExists) throw new Error('Hmm... this email is not associated with an account. Please try again.');
        else res.json({ emailExists });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

app.post("/forgotpassword", async (req, res) => {
    const { email, type } = req.body
    generateOTPHelper(email, type);
})

app.post("/generateNewOTP", async (req, res) => {
    const { email, type } = req.body
    const findOTP = await tempOTPS.findOne({ email: email.toLowerCase() });
    if (findOTP) {
        console.log(findOTP)
        tempOTPS.deleteOne({
            _id: findOTP._id.toString()
        })
            .then(function () {
                generateOTPHelper(email, type);
                console.log('successfuly deleted');
            }).catch(function (error) {
                console.log(error); // Failure
            });
    } else {
        generateOTPHelper(email, type);
    }
})

async function generateOTPHelper(email, type) {
    const otp = Math.floor(1000 + Math.random() * 9000);
    const create_OTP = new tempOTPS({
        passcode: otp,
        email: email
    })
    create_OTP.save()
    sendOTPEmail(otp, email, type);
}

function sendOTPEmail(OTPPasscode, emailAddress, type) {
    const resetPasswordOTPEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels - Your Verification Code to Reset Password',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <p>We received a request to reset the password associated with your account.</p>
        <p>To confirm your email address, please enter the 4 digit code below.</p>
        <div style="margin: 2rem; text-align: center;"><h1 style="letter-spacing: 5px">${OTPPasscode}</h1></div>
        <p>If you did not initiate this request, you can safely ignore this email or let us know.</p>
        <p>Have any questions? Please contact us at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }

    const changePasswordOTPEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels - Your Verification Code to Change Password',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <p>We received a request to change the password associated with your account.</p>
        <p>To confirm your email address, please enter the 4 digit code below.</p>
        <div style="margin: 2rem; text-align: center;"><h1 style="letter-spacing: 5px">${OTPPasscode}</h1></div>
        <p>If you did not initiate this request, you can safely ignore this email or let us know.</p>
        <p>Have any questions? Please contact us at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }

    const changeEmailOTPEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels - Your Verification Code to Change Email Address',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <p>We received a request to change the email associated with your account.</p>
        <p>To confirm your new email address, please enter the 4 digit code below.</p>
        <div style="margin: 2rem; text-align: center;"><h1 style="letter-spacing: 5px">${OTPPasscode}</h1></div>
        <p>If you did not initiate this request, you can safely ignore this email or let us know.</p>
        <p>Have any questions? Please contact us at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }

    const emailTypes = {
        'resetPassword': resetPasswordOTPEmail,
        'changePassword': changePasswordOTPEmail,
        'changeEmail': changeEmailOTPEmail,
    };

    const selectedEmail = emailTypes[type];
    if (selectedEmail) {
        transporter.sendMail(selectedEmail, function (err, info) {
            if (err) console.log(err)
        });
    } else {
        console.log('Invalid email type');
    }
}

app.post("/checkOTP", async (req, res) => {
    try {
        const { enteredOTP } = req.body
        const { email } = req.body
        console.log('entered code: ' + enteredOTP);
        const tempCode = await tempOTPS.findOne({ email: email.toLowerCase() });
        if (!tempCode) throw new Error("Invalid Code");
        console.log('correct code: ' + tempCode.passcode);
        if (Number(enteredOTP) !== Number(tempCode.passcode)) {
            throw new Error('Hmm... your code was incorrect. Please try again.');
        } else {
            tempOTPS.deleteOne({
                passcode: enteredOTP
            })
                .then(function () {
                    console.log('successfuly deleted');
                }).catch(function (error) {
                    console.log(error); // Failure
                });
        }
        res.status(200).json("success");
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }

})

app.post("/updateUserPass", async (req, res) => {
    try {
        const { email, password } = req.body

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = await User.findOne({ email: email.toLowerCase() })
        if (!userData) throw new Error("Unexpected error occured");

        User.updateOne({
            "_id": userData._id.toString()
        }, {
                "password": hashedPassword
            })
            .then((obj) => {
                console.log("Updated Password");
            })
            .catch((err) => {
                console.log(err);
            })

        sendPasswordChangeEmail(email);

        res.json({ redirect: '/signin' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

function sendPasswordChangeEmail(emailAddress) {
    const changePassConfirmation = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels Security Alert - Your Password Has Been Updated',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <h1 style="margin-bottom: 2rem;">Did you change your password?</h1>
        <p>We noticed the password for your KEMLabels' account was recently changed. If this was you, rest assured that your new password is now in effect. No further action is required and you can safely ignore this email.</p>
        <p>However, if you did not request this change, please contact our support team immediately at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }
    transporter.sendMail(changePassConfirmation, function (err, info) {
        if (err) console.log(err)
    });
}

//Account settings

//Credit history
app.get('/getCreditHistory', async (req, res) => {
    try {
        const paymentIntent = await stripe.paymentIntents.search({
            query: `status:\'succeeded\' AND metadata[\'email\']:\'vi9veltpvpstaff@gmail.com\'`,
        });

        const formattedPaymentIntents = [];

        for (const intent of paymentIntent.data) {
            const createdTimestamp = intent.created;

            const createdDate = format(new Date(createdTimestamp * 1000), 'MMMM dd, yyyy');
            const createdTime = format(new Date(createdTimestamp * 1000), 'hh:mm a');

            formattedPaymentIntents.push({
                refId: intent.id,
                paymentDate: createdDate,
                paymentTime: createdTime,
                amount: intent.amount,
                type: "Stripe",
                status: intent.status,
            });
        }

        console.log(formattedPaymentIntents);
        res.send(formattedPaymentIntents);
    } catch (err) {
        console.log(err);
        res.status(500).send('An error occurred.');
    }
})

//Username Change
app.post("/UpdateUsername", async (req, res) => {
    try {
        const { userName } = req.body;

        const userNameData = userName.toLowerCase();

        // Retrieve the user from the session
        const user = await User.findOne({ _id: req.session.user._id });
        if (!user) {
            throw new Error("An unexpected error occurred. Please try again later.");
        }

        const currentDate = new Date();
        if (user.userNameLastChanged) {
            // Calculate the time difference in hours and minutes
            const timeDiff = Math.abs(currentDate - user.userNameLastChanged);
            const hoursPassed = Math.floor(timeDiff / 3600000);
            const minutesPassed = Math.floor((timeDiff % 3600000) / 60000);

            const remainingHours = 24 - hoursPassed;
            let remainingMinutes = 60 - minutesPassed;

            if (remainingHours > 0 || (remainingHours === 0 && remainingMinutes > 0)) {
                if (remainingHours === 24) throw new Error(`You must wait ${remainingHours} hours before you can change your username again.`);
                else throw new Error(`You must wait ${remainingHours} hours and ${remainingMinutes} minutes before you can change your username again.`);
            }
        }

        if (userNameData === req.session.user.userName) {
            throw new Error("You cannot change your username to the same one you currently have.");
        }

        // Check if the new username is already used by another user
        const userNameAlreadyUsed = await User.findOne({ userName: userNameData });
        if (userNameAlreadyUsed) {
            throw new Error("This username is already associated with an account.");
        }

        // Update the username and userNameLastChanged
        await User.updateOne(
            { "_id": user._id.toString() },
            { "userName": userNameData, "userNameLastChanged": currentDate }
        );

        console.log("Updated username");
        sendUserNameChangeEmail(user.email);
        return res.status(200).json({ msg: 'Username updated successfully.' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
});

function sendUserNameChangeEmail(emailAddress) {
    const sendOneTimePasscodeEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels Security Alert - Your Username Has Been Updated',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <h1 style="margin-bottom: 2rem;">Did you change your username?</h1>
        <p>We noticed the username for your KEMLabels' account was recently changed. If this was you, rest assured that your new username is now in effect. No further action is required and you can safely ignore this email.</p>
        <p>However, if you did not request this change, please contact our support team immediately at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }
    transporter.sendMail(sendOneTimePasscodeEmail, function (err, info) {
        if (err) console.log(err)
    });
}

//Email Change
app.post("/sendEmailChangeConfirmation", async (req, res) => {
    try {
        const { newEmail } = req.body
        const currentEmail = req.session.user.email;

        if (newEmail.toLowerCase() === currentEmail) {
            throw new Error("You cannot change your email to the one you currently have.");
        }

        // Check if the new email is already used by another user
        const emailAlreadyUsed = await User.findOne({ email: newEmail.toLowerCase() });
        if (emailAlreadyUsed) {
            throw new Error("This email is already associated with an account.");
        }

        const otp = Math.floor(1000 + Math.random() * 9000);

        const create_OTP = new tempOTPS({
            passcode: otp,
            email: newEmail
        })
        create_OTP.save()
        sendEmailChangeRequestEmail(currentEmail, newEmail.toLowerCase(), otp)
        return res.status(200).json({ msg: `A confirmation email with instructions has been sent to ${newEmail.toLowerCase()}.` });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

function sendEmailChangeRequestEmail(currentEmail, newEmail, OTPPasscode) {
    const sendSecurityAlert = {
        from: process.env.MAIL_USER,
        to: currentEmail,
        subject: 'KEMLabels Security Alert - Email Change Detected on Your Account',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <h1 style="margin-bottom: 2rem;">Did you change your email?</h1>
        <p>We received a request to change the email associated with your account. If this was you, you can safely ignore this email.</p>
        <p>However, if you did not request this change, please contact our support team immediately at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }
    transporter.sendMail(sendSecurityAlert, function (err, info) {
        if (err) console.log(err)
    });
    sendOTPEmail(OTPPasscode, newEmail, "changeEmail");
}

app.post("/updateEmailAddress", async (req, res) => {
    try {
        const { newEmail } = req.body;

        const user = await User.findOne({ _id: req.session.user._id });
        if (!user) {
            throw new Error("An unexpected error occurred. Please try again later.");
        }

        await User.updateOne(
            { "_id": user._id.toString() },
            { "email": newEmail.toLowerCase(), "verified": false }
        );

        console.log("Updated email and unverified user");
        sendEmailChangeEmail(newEmail.toLowerCase());
        return res.status(200).json({ msg: 'Username updated successfully.' });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

function sendEmailChangeEmail(emailAddress) {
    const sendOneTimePasscodeEmail = {
        from: process.env.MAIL_USER,
        to: emailAddress,
        subject: 'KEMLabels Security Alert - Your Email Has Been Updated',
        attachments: [{
            filename: 'Logo.png',
            path: __dirname.slice(0, -7) + '/public/logo512.png',
            cid: 'logo'
        }],
        html: `
        <div style="max-width: 1000px;border:solid 1px #CBCBCB; margin: 0 auto;padding: 50px 60px;box-sizing:border-box;">
        <div style="max-width:100px; margin-bottom:2rem;"><img src="cid:logo" style="width: 100%;object-fit:contain; object-position:center center;"/></div>
        <h1 style="margin-bottom: 2rem;">Did you change your email?</h1>
        <p>We noticed the email for your KEMLabels' account was recently changed. If this was you, rest assured that your new email is now in effect. No further action is required and you can safely ignore this email.</p>
        <p>However, if you did not request this change, please contact our support team immediately at <strong>${process.env.MAIL_USER}</strong> or <strong>6041231234</strong>.</p>
        <p>Thank you,<br/>KEMLabels Team</p>
        </div>`,
    }
    transporter.sendMail(sendOneTimePasscodeEmail, function (err, info) {
        if (err) console.log(err)
    });
}

//Password Change
app.post("/sendPasswordChangeConfirmation", async (req, res) => {
    try {
        const { eneteredPassword, newPassword } = req.body;
        const currentPassword = req.session.user.password;

        const comparePassword = await bcrypt.compare(eneteredPassword, currentPassword);
        if (!comparePassword) throw new Error("Hmm... your current password is incorrect. Please try again.");

        const comparePassWithNewPass = await bcrypt.compare(newPassword, currentPassword);
        if (comparePassWithNewPass) throw new Error("Looks like you have entered the same password that you are using now. Please enter a differernt password.");

        const otp = Math.floor(1000 + Math.random() * 9000);
        const userEmail = req.session.user.email;

        const create_OTP = new tempOTPS({
            passcode: otp,
            email: userEmail
        })
        create_OTP.save();
        sendOTPEmail(otp, userEmail, "changePassword");
        return res.status(200).json({ msg: `A confirmation email with instructions has been sent to ${userEmail}.` });
    } catch (err) {
        console.log(err);
        return res.status(400).json({ msg: err.message });
    }
})

//CRON
// Schedule a task to run every 24 hours
cron.schedule('0 0 */1 * *', async () => {
    try {
        console.log('cron running');
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Delete unverified accounts created more than 24 hours ago
        await User.deleteMany({ verified: false, createdAt: { $lt: twentyFourHoursAgo } });
    } catch (err) {
        console.error('Error deleting unverified accounts:', err);
    }
});

//404 NOT FOUND
app.get('*', (req, res) => {
    throw new Error('PAGE NOT FOUND');
})

//Initiate Error handler
app.use(handleErr);

// Create SSL options
const options = {
    key: fs.readFileSync('path_to_private_key.pem'),
    cert: fs.readFileSync('path_to_ssl_certificate.pem')
};

//Start server
const server = https.createServer(options, app);
connectDB().then(() => {
    server.listen(8081, () => {
        console.log('Server is running on port 8081');
    });
})