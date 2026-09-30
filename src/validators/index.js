import {body} from "express-validator";

const userRegisterValidator = () =>{
    return[
        body("email")
                .trim()
                .notEmpty()
                .withMessage("Email is required") // with mesg runs when above method fails
                .isEmail()
                .withMessage("Email is invalid"),
        body("username")
                .trim()
                .notEmpty()
                .withMessage("Username is required")
                .isLowercase()
                .withMessage("Username must be in lower case")
                .isLength({min: 3})
                .withMessage("Username must be atleast 3 characters long"),
        body("password")
                .trim()
                .notEmpty()
                .withMessage("Password cannot be empty"),
        body("fullname")
                .optional()
                .trim(),
    ]
};

const userLoginValidator = ()=>{
        return[
                body("email")
                .optional()
                .isEmail()
                .withMessage("Email is invalid"),
                body("password")
                .notEmpty()
                .withMessage("Password is required")
        ]
}

export {
    userRegisterValidator ,userLoginValidator
}