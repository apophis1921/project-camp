import {User} from "../models/user.models.js";
import {ApiResponse} from "../utils/api-response.js";
import {ApiError} from "../utils/api-error.js";
import {asyncHandler} from "../utils/async-handler.js";
import {emailVerfMailGenContent, forgotPassMailGenContent, sendMail} from "../utils/mail.js";
import jwt from "jsonwebtoken";

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

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,{
            $set: {
                refreshToken: ""
            }
        },
        {
            new: true,
        }
    );
    const options = {
        httpOnly:true,
        secure: true
    }
    return res
            .status(200)
            .clearCookie("accessToken",options)
            .clearCookie("refreshToken",options)
            .json(
                new ApiResponse(200,{},"User logged out successfully")
            )
});

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken 

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Access")
    }

    try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user=await User.findById(decodedToken?._id);

    if(!user){
        throw new ApiError(401,"Invalid Refresh Token");
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401,"Refresh Token is expired");
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const {accessToken , refreshToken:newRefreshToken } = await generateAccessTokenAndRefreshTokens(user._id);

    user.refreshToken = newRefreshToken;
    await user.save()

    return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken , refreshToken : newRefreshToken},
                "Access Token refreshed"
            )
        )

    } catch (error) {
        throw new ApiError(401,"Invalid Refresh Token");
    }
})

const resendEmailVerification = asyncHandler(async(req,res)=>{
    const user = await User.findById(req.user?._id);

    if(!user){
        throw new ApiError(404,"User doesn't exist")
    }

    if(user.isEmailVerified){
        throw new ApiError(409,"Email is already verified");
    }

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

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Mail has been send to your email ID"
            )
        )

})    

const verifyEmail = asyncHandler(async(req,res)=>{
    const {verificationToken} = req.params 

    if(!verificationToken){
        throw new ApiError(400,"Email verification token is missing")
    }

    let hashedToken = crypto
                .createHash("sha256")
                .update(verificationToken)
                .digest("hex")

    const user = await User.findOne({
            emailVerificationToken : hashedToken ,
            emailVerificationExpiry : {$gt: Date.now()}
        })

    if(!user){
        throw new ApiError(400,"Token is invalid or expired");
    }

    user.emailVerificationToken = undefined ;
    user.emailVerificationToken = undefined ;

    user.isEmailVerified = true;
    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    isEmailVerified: true
                },
                "Email is Verified"
            )
        )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    req.user,
                    "Current user fetched successfully"
                )
            );
})

const forgotPasswordReq = asyncHandler(async(req,res)=>{
        const {email}= req.body;
        const user = await User.findOne({email});
        if(!user){
            throw new ApiError(404,"User does not exist",[])
        }
        const {unHashedToken , hashesdToken , tokenExpiry}= user.generateTemporaryToken();
        user.forgotPasswordToken = hashesdToken;
        user.forgotPasswordExpiry = tokenExpiry;

        await user.save({validateBeforeSave: false});

        await sendMail({
        email : user?.email,
        subject : "Password Reset Request",
        mailgenContent : forgotPassMailGenContent(
            user.username,
            `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unHashedToken}`//unhashed sent to user/browser rest saved in DB
        ),
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset mail has been sent on your registered mail"
            )
        )
})

const resetForgotPassword = asyncHandler(async(req,res)=>{
    const {resetToken} = req.params
    const {newPassword} = req.body

    let hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex")

    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
        forgotPasswordExpiry: {$gt: Date.now()}
    })

    if(!user){
        throw new ApiError(489,"Token is invalid or expired");
    }

    user.forgotPasswordExpiry = undefined ;
    user.forgotPasswordToken  = undefined ;

    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password reset successfully"
            )
        )
})

const changeCurrPass = asyncHandler(async(req,res)=>{
    const {oldPassword , newPassword} = req.body

    const user = await User.findById(req.user?._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid){
        throw new ApiError(400,"Invalid Previous Password");
    }

    user.password = newPassword 
    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully"
            )
        );
})

export {registerUser , 
        login ,
        logoutUser , 
        getCurrentUser ,
        verifyEmail,
        resendEmailVerification,
        refreshAccessToken,
        forgotPasswordReq,
        resetForgotPassword,
        changeCurrPass
};
