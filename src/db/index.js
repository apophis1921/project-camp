import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection error",error);
        process.exit(1);//1 is the exit code , it tells OS that program exited with an error
    }
};

export default connectDB 