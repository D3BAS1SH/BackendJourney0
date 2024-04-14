import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"

const registerUser = asyncHandler( async (req,res)=>{
    // Get user details from frontend
    const {fullname,email,username,password} = req.body
    console.log(email,fullname);
    // validation - (not empty)
    /* if(fullname===""){
        throw new ApiError(400,'full name is required.');
    } */
    if(
        [fullname,email,username,password].some((fields)=>fields?.trim()==="")
    ){
        throw new ApiError(400,'All fields are required.');
    }
    // Check if user already exists by username or email

    const existedUser = User.findOne({
        $or:[{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User Already exits.")
    }

    // check for images, check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is required.")
    }

    // upload them to cloudinary, avatar

    // create user object - create entry in DB.

    // remove password and refresh token field from response.

    // check for user creation.

    // return response
    res.status(200).json({
        message:"Hello friends"
    })
})

export {registerUser}