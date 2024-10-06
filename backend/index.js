const express = require('express');
const cors = require('cors');
const path = require('path');
const serverless = require('serverless-http');
require('dotenv').config();
const mongoose = require('mongoose');
const fetch = require('node-fetch');

// Initialize Express app
const app = express();

// Initialize middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use('/assets', express.static(path.join(__dirname, '../public')));

function initEndpoints(express) {
    // Temp test
    express.get('/', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public', 'home.html'));
    });
    // Frontend app makes request to our /getLocationStatus endpoint, and we request from given API

    // Register with phone number and ID, with number verification only
    express.post("/register/", registering);

    // Admin endpoints
    express.post("/admin/startvote/", startvote);

    // endpoint for receiving messages
    express.post("/msg/", handlemsg);


    // express.get("/getLocationStatus/:lat/:lon", (req, res) => {
    //     let lat = req.params.lat;
    //     let lon = req.params.lon;
    //     if (!lat || !lon) {
    //         res.status(400).send("bad request, missing lat and/or lon")
    //         return;
    //     }

    //     fetch('https://pplx.azurewebsites.net/api/rapid/v0/location-verification/verify', {
    //         method: "POST",
    //         body: JSON.stringify(
    //             {
    //                 "device": {
    //                     "phoneNumber": "14372307313"
    //                 },
    //                 "area": {
    //                     "type": "Circle",
    //                     "location": { "latitude": lat, "longitude": lon },
    //                     "accuracy": 1,
    //                 }
    //             }
    //         ),
    //         headers: {
    //             "Authorization": "Bearer 166b4a",
    //             "Content-Type": "application/json",
    //             "Cache-Control": "no-cache",
    //             "accept": "application/json"
    //         }
    //     }).then((ApiRes) => {
    //         if (ApiRes.ok) {
    //             return ApiRes.json();
    //         } else {
    //             console.log("API response was not ok:", ApiRes.status);
    //             throw new Error("API response was not ok");
    //         }
    //     }).then((json) => {
    //         if (json.verificationResult == null) {
    //             console.log("Malformed request body");
    //             res.status(400).send("Malformed request body from API");
    //         } else if (json.verificationResult) {
    //             res.status(200).send(`yes, this number is at ${lat}, ${lon}`);
    //         } else if (!json.verificationResult) {
    //             res.status(200).send(`nope, this number is NOT at ${lat}, ${lon}`);
    //         }
    //     }).catch((error) => {
    //         console.error("Fetch error:", error.message);
    //         res.status(500).send("Internal server error: " + error.message);
    //     });
    // });
}

// Replace with your MongoDB connection string
const uri = process.env.MONGODB_URI;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

  const Schema = mongoose.Schema;

const RegisteredNumberSchema = new Schema({
  phoneNumber: String,
});

// Define the Message schema
const MessageSchema = new Schema({
    from: { type: String, required: true },
    body: { type: String, required: true },
    receivedAt: { type: Date, default: Date.now },
  });
  
const DebugLogSchema = new Schema({
    body: { type: String, require: true },
    receivedAt: { type: Date, default: Date.now },
})

// Create the Message model
const Message = mongoose.model('Message', MessageSchema);

const RegisteredNumber = mongoose.model('RegisteredNumber', RegisteredNumberSchema);

const DebugLog = mongoose.model('DebugLog', DebugLogSchema);

// Function for registration endpoint with number verification only
async function registering(req, res) {
    const { phoneNumber } = req.body;

    const authorizationHeader = req.headers['authorization'];
    if (!authorizationHeader) {
        console.error('Missing Authorization header');
        return res.status(400).send('Authorization header is required');
    }

    const deviceId = authorizationHeader.split(' ')[1];
    if (!deviceId) {
        console.error('Invalid Authorization header format');
        return res.status(400).send('Bearer token is required in the Authorization header');
    }

    // Validate input
    if (!phoneNumber) {
        console.error('Missing phone number');
        return res.status(400).send('Phone number and device ID are required for registration');
    }

    try {
        // Number Verification
        const verifyRes = await fetch('https://pplx.azurewebsites.net/api/rapid/v0/number-verification/verify', {
            method: 'POST',
            body: JSON.stringify({ phoneNumber }),
            headers: {
                'Authorization': `Bearer ${deviceId}`,
                'Content-Type': 'application/json',
            },
        });

        //console.log('Number Verification Status:', verifyRes.status);
        const verifyData = await verifyRes.json();
        //console.log('Number Verification Response:', verifyData);

        try {
            let log = new DebugLog({ body: JSON.stringify(verifyData)});
            await log.save();
            console.log('api response saved to database');
        } catch (error) {
            console.error('Error saving api response:', error);
        }

        if (verifyRes.status !== 200 || verifyData.message !== 'poc request successful') {
            return res.status(400).send('Phone number verification unsuccessful');
        }

        try {
            // Check if the phone number is already registered
            const existingNumber = await RegisteredNumber.findOne({ phoneNumber });
            if (!existingNumber) {
              // Save new phone number
              const newNumber = new RegisteredNumber({ phoneNumber });
              await newNumber.save();
            }
          } catch (error) {
            console.error("Error interacting with the database:", error);
            res.status(500).send("Registration failure");
            return;
          }

        // Registration successful
        res.status(200).send('Registration successful');

    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal server error');
    }
}



