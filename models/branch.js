var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var branchSchema = new Schema({
    classType: {
        type: String,
        enum: ['전기', '후기']
    },
    beforeStory: { type: String },
    yesStory: { type: String },
    noStory: { type: String },
    fileURL: { type: String, required: true, unique: true },
    filePath: { type: String, required: true, unique: true }
});

branchSchema.index({ classType: 1, beforeStory: 1 }, { unique: true });
branchSchema.index({ classType: 1, yesStory: 1 }, { unique: true });
branchSchema.index({ classType: 1, noStory: 1 }, { unique: true });

module.exports = mongoose.model('branch', branchSchema);