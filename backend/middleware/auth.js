const jwt=require('jsonwebtoken');
module.exports=(req,res,next)=>{const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({message:'Authentication required'});try{req.user=jwt.verify(t,process.env.JWT_SECRET||'swiftlane_secret_change_me');next()}catch(e){res.status(401).json({message:'Invalid or expired token'})}};
