//models are used to define how data is stored and used 
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
    {
        avatar:{
            type: {
                url: String,
                localPath: String,
            },
            default:{
                url:``,
                localPath:"https://placehold.co/200x200",
            }
        },
        username:{
            type:String,
            required: true,// using mongoose 
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email:{
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName:{
            type: String,
            trim: true,
        },
        password:{
            type : String,
            required : [true,"Password is required"]
        },
        isEmailVerified: {
            type : Boolean,
            default: false
        },
        refreshToken:{
            type: String
        },
        forgotPasswordToken: {
            type : String ,
        },
        forgotPasswordExpiry: {
            type : Date
        },
        emailVerificationToken:{
            type : String
        },
        emailVerificationExpiry:{
            type : Date 
        }
    }, {
        timestamps : true 
    },
);

userSchema.pre("save",async function(){
    //Safegurad mechanism so that hashing occurs only when password is reseted or set for first time
    //Not every time when pre Hooh runs with the "save" functionality
    if(!this.isModified("password")) return ;

    this.password= await bcrypt.hash(this.password, 10);
    
});

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password , this.password);
};

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id : this._id,
            email: this.email,
            username: this.username
        },
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn: process.env.ACCESS_TOKEN_EXPIRY}
    )
};

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
           _id : this._id,
            email: this.email,
            username: this.username 
        },
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn: process.env.REFRESH_TOKEN_EXPIRY}
    )
};

//Temporary tokens for user verification and password reset etc.
userSchema.methods.generateTemporaryToken=function(){
    const unHashedToken = crypto.randomBytes(20).toString("hex") ;
    const hashedToken = crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex") ;
    const tokenExpiry = Date.now() + (20*60*1000) ;
    return {unHashedToken,hashedToken,tokenExpiry};
};


export const User = mongoose.model("User", userSchema);
