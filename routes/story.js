var express = require('express');
var router = express.Router();

var Story = require('../models/story');
var validateAndGetProgress = require('./login').validateAndGetProgress;
var comparePage = require('./next').comparePage;

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
            if (comparePage(requestPage, progress.recentPage) < 0){
                res.json({
                    result: 0,
                    error: 'invalidate request'
                });
                return;
            }

            Story.find({ num: Number(req.params.number), classType: member.classType })
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
                        res.json({
                            result: 1,
                            imageURL: story[0].fileURL
                        });
                    }
                });
        }
    );
});

module.exports = router;