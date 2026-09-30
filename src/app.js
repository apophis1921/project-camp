import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//basic configurations
app.use(express.json({limit:"16kb"}));//in order to accept json data
app.use(express.urlencoded({extended: true,limit:"16kb"}));//to accept newly formatted urls like %20 stuff
app.use(express.static("public"));
app.use(cookieParser())
//CORS configurations
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(",")|| "http://localhost:5173" , // to get the urls
    credentials:true,// to allow cookies
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders:["Content-Type","Authorization"],
}));

//import the routes
import healthCheckRouter from "./routes/healthCheck.routes.js";
import authRouter from "./routes/auth.routes.js";

app.use("/api/v1/healthcheck",healthCheckRouter);
app.use("/api/v1/auth",authRouter);

app.get("/",(req,res)=>{
    res.send("Welcome to basecampy backend");
});

export default app;
