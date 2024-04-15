import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB=async()=>{
    try {
        const connectionResp = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        // console.log(connectionResp);
        console.log(`\nMongoDB connected HOST : ${connectionResp.connection.host}`);
    } catch (error) {
        console.log("MongoDB connection error",error);
        process.exit(1)
    }
}

export default connectDB;