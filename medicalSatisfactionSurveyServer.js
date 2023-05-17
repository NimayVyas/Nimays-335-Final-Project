/* 
 * Name: Nimay Vyas 
 * Course: CMSC335 
 * UID: 117127522 
 */

// Importing required modules
const http = require('http');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');

// Create an instance of the Express application
const app = express();

// Set the port number
const portNumber = 5005;

// Set the views directory and view engine
app.set('views', path.resolve(__dirname, 'forms'));
app.set('view engine', 'ejs');

// Set up static file serving
app.use(express.static(__dirname + '/forms'));

// Enable body-parser middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Load environment variables from .env file
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Function to fetch a random advice slip from the API
async function fetchAdviceSlipAPI() {
  try {
    const response = await axios.get('https://api.adviceslip.com/advice');
    if (response.status === 200) {
      const advice = response.data.slip.advice;
      console.log(`Quote of the day: ${advice}`);
      return advice;
    } else {
      console.log('Failed to fetch advice slip');
      // Handle the error if needed
    }
  } catch (error) {
    console.log('Error fetching advice:', error.message);
    // Handle the error if needed
  }
}

fetchAdviceSlipAPI();

// Retrieve MongoDB connection details from environment variables
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const databaseAndCollection = { db: 'CMSC335DB', collection: 'MedicalSatisfactionProject' };
const uri = `mongodb+srv://${userName}:${password}@cluster0.ntldhdk.mongodb.net/?retryWrites=true&w=majority`;

// Create a web server using http module
const webServer = http.createServer(app);

// Start the web server and listen on the specified port
webServer.listen(portNumber, () => {
  console.log(`Web server is running at http://localhost:${portNumber}`);
});

// Function to start the command interpreter
function startInterpreter() {
  process.stdout.write('Type "stop" to shutdown the server: ');

  process.stdin.on('readable', () => {
    let dataInput = process.stdin.read();
    while (dataInput !== null) {
      const command = dataInput.trim();
      if (command !== 'stop') {
        console.log(`Invalid command: ${command}`);
      } else {
        console.log('Shutting down the server');
        process.exit(0);
      }
      dataInput = process.stdin.read();
    }
  });
}

// Call the startInterpreter function to start the command interpreter
startInterpreter();

// Render the main page of the application
app.get('/', (request, response) => {
  response.render('medicalform');
});

// Handle the form submission
app.post('/submit', async (request, response) => {
  // Extract form field values from the request body
  const {
    name,
    email,
    satisfaction,
    reason,
    comments,
    medicine,
  } = request.body;

  // Function to insert data into MongoDB
  async function putDataInMongo() {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    client.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      response.sendStatus(500); // Sending an appropriate HTTP response in case of an error
    });

    try {
      await client.connect();
      // Add row to DB
      const patientInfo = {
        name: name,
        email: email,
        satisfaction: satisfaction,
        reason: reason,
        comments: comments,
        medicine: medicine,
      };
      await insertNewPatient(client, databaseAndCollection, patientInfo);
    } catch (e) {
      console.error(e);
      response.sendStatus(500); // Sending an appropriate HTTP response in case of an error
    } finally {
      await client.close();
    }
  }

  // Function to insert a new patient into the MongoDB collection
  async function insertNewPatient(client, databaseAndCollection, newPatient) {
    const result = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .insertOne(newPatient);
  }

  // Call the function to insert data into MongoDB
  putDataInMongo();

  // Prepare the variables to be passed to the processApplication template
  const variables = {
    name: name,
    email: email,
    satisfaction: satisfaction,
    reason: reason,
    comments: comments,
    medicine: medicine,
    advice: advice, // Include the advice slip in the variables
  };

  // Render the processApplication template with the variables
  response.render('processApplication', variables);
});

