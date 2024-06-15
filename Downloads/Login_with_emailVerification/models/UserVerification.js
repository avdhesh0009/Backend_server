const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserVerificationSchema = new Schema({
    userId:String,
    uniqueString:String,
},{timestamps:true});

const UserVerification = mongoose.model("UserVerification",UserVerificationSchema);

module.exports=UserVerification;