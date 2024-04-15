import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'

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

    const avatarStatus = await uploadOnCloudinary(avatarLocalPath);
    const coverImageStatus = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatarStatus){
        throw new ApiError(400,"Avatar file is required.")
    }

    // create user object - create entry in DB.

    const userStatus = await User.create({fullname,avatar:avatarStatus.url,coverImage:coverImageStatus?.url || "",email,password,username:username.toLowerCase()})

    // remove password and refresh token field from response.

    const userCreated = await User.findById(userStatus._id).select(
        "-password -refreshToken"
    )

    // check for user creation.

    if(!userCreated){
        throw new ApiError(400,"Something went wrong in server thank you.")
    }

    // return response
    /* res.status(200).json({
        message:"Hello friends"
    }) */

    return res.status(201).json(new ApiResponse(200,userCreated,"User created succefully."))
})

export {registerUser}