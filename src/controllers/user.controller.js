import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"
import mongoose from 'mongoose'

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
                refreshToken:1
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
    // console.log(req.cookies);
    const incomingRefreshToken = req.cookies.refreshToken||req.body.refreshToken;
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

const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPassCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPassCorrect){
        throw new ApiError(400,"Invalid old password")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(
        new ApiResponse(200,{},"Password Changed Successfully")
    )
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(
        new ApiResponse(200,req.user,"Current user fetched successfully")
    )
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullname,email} =req.body
    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    const newUpdatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new:true}
    ).select("-password ")

    return res.status(200).json(
        new ApiResponse(200,newUpdatedUser,"Account details updated successfully")
    )

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar files is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"Avatar Changed Successfully")
    )
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const CoverImageLocalPath = req.file?.path
    if(!CoverImageLocalPath){
        throw new ApiError(400,"Cover Image files is missing")
    }

    const coverImage = await uploadOnCloudinary(CoverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on Cover Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200,user,"Cover Image Changed Successfully")
    )
})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params;

    if(!username?.trim()){
        throw new ApiError(400,"Username is missed or invalid.")
    }
    
    const channel =await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscribers",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                subscriberToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"$subscribers.subscribers"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                email:1,
                username:1,
                isSubscribed:1,
                subscriberCount:1,
                subscriberToCount:1,
                avatar:1,
                coverImage:1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400,"Channel Does not exist.")
    }

    return res.status(200).json(
        new ApiResponse(200,channel[0],"Channel Doc Retrived Successfully")
    )
})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:'videos',
                localField:'watchHistory',
                foreignField:'_id',
                as:'watchHistory',
                pipeline:[
                    {
                        $lookup:{
                            from:'users',
                            localField:'owner',
                            foreignField:'_id',
                            as:'owner',
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first:'$owner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200,user[0].watchHistory,"Watch history fetched successfully.")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}