var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var progressSchema = new Schema({
    classNum: { type: Number, required: true, unique: true },
    warningNum: { type: Number, required: true },
    problems: { type: Array, required: true }, //
    stories: { type: Array, required: true }, //save type for story number
    branches: { type: Array, required: true }, //save each branch's id
    recentPage: {
        type: { type: String, enum: ['problem', 'story', 'branch'], required: true },
        number: { type: Number, required: true }, //number means index of each type(problem. story, branch)
    }
});

module.exports = mongoose.model('progress', progressSchema);