//import express module for server side functionality
import express from "express";
//import bodyparser module for ejs forms control
import bodyParser from "body-parser";
//import the postgres module
import pg from 'pg';
//extract the Client class from the pg module for database configuration
const {Client} = pg;

//instanciate a new Client object with the name client and configure the database
const client = new Client({
    user: 'postgres',
    password: '22942284',
    host: 'localhost',
    port: 5432,
    database: 'greenProductLibrary',
  });

//use try and catch to connect to the pg database if it failed then log the error
try {
    await client.connect();
} catch (error) {
    console.log("Can't connect to the database : |"+error);
}

//create an express application
const app = express();
//assign a port for express to use
const port = 3000;

//making express use the public folder as the default folder for the static files (images,css...)
app.use(express.static("public"));

//getting the home route
app.get("/",(req,res)=>{
    res.render("index.ejs");
});

//listening to the declared server port
app.listen(port,()=>{
    console.log("App listening on port : "+port);
});



/*---------------------------FUNCTIONS-----------------------------*/



