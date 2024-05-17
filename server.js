import express from "express"
import axios from "axios"
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import bcrypt from "bcrypt";
import pg from "pg";

const app = express()
const port = 3000;
const saltRounds = 10;
const db = new pg.Client({
    user : "postgres",
    host : "localhost",
    database : "ev",
    password : "Udhay123",
    port : 5432,

})

db.connect();


const stations = {
    1 : {
        id : 1,
        name : "Udhay EV charging",
        latLon : [11.0168, 76.9558],
        address : "Coimbatore main",
        rating : 4.3,
        distance : 0
    },
    2 : {
        id : 2,
        name : "Abi EV charging",
        latLon : [11.3410,  77.7172],
        address : "Erode main",
        rating : 4.1,
        distance : 0
    }

}

app.use(bodyParser.urlencoded({extended : true}));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(session({
    secret : "TOPSECRET123",
    resave : false,
    saveUninitialized : true,
    
}))

app.use(passport.initialize());
app.use(passport.session());



const myLocation = [11.1085, 77.3411]

app.use(express.static("public"))


app.get("/login",(req,res)=>{
    
        res.render("login.ejs");
    
})

app.post("/login", (req, res , next)=>{
    passport.authenticate( "local" , (err , user , info)=>{
        if(err){
            return res.render("login.ejs",{ error : err , isAutheticated : req.isAuthenticated(),user : req.user || null})
        }
        req.login(user , (err)=>{
            if(err){
                return res.render("login.ejs",{error : err , isAutheticated : req.isAuthenticated(),user : req.user || null});
            }
    
            res.redirect("/")
            
        })
    })(req , res , next);
})

app.get("/register",(req,res)=>{
    res.render("signup.ejs");
})

app.post("/register",async (req,res)=>{
    const name = req.body.name
    const email = req.body.username;
    const password = req.body.password;
    const contact = req.body.phone;
    console.log(req.body);
    try{
       await db.query("SELECT * FROM users WHERE email = $1;",[email],(err , r)=>{
            if(err) throw err;
            if(r.rows.length > 0){
                return res.render("signup.ejs",{error : "User already exist with this email"});
            }
            else{
                bcrypt.hash(password , saltRounds , async (err , encryptedPass)=>{
                    if (err) {
                        console.log(err.message);
                        throw err;
                    }
                    else{
                        const result = await db.query(`INSERT INTO users (name , email , password , contact ) VALUES ($1,$2,$3,$4) RETURNING id;`,[name , email , encryptedPass , contact]);
                        console.log(result.rows[0].id);
                        const userDetails = await db.query(`SELECT * FROM users WHERE id=$1;`,[result.rows[0].id]);
                        const user = userDetails.rows[0];
                        
                        console.log(user);
                        req.login(user , (err)=>{
                            if(err){
                                console.log("ERROR LOGIN");
                                throw err;
                            }
                            res.render("home.ejs",{isAuthenticated : req.isAuthenticated , name : user.name});
                        });
                    }
                    
                })
                
            }

        });    
    }
    catch(err){
        return res.render("signup.ejs",{error : err});
    }
    
})




app.get("/",(req,res)=>{
    if(req.isAuthenticated()){
        res.render("home.ejs",{isAuthenticated : req.isAuthenticated(), name : req.user.name || null});
    }
    else{
        res.render("home.ejs",{isAuthenticated : false});
    }
    
})

app.get("/stations",(req,res)=>{
    if (req.isAuthenticated()) {
        res.render("stations.ejs", { isAuthenticated: true, name: req.user.name });
    } else {
        res.redirect("/login");
    }
    
    
})




app.post("/stations",async (req,res)=>{
    if(req.isAuthenticated()){

    
    const body = req.body;
    console.log(body);
    
    let stationDetails = [];
    
    let destinations = "";
    for(let station in stations){
        let loc = stations[station].latLon
        console.log(loc);
        destinations += `${stations[station].latLon[0]},${stations[station].latLon[1]};`
    }
    console.log(destinations);
    const options = {
        method: 'GET',
        url: 'https://trueway-matrix.p.rapidapi.com/CalculateDrivingMatrix',
        params: {
          origins: `${body.lat},${body.long}`,
          destinations: '11.0168,76.9558;11.3410,77.8172;'
        },
        headers: {
          'X-RapidAPI-Key': '998d91f4fcmsh946de144f469081p135899jsn50f694b83e94',
          'X-RapidAPI-Host': 'trueway-matrix.p.rapidapi.com'
        }
      };
      
      try {
          const response = await axios.request(options);
          console.log(response.data);
          let distance = response.data.distances[0];
          console.log(distance)
          
          for(let i in distance){
            // console.log(stations)
            stations[parseInt(i) + 1].distance = distance[i] / 1000;
            stationDetails.push(stations[parseInt(i) + 1]);

          }
      } catch (error) {
          console.error(error);
      }

    stationDetails.sort(function(a, b) {
        return a.distance - b.distance; // Sort in ascending order of age
    });
    console.log(stationDetails);
    res.render("stations.ejs",{stations : stationDetails , isAuthenticated: true, name: req.user.name })
    }
    else{
        res.redirect("/login")
    }

})



app.get("/booking/:id",(req,res)=>{
    if(req.isAuthenticated()){
        const id = req.params.id;
        let data = stations[id];
        return res.render("booking.ejs",{data : data});
    }
    else{
        res.redirect('/login')
    }
    

})

app.post("/booking/:id",async (req,res)=>{
    if(req.isAuthenticated()){
        const stationId = req.params.id;
        const carModel = req.body['car-model-name'];
        const connector = req.body.connector;
        const vehicleNumber = req.body["vehicle-number"]
        const timeSlot = req.body.slot;
        console.log(stationId)
        console.log(carModel)
        console.log(connector)
        console.log(vehicleNumber)
        console.log(timeSlot)
        const result  = await db.query("SELECT * FROM stations WHERE id = $1;",[stationId]);
        console.log(result.rows);
        res.render("confirmation.ejs",{isAuthenticated: true, name: req.user.name , data : req.body , station : result.rows[0] });
    }
    else{
        res.redirect("/login");
    }
    
    

})



app.get("/getStations",(req,res)=>{
    res.send(JSON.stringify(stations));
})

app.get("/logout", (req, res) => {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });

passport.use("local" , new Strategy(async function verify(username , password , cb) {
    try{
        const result = await db.query("SELECT * FROM users WHERE email=$1;",[username]);
        
        if(result.rows.length > 0){
            const user = result.rows[0];
            const storedPass = user.password;
            bcrypt.compare(password , storedPass , (err , valid)=>{
                if(err){
                    cb(err);
                }
                if(valid){
                    cb(null,user);
                }
                else{
                    cb("Password doesn't match");
                }
            })
        }
        else{
            cb("No user found");
        }
    }
    catch(err){
        if (err) throw err;
    }
} ));



passport.serializeUser((user, cb) => {
    cb(null, user);
  });
passport.deserializeUser((user, cb) => {
cb(null, user);
});

app.listen(port,()=>[
    console.log(`Server is running on ${port}`)
]);