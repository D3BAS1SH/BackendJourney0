import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const TheUser = await User.findById(userId)
        const TheUserRefreshToken = TheUser.generateReFreshToken()
        const TheUserAccessToken = TheUser.generateAccessToken()

        TheUser.refreshToken=TheUserRefreshToken
        await TheUser.save({validateBeforeSave:false})

        return {TheUserAccessToken,TheUserRefreshToken}

    } catch (error) {
        throw new ApiError(500,"Something Went wrong. While generating refresh and access token")
    }
}

const registerUser = asyncHandler( async (req,res)=>{
    // Get user details from frontend
    // console.log(req);
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
    // console.log("Input validation Checking Success");


    // Check if user already exists by username or email
    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })
    if(existedUser){
        throw new ApiError(409,"User Already exits.")
    }
    // console.log("Check if the user already exits in the database check : success");


    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is required.")
    }
    // console.log("Checking for images and avatar");


    // upload them to cloudinary, avatar
    const avatarStatus = await uploadOnCloudinary(avatarLocalPath);
    const coverImageStatus = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatarStatus){
        throw new ApiError(400,"Avatar file is required.")
    }
    // console.log("Upload on cloudinary success");


    // create user object - create entry in DB.
    const userStatus = await User.create({fullname,avatar:avatarStatus.url,coverImage:coverImageStatus?.url || "",email,password,username:username.toLowerCase()})
    // console.log("Database qurey added");


    // remove password and refresh token field from response.
    const userCreated = await User.findById(userStatus._id).select(
        "-password -refreshToken"
    )
    // console.log("Filtering password and refreshtoken");


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

const loginUser = asyncHandler(async(req,res)=>{
    //Username or email and password -> req.body

    const {email,username,password} = req.body

    //Username or email way access

    if(!username && !email){
        throw new ApiError(400,"username or email is required.!")
    }

    //find the user

    const Theuser=await User.findOne({
        $or:[{username},{email}]
    })

    if(!Theuser){
        throw new ApiError(404,"User not found")
    }

    //password check

    const isPasswordValid=await Theuser.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Password is incorrect.!")
    }

    //access and refreshToken

    const {TheUserAccessToken,TheUserRefreshToken} = await generateAccessAndRefreshTokens(Theuser._id)

    //send cookies

    const LogedInUser = await User.findById(Theuser._id).select("-password -refreshToken")

    const options ={
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken",TheUserAccessToken,options).cookie("refreshToken",TheUserRefreshToken,options).json(new ApiResponse(200,{
        user:LogedInUser,TheUserAccessToken,TheUserRefreshToken
    },"User logged in Successfully."))
})

const logoutUser = asyncHandler(async(req,res)=>{
    const myUser = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options ={
        httpOnly:true,
        secure:true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options).json(new ApiResponse(200,{},"User LoggedOut succesfully"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookie.refreshToken||req.body.refreshToken;
    if (!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request.")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user){
            throw new ApiError(401,"Invalid refreshToken")
        }
    
        if(incomingRefreshToken !== user.refreshToken){
            throw new ApiError(401,"Refresh token is expired.")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {TheUserAccessToken,TheUserRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200).cookie("accessToken",TheUserAccessToken,options).cookie("refreshToken",TheUserRefreshToken,options).json(new ApiResponse(200,{TheUserAccessToken,TheUserRefreshToken},"Access Token Refreshed."))
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token")
    }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}