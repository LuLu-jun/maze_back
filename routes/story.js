var express = require('express');
var router = express.Router();

var Story = require('../models/story');
var validateAndGetProgress = require('./login').validateAndGetProgress;
var allowPage = require('./next').allowPage;

router.get('/:id/:pwd/:number', function (req, res, next){
    validateAndGetProgress(req.params.id, req.params.pwd,
        function(progress, member){
            if (progress == undefined) {
                res.json({
                    result: 0,
                    error: 'user validating failed'
                });
                return;
            }

            const requestPage = {
                type: 'story',
                number: req.params.number
            };
            if (!allowPage(requestPage, progress)){
                res.json({
                    result: 0,
                    error: 'invalidate request'
                });
                return;
            }

            const storyType = progress.stories[requestPage.number - 1];

            Story.find({ num: Number(req.params.number), classType: member.classType, storyType: storyType})
                .exec(function(err, story) {
                    if (err){
                        res.json({
                            result: 0,
                            error: err.errmsg
                        });
                    }
                    else if (story.length != 1){
                        res.json({
                            result: 0,
                            error: 'There is no story!'
                        });
                    }
                    else{
                        let begin = (new Date().getTime());
                        if (progress.problems[Number(req.params.number) - 2]){
                          begin = progress.problems[Number(req.params.number) - 2].end
                        }
                        let end = progress.problems[Number(req.params.number) - 1].begin;
                        if (end == -1) end=undefined;
                        res.json({
                            result: 1,
                            imageURL: story[0].fileURL,
                            begin: begin,
                            end: end,
                        });
                    }
                });
        }
    );
});

module.exports = router;
