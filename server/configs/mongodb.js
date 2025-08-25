import mongoose from "mongoose";

// connect to mongodb 
const connectDB = async()=>{
    mongoose.connection.on('connected', ()=> console.log('Database Connected'))
    await mongoose.connect(`${process.env.MONGODB_URI}/edvana-lms`)
}

export default connectDB