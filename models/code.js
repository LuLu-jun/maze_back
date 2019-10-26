var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var codeSchema = new Schema({
    num: { type: Number, required: true },
    answer: { type: String, required: true },
    classType: {
        type: String, required: true,
        validate: [classTypeConstraint, 'Error : class type is not valid']
    },
    problemType: {
        type: String, required: true,
        validate: [problemTypeConstraint, 'Error : problem type is not valid']
    },
    hints: {
        type: Array, required: true,
        validate: [hintsConstraint, 'Number of hint is not valid']
    },
    fileURL: { type: String, required: true, unique: true },
    filePath: { type: String, required: true, unique: true },
});

//problemSchema.index({ num: 1, classType: 1, problemType: 1 }, { unique: true });

function classTypeConstraint(val){
    return (val==="전기" || val==="후기");
}

function problemTypeConstraint(val){
    return (val==="A" || val==="B" || val==='C');
}

function hintsConstraint(val) {
    return val.length == 3;
}

module.exports = mongoose.model('code', codeSchema);
