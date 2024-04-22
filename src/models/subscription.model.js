import mongoose,{Schema, model} from "mongoose";

const SubscriptionSchema= new Schema({})

export const Subscription = mongoose.model("Subscription",SubscriptionSchema)