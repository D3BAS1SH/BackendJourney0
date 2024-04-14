import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'

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

    

    // check for images, check for avatar

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