var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var storySchema = new Schema({
    num: { type: Number, required: true },
    classType: {
        type: String,
        enum: ['전기', '후기']
    },
    storyType: {
        type: Number,
        enum: [1, 2, 3, 4]
    },
    fileURL: { type: String, required: true, unique: true },
    filePath: { type: String, required: true, unique: true },
});

storySchema.index({ num: 1, classType: 1, storyType: 1 }, { unique: true });

module.exports = mongoose.model('story', storySchema);