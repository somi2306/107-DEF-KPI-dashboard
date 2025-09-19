
import mongoose from "mongoose";
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to Azure MongoDB ${conn.connection.host}`); 
  } catch (error) {
    console.log(`Failed to connect to Azure MongoDB`, error);
    process.exit(1); 
  }
};