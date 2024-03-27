// const asyncHandler = ()=>{}

// const asyncHandler = () =>{}
// const asyncHandler = (fn) =>{()=>{}}
// const asyncHandler = (fn) => async() => {}


//How this method is formed is above represted.
/* const asyncHandler = (fn) => async(req,res,next) => {
    try {
        await fn(req,res,next)
    } catch (error) {
        res.status(err.code||500).json({
            success:false,
            message: err.message
        })
    }
} */

//Custom API response error handling

const asyncHandler =(requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).catch((err)=>next(err))
    }
}

export {asyncHandler}