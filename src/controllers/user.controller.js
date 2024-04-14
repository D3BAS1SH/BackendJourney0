import {asyncHandler} from '../utils/asyncHandler.js'

const registerUser = asyncHandler( async (req,res)=>{
    // Get user details from frontend
    const {fullname,email,username,password} = req.body
    console.log(email,fullname);
    // validation - (not empty)
    
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