var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var endingSchema = new Schema({
    classType: {
        type: String,
        enum: ['전기', '후기']
    },
    fileURL: { type: String, required: true, unique: true },
    filePath: { type: String, required: true, unique: true }
});

endingSchema.index({classType: 1}, { unique: true });

module.exports = mongoose.model('ending', endingSchema);