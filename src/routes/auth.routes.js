import {Router} from "express"; 
import {registerUser , 
        login ,
        logoutUser , 
        getCurrentUser ,
        verifyEmail,
        resendEmailVerification,
        refreshAccessToken,
        forgotPasswordReq,
        resetForgotPassword,
        changeCurrPass} from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validator.middleware.js";
import { userRegisterValidator ,userLoginValidator } from "../validators/index.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// unsecured route
router.route("/register").post(userRegisterValidator(),validate , registerUser);
router.route("/login").post(userLoginValidator(),validate, login );
router.route("/verify-Email/:verificationToken").get(verifyEmail);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(userForgotPasswordValidator(),validate ,forgotPasswordReq);
router.route("/reset-password/resetToken").post(userResetForgotPasswordValidator(),validate ,resetForgotPassword);

//secure routes
router.route("/logout").post(verifyJWT , logoutUser );
router.route("/current-user").get(verifyJWT , getCurrentUser );
router.route("/change-password").get(verifyJWT , userChangeCurrentPasswordValidator() , validate , changeCurrPass );
router.route("/resend-email-verification").post(verifyJWT , resendEmailVerification);
export default router ;