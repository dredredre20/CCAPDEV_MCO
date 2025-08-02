const mongoose = require('mongoose');

const errorLogSchema = new mongoose.Schema({
    message: {type : String, required : true}, 
    stack: {type: String}, 
    route: {type: String},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'UserProfile'}, 
    timestamp: {type: Date, default: Date.now}
});

module.exports = mongoose.model('ErrorLog', errorLogSchema);