// dont you dare leak this
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = require('twilio')(accountSid, authToken);

async function startvote(req, res) {

    console.log("a vote has been started");
    let {sim_swap_date, lat, lon, accuracy, ballot_message} = req.body;
    console.log(req.body);
    let min_swap_date;
    try {
        min_swap_date = new Date(sim_swap_date);
    } catch (error) {
        console.log("could not parse sim_swap_date");
        return res.status(300).send("could not process sim swap date");
    }

    // Fetch registered phone numbers from MongoDB
    let registeredNumbers;
    try {
    registeredNumbers = await RegisteredNumber.find({});
    } catch (error) {
    console.error('Error fetching registered numbers:', error);
    return res.status(500).send('Internal server error');
    }

    // Extract the phone numbers into an array
    let phone_nums = registeredNumbers.map(doc => doc.phoneNumber);

    // go through the list of numbers, 
    for (let i = 0; i < phone_nums.length; i++) {
        // check sim swap days
        try {
            let phoneNumber = phone_nums[i];
            let apiRes = await fetch('https://pplx.azurewebsites.net/api/rapid/v0/simswap/check', {
                method: "POST",
                body: JSON.stringify({ "phoneNumber": phoneNumber }),
                headers: {
                    "Authorization": "Bearer 166b4a",
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "accept": "application/json"
                }
            });

            // Check if the response is OK (status code 200-299)
            if (!apiRes.ok) {
                console.error(`API request failed for ${phoneNumber}:`, apiRes.status, apiRes.statusText);
                continue; // Skip to the next phone number
            }

            // Parse the response body as JSON
            let jsonResponse = await apiRes.json();
            console.log(`Response for ${phoneNumber}:`, jsonResponse);

            // Save the message to MongoDB
            try {
                let log = new DebugLog({ body: JSON.stringify(jsonResponse)});
                await log.save();
                console.log('api response saved to database');
            } catch (error) {
                console.error('Error saving api response:', error);
            }

            let simChangeDate = new Date(jsonResponse.latestSimChange);

            console.log(`sim change date: ${simChangeDate}, min date: ${min_swap_date}`);

            if (simChangeDate > min_swap_date) {
                console.log(`${phoneNumber} cannot vote since sim swap is too close`);
                continue;
            }

            // now we do location verification
            let apiRes2 = await fetch('https://pplx.azurewebsites.net/api/rapid/v0/location-verification/verify', {
                method: "POST",
                body: JSON.stringify(
                    {
                        "device": {
                            "phoneNumber": `${phoneNumber}`
                        },
                        "area": {
                            "type": "Circle",
                            "location": { "latitude": lat, "longitude": lon },
                            "accuracy": accuracy,
                        }
                    }
                ),
                headers: {
                    "Authorization": "Bearer 166b4a",
                    "Content-Type": "application/json",
                    "Cache-Control": "no-cache",
                    "accept": "application/json"
                }
            });

            // Check if the response is OK (status code 200-299)
            if (!apiRes2.ok) {
                console.error(`API request failed for ${phoneNumber}:`, apiRes.status, apiRes.statusText);
                continue; // Skip to the next phone number
            }

            let api2response = await apiRes2.json();
            console.log(`Response for ${phoneNumber}:`, api2response);

            // Save the message to MongoDB
            try {
                let log = new DebugLog({ body: JSON.stringify(api2response)});
                await log.save();
                console.log('api response saved to database');
            } catch (error) {
                console.error('Error saving api response:', error);
            }

            if (!api2response.verificationResult) {
                console.log(`${phoneNumber} is not in the specified region`);
                continue;
            }

            let smsresp = await client.messages.create({
                    body: `${ballot_message}`,
                    from: '+19258077060',
                    to: `+${phoneNumber}`
                });
            console.log(smsresp);
        } catch (error) {
            console.error(`Error fetching data for the ${i}th number: `, error);
            // Handle the error (e.g., log it, retry, etc.)
        }
    }
    return res.status(200).send("voters have been notified");
}

async function handlemsg(req, res) {
    console.log("we have gotten a message");
    const incomingMessage = req.body.Body;
    const fromNumber = req.body.From;

    console.log(`Received message from ${fromNumber}: ${incomingMessage}`);

    // Save the message to MongoDB
    try {
        const message = new Message({ from: fromNumber, body: incomingMessage });
        await message.save();
        console.log('Message saved to database');
    } catch (error) {
        console.error('Error saving message:', error);
    }

    // send feedback
    let smsresp = await client.messages.create({
        body: `Your vote has been counted, thank you for voting!`,
        from: '+19258077060',
        to: `+${fromNumber}`
    });
    console.log(smsresp);

    // Create a response message
    const twiml = new MessagingResponse();
    twiml.message('Thank you for your message!');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return res;
}

// Initialize your endpoints
initEndpoints(app);

// Export the app and handler
module.exports = app;
module.exports.handler = serverless(app);