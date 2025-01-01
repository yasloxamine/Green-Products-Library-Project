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

//parse the body of the ejs forms to handle data submittion
app.use(bodyParser.urlencoded({ extended: true }));

//getting the home route
app.get("/",async(req,res)=>{

    //get all the products from the database using an async function that handles the selection query and storing the value in a const
    const queryResult = await GetAllProductsFromDatabase();

    //access the rows value from the query result and storing it in a products const
    const products = queryResult.rows;

    //rendering the index.ejs route while passing the products object array
    res.render("index.ejs",{products:products});
});

//handle the login route
app.post("/login",async(req,res)=>{

//getting the requested login and password form the login form and storing the data in const
const requestedLogin = req.body.login;
const requestedPassword = req.body.password;

//calling the async function CheckFor.... and storing the result into a queryResult const
const queryResult = await CheckForTheRequestedLoginAndPasswordData(requestedLogin,requestedPassword);

const loginData = queryResult.rows;

console.log(loginData);


//check if the returned requested login and password is not an empty object if so then render the submitProduct.ejs else 
//show an error message
if(loginData.length > 0) {

    //calling the async function GetAllProductsByUserId to retrieve all products submitted by the current user ID
    const userProducts = await GetAllProductsByUserId(loginData[0].id);

//render the profile page while passing th required values
    res.render("profil.ejs",{userLogin:loginData[0].fullname,userId:loginData[0].id,userProducts:userProducts.rows});
    console.log("Correct!");
}
    
else {
    console.log("empty");
}
    
});

//submit new product using submitProduct post route 
app.post("/submitProduct",async(req,res)=>{

    const name = req.body.name;
    const link = req.body.link;
    const description = req.body.description;
    const imageUrl = req.body.imageUrl;

    //insert new product into table
if(await InsertNewProductIntoDb(name,description,link,imageUrl,req.body.userId)){
    console.log("product inserted successfully!");
    res.redirect("/");
}else{
    console.log("Error inserting product");
}
    
});

//listening to the declared server port
app.listen(port,()=>{
    console.log("App listening on port : "+port);
});


/*---------------------------FUNCTIONS-----------------------------*/

//get all the products from the pg database
async function GetAllProductsFromDatabase(){
    try {
        return await client.query("SELECT * FROM products ORDER BY id DESC");
    } catch (error) {
        console.log("Can't query product selection from database : |"+error);
    }
}

//check for the login and password values from the db against the requested ones and return the result
async function CheckForTheRequestedLoginAndPasswordData(login,password){
try {
    return await client.query("SELECT id,fullname FROM users WHERE login=$1 AND password=$2",[login,password]);
} catch (error) {
    console.log("Login Selection Query failed | "+error);
}
}

//insert a new product into the database using an async function
async function InsertNewProductIntoDb(name,description,link,imageUrl,userId){

    try {
        return await client.query("INSERT INTO products (name,description,link,image_url,user_id) VALUES ($1,$2,$3,$4,$5)",[name,description,link,imageUrl,userId]);
    } catch (error) {
        console.log("Insert Query Failed : | "+error);
    }

}

//get specific user from db using an async function
async function GetSpecificUserFromDb(userId){

    try {
        return await client.query("SELECT id FROM users WHERE id=$1",[userId]);
    } catch (error) {
        console.log("Can't process specific user selection from DB : | "+error);
    }
}

//get all the products by a specific user ID using an async function
async function GetAllProductsByUserId(userId){

    try {
        return await client.query("SELECT id,name,description,link,image_url FROM products WHERE user_id=$1",[userId]);
    } catch (error) {
        console.log("Can't query products by specific user ID");
    }
    
}

