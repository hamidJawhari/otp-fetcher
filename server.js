// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { fetchOtp } = require('./emailFetcher');

// Create an instance of Express app
const app = express();

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Define a POST route to handle fetch-otp requests
app.post('/fetch-otp', async (req, res) => {
    try {
        // Extract email and password from request body
        const { mail, pass } = req.body;
        
        // Call fetchOtp function to start listening for OTP
        const otp = await fetchOtp(mail, pass);
        
        // Respond with OTP if found
        res.json({ otp });
    } catch (error) {
        // Log the error
        console.error('Error fetching OTP:', error);
        
        // Respond with an error message
        res.status(500).json({ error: 'An error occurred while fetching OTP.' });
    }
});

// Define the port number
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
