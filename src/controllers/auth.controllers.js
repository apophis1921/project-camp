import {User} from "../models/user.models.js";
import {ApiResponse} from "../utils/api-response.js";
import {ApiError} from "../utils/api-error.js";
import {asyncHandler} from "../utils/async-handler.js";
import {emailVerfMailGenContent, sendMail} from "../utils/mail.js";

const generateAccessTokenAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId) ;
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;//access token is not defined cause You're 
        //storing the refresh token in the database, but the access token is not stored in the user document.
        await user.save({validateBeforeSave: false});
        return {accessToken , refreshToken};
    } catch (error) {
        throw new ApiError(
            500,
            "Some error occured while generating access token."
        )
    }
};

const registerUser = asyncHandler(async (req,res)=>{
    const {email,username,password,role}= req.body;//data is recieved
    const existingUser= await User.findOne({//if user already exists in DB
        $or: [{username},{email}]
    })
    if(existingUser){
        throw new ApiError(409,"User with same credentials already exists.");
    }

    const user = await User.create({//if user doesn't exist we create a new user
        email,
        password,
        username,
        isEmailVerified : false 
    })

    const {unHashedToken,hashedToken,tokenExpiry} = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken ;
    user.emailVerificationExpiry = tokenExpiry;

    await user.save({validateBeforeSave : false});

    await sendMail({
        email : user?.email,
        subject : "Please verify your email mate.",
        mailgenContent : emailVerfMailGenContent(
            user.username,
            //Generating a dynamic link
            `${req.protocol}://${req.get("host")}/api/v1/users/ 
            verify-email/${unHashedToken}`
        ),
    });

    //CreatedUser is fetching the user that was just created, but without sensitive fields.
    const createdUser = await User.findById(user._id).select(//as user sends all the fields it has
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry", //by this not required fields can be deleted                                                                             
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering a user.")
    }

    return res
        .status(201)
        .json(
            new ApiResponse(
                200,
                {user: createdUser},
                "User registered successfully and verification email has been sent to your registered email.",
            )
        ) ;
});

const login = asyncHandler(async(req,res)=>{
    const {email,password,username} = req.body

    if(!email){
        throw new ApiError(400,"Email is required")
    }

    const user  = await User.findOne({ email });

    if(!user){
        throw new ApiError(400,"User doesn't exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(400 , "Invalid Credentials")
    };

    const {accessToken , refreshToken} = await generateAccessTokenAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken -emailVerificationToken -emailVerificationExpiry",                                                          
    );

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser ,
                    accessToken ,
                    refreshToken
                },
                "User logged in successfully"
            )
        )
});

export { registerUser , login};
