module.exports = (func) => {
    return (req,res,next)=>{
      // this is same as below : func(req,res).catch(err=>next(err))
      func(req,res,next).catch(err=>{
          console.log(err.message)
          return res.status(400).json({
              statusCode: 400,
              message: "some error"
          })
      })
    }
  }