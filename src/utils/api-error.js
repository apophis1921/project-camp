class ApiError extends Error {
    constructor(
        statusCode,message="Something ain't right bro ",errors=[],stack=""
    ){
        super(message);//super is used to utilize the parent class here = Error
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.success = false;
        this.errors = errors;
        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this,this.constructor);
        }
    }
}

export {ApiError};