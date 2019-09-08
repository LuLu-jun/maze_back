var express = require('express');
var router = express.Router();

var Ending = require('../models/ending');
var validateAndGetProgress = require('./login').validateAndGetProgress;
var allowPage = require('./next').allowPage;

router.get('/:id/:pwd', function(req, res){
    validateAndGetProgress(req.params.id, req.params.id, function(progress, member){
        if (progress == undefined) {
            res.json({
                result: 0,
                error: 'user validating failed'
            });
            return;
        }

        const requestPage = { type: 'ending' };
        if (!allowPage(requestPage, progress)){
            res.json({
                result: 0,
                error: 'invalidate request'
            });
            return;
        }

        Ending.find({ classType: member.classType })
            .exec(function (err, ending) {
                if (err){
                    res.json({
                        result: 0,
                        error: err.errmsg
                    });
                }
                else if (ending.length != 1){
                    res.json({
                        result: 0,
                        error: 'There is no ending!'
                    });
                }
                else{
                    res.json({
                        result: 1,
                        imageURL: ending[0].fileURL
                    });
                }
            });
    });
});

module.exports = router;