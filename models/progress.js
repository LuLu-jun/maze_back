var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var progressSchema = new Schema({
    classNum: { type: Number, required: true, unique: true },
    warningNum: { type: Number, required: true },
    progress: { type: Array, required: true }
});

module.exports = mongoose.model('progress', progressSchema);

