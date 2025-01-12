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
import "dotenv/config";
//import multer package for handling images and files upload
import multer from 'multer';
//import the passport middleware for authentication functionalities
import passport from 'passport';

//import passport local strategy
import LocalStrategy from 'passport-local';
//import the session management package from express
import session from 'express-session';

//use the memory storage method from multer which keeps the uploaded images in memory
//as a buffer type
const upload = multer({ storage: multer.memoryStorage() });

//password encryption rounds
const saltRounds = 10;

//instanciate a new Client object with the name client and configure the database
//while storing the values into environment variables
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

//initialize the express session module for managing session
app.use(session({
  secret:process.env.sessionSecretKey,
  resave:false,
  saveUninitialized:false,
}));

//initialize passport and session handling
app.use(passport.initialize());
app.use(passport.session());

//configure and use the passport local strategy  
passport.use(new LocalStrategy(async function verify(username,password,done){

  try {
    
    const queryResult = await CheckIfUserIsAlreadyInDb(username);
    const user = queryResult.rows[0];
    
    //in case the user is not found in the database using the previous function
    if(!user){
      console.log("user not found in db !");
    return done(null,false,{message:"Incorrect Username!"});
    }
    
    //else proceed with bcrypt passwords comparing
    bcrypt.compare(password,user.password,(error,result)=>{
    
    //if there is a bcrypt compare error return the error
    if(error) return done(error);
    
    //if the password is incorrect return incorrect password
    if(!result) return done(null,false,{message:"incorrect password!"});
    
    //if the password is correct return the user
    return done(null,user);
    
    });

  } catch (error) {
    return done(error);
  }

}));

//serialize the id of the authenticated user 
passport.serializeUser((user,done)=>{
  done(null,user.id);
});

//deserialize the user and get all his informations based on the id stored in the session
passport.deserializeUser(async(id,done)=>{

  try {
    const queryResult = await client.query("SELECT * FROM users WHERE id=$1",[id]);
 done(null,queryResult.rows[0]);
  } catch (error) {
    done(error);
  }
 
});

//getting the home route
app.get("/", async (req, res) => {
  //get all the products from the database using an async function that handles the selection query and storing the value in a const
  const queryResult = await GetAllProductsFromDatabase();

  //access the rows value from the query result and storing it in a products const
  const products = queryResult.rows;

  // convert binary image data to base64 for display in the frontend
  products.forEach((product) => {
  if (product.image_url) {
    product.image_url = product.image_url.toString("base64");
  }
});

  //rendering the index.ejs route while passing the products object array
  res.render("index.ejs", { products: products});
});


//handle the login route while using the passport authentication middleware
app.post("/login",passport.authenticate("local",{
  successRedirect:"/profil",
  failureRedirect:"/",
  failureFlash:false,
}), (req, res) => {
  console.log("Session after login:", req.session);
});

//handle the register route
app.post("/register", async (req, res) => {
  //getting the requested fullname,login,password,password confirmation form the register form and storing the data in consts
  const requestedFullName = req.body.fullname;
  const requestedLogin = req.body.login;
  const requestedPassword = req.body.password;
  const requestedPassword2 = req.body.password2;

  //check if all requested fields are not empty
  if(requestedFullName && requestedLogin && requestedPassword && requestedPassword2){
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

          //render the profile page while passing the required values
          res.render("profil.ejs", {
            userLogin: requestedFullName,
            userId: queryResult.rows[0].id,
            userProducts: userProducts.rows,
          });
        }
      });
    }
  }}else{
    console.log("Please fill all register informations");
  }

});

//make sure that the user is authenticated
function ensureAuthenticated(req,res,next){
  if(req.isAuthenticated()){
    console.log("user is authenticated proceed on the profile route")
    return next();
  }
  console.log("user not authenticated returning to home route");
  res.redirect("/");
}

//handling the profile route and ensuring the user is authenticated usign the previous function
app.get("/profil", ensureAuthenticated, async (req, res) => {
  const userProducts = await GetAllProductsByUserId(req.user.id);
  res.render("profil.ejs", {
    userLogin: req.user.fullname,
    userId: req.user.id,
    userProducts: userProducts.rows,
  });
});

//submit new product using submitProduct post route
app.post("/submitProduct",upload.single("imageUrl"), async (req, res) => {
  const name = req.body.name;
  const link = req.body.link;
  const description = req.body.description;
  const userId = req.body.userId;

  //get the binary data of the uploaded image
  const imageBuffer = req.file ? req.file.buffer : null;


  //insert new product into table
  if (
    await InsertNewProductIntoDb(
      name,
      description,
      link,
      imageBuffer,
      userId
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
  imageBuffer,
  userId
) {

  try {
    return await client.query(
      "INSERT INTO products (name,description,link,image_url,user_id) VALUES ($1,$2,$3,$4,$5)",
      [name, description, link, imageBuffer, userId]
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
