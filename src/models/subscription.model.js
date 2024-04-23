import mongoose,{Schema, model} from "mongoose";

const SubscriptionSchema= new Schema({
    subscribers:{
        //One who is subscribing
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{
        //one who is subscribed.
        type:Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true})

export const Subscription = mongoose.model("Subscription",SubscriptionSchema)