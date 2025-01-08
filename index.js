//import express module for server side functionality
import express, { query } from "express";
//import bodyparser module for ejs forms control
import bodyParser from "body-parser";
//import the postgres module
import pg from "pg";
//extract the Client class from the pg module for database configuration
const { Client } = pg;
//import bcrypt module
import bcrypt from "bcrypt";
//import the environment variables module
import 'dotenv/config'

//password encryption rounds
const saltRounds = 10;

//instanciate a new Client object with the name client and configure the database
const client = new Client({
  user: process.env.pgUser,
  password: process.env.pgPassword,
  host: process.env.pgHost,
  port: process.env.pgPort,
  database: process.env.pgDatabase,
});

//use try and catch to connect to the pg database if it failed then log the error
try {
  await client.connect();
} catch (error) {
  console.log("Can't connect to the database : |" + error);
}

//create an express application
const app = express();
//assign a port for express to use
const port = 3000;

//making express use the public folder as the default folder for the static files (images,css...)
app.use(express.static("public"));

//parse the body of the ejs forms to handle data submittion
app.use(bodyParser.urlencoded({ extended: true }));

//getting the home route
app.get("/", async (req, res) => {
  //get all the products from the database using an async function that handles the selection query and storing the value in a const
  const queryResult = await GetAllProductsFromDatabase();

  //access the rows value from the query result and storing it in a products const
  const products = queryResult.rows;

  //rendering the index.ejs route while passing the products object array
  res.render("index.ejs", { products: products });
});

//handle the login route
app.post("/login", async (req, res) => {
  //getting the requested login and password form the login form and storing the data in const
  const requestedLogin = req.body.login;
  const requestedPassword = req.body.password;

  //calling the async function CheckFor.... and storing the result into a queryResult const
  const queryResult = await CheckIfUserIsAlreadyInDb(requestedLogin);

  const loginData = queryResult.rows;

  console.log(loginData);

  //check if the returned requested login and password is not an empty object if so then render the submitProduct.ejs else
  //show an error message
  if (loginData.length > 0) {
    //use bcrypt to compare user requested password and the hashed password stored in the db
    bcrypt.compare(
      requestedPassword,
      loginData[0].password,
      async function (err, result) {
        if (err) console.log("error comparing passwords : |" + err);
        //if the comparison is correct and everything worked well
        else if (result) {
          //calling the async function GetAllProductsByUserId to retrieve all products submitted by the current user ID
          const userProducts = await GetAllProductsByUserId(loginData[0].id);
          //render the profile page while passing th required values
          res.render("profil.ejs", {
            userLogin: loginData[0].fullname,
            userId: loginData[0].id,
            userProducts: userProducts.rows,
          });
          console.log("Password Correct!");
        }
        //if the comparison is incorrect
        else console.log("incorrect password");
      }
    );
  }
  //in case the request login is not found in the db then
  else {
    console.log("empty");
  }
});

//handle the register route
app.post("/register", async (req, res) => {
  //getting the requested fullname,login,password,password confirmation form the register form and storing the data in consts
  const requestedFullName = req.body.fullname;
  const requestedLogin = req.body.login;
  const requestedPassword = req.body.password;
  const requestedPassword2 = req.body.password2;

  //check if the requested login is already present in the db
  const queryResult = await CheckIfUserIsAlreadyInDb(requestedLogin);

  //if so then
  if (queryResult.rows.length > 0) {
    console.log("User already present in the database");
  } else {
    //if the user is not found then proceed password confirmation check then hashing the request password then register the new user
    if (requestedPassword !== requestedPassword2) {
      console.log("Make sure the passwords are the same");
    } else {
      //hash the requested password and salting it
      bcrypt.hash(requestedPassword, saltRounds, async function (err, hash) {
        if (err) console.log("Error hashing password");
        else {
          //if the hashing is done then execute the async function to register the new user
          await RegisterNewUserIntoDb(requestedLogin, hash, requestedFullName);

          //store the newly registered user into a queryResult cons
          const queryResult = await CheckIfUserIsAlreadyInDb(requestedLogin);

          //calling the async function GetAllProductsByUserId to retrieve all products submitted by the current user ID
          const userProducts = await GetAllProductsByUserId(
            queryResult.rows[0].id
          );

          //render the profile page while passing th required values
          res.render("profil.ejs", {
            userLogin: requestedFullName,
            userId: queryResult.rows[0].id,
            userProducts: userProducts.rows,
          });
        }
      });
    }
  }
});

//submit new product using submitProduct post route
app.post("/submitProduct", async (req, res) => {
  const name = req.body.name;
  const link = req.body.link;
  const description = req.body.description;
  const imageUrl = req.body.imageUrl;

  //insert new product into table
  if (
    await InsertNewProductIntoDb(
      name,
      description,
      link,
      imageUrl,
      req.body.userId
    )
  ) {
    console.log("product inserted successfully!");
    res.redirect("/");
  } else {
    console.log("Error inserting product");
  }
});

//listening to the declared server port
app.listen(port, () => {
  console.log("App listening on port : " + port);
});

/*---------------------------FUNCTIONS-----------------------------*/

//get all the products from the pg database
async function GetAllProductsFromDatabase() {
  try {
    return await client.query("SELECT * FROM products ORDER BY id DESC");
  } catch (error) {
    console.log("Can't query product selection from database : |" + error);
  }
}

//check if a user is present in the database based on a provided login
async function CheckIfUserIsAlreadyInDb(login) {
  try {
    return await client.query("SELECT * FROM users WHERE login=$1", [login]);
  } catch (error) {
    console.log(
      "Can't query user selection from db based on provided login : | " + error
    );
  }
}

//register a new user into the db using an async function
async function RegisterNewUserIntoDb(login, password, fullname) {
  try {
    await client.query(
      "INSERT INTO users(login,password,fullname) VALUES($1,$2,$3)",
      [login, password, fullname]
    );
  } catch (error) {
    console.log("Can't query new user insertion into the db : | " + error);
  }
}

//insert a new product into the database using an async function
async function InsertNewProductIntoDb(
  name,
  description,
  link,
  imageUrl,
  userId
) {
  try {
    return await client.query(
      "INSERT INTO products (name,description,link,image_url,user_id) VALUES ($1,$2,$3,$4,$5)",
      [name, description, link, imageUrl, userId]
    );
  } catch (error) {
    console.log("Insert Query Failed : | " + error);
  }
}

//get all the products by a specific user ID using an async function
async function GetAllProductsByUserId(userId) {
  try {
    return await client.query(
      "SELECT id,name,description,link,image_url FROM products WHERE user_id=$1",
      [userId]
    );
  } catch (error) {
    console.log("Can't query products by specific user ID");
  }
}
