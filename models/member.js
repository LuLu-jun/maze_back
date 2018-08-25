var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var memberSchema = new Schema({
    classNum: { type: Number, required: true, unique: true },
    id: { type: String, required: true, unique: true },
    pwd: { type: String, required: true },
    classType: {
        type: String, required: true,
        validate: [classTypeConstraint, 'Error : class type is not valid']
    },
    problemType: { type: String, required: true },
    hintCodes: {
        type: Array, required: true,
        validate: [arrayLimit, 'Error : Number of hintcode is not valid']
    }
});

function classTypeConstraint(val){
    return (val==="전기" || val==="후기");
}

function arrayLimit(val) {
    return val.length == 3;
}

module.exports = mongoose.model('member', memberSchema);