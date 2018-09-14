var express = require('express');
var router = express.Router();

var Problem = require('../models/problem');
var validateGetProgress = require('./login').validateAndGetProgress;
var comparePage = require('./next').comparePage;

router.get('/:id/:pwd/:number', function(req, res, next){
    validateGetProgress(req.params.id, req.params.pwd,
        function(progress, member){
            if (progress == undefined) {
                res.json({
                    result: 0,
                    error: 'user validating failed'
                });
                return;
            }

            const requestPage = {
                type: 'problem',
                number: Number(req.params.number)
            };
            if (comparePage(requestPage, progress.recentPage) < 0){
                res.json({
                    result: 0,
                    error: 'invalidate request'
                });
                return;
            }

            const problemNum = Number(req.params.number);
            Problem.find({ num: problemNum, classType: member.classType, problemType: member.problemType[problemNum - 1] })
                .exec(function(err, problem){
                    if (err){
                        res.json({
                            result: 0,
                            error: err.errmsg
                        });
                    }
                    else if (problem.length != 1){
                        res.json({
                            result: 0,
                            error: 'There is no problem!'
                        });
                    }
                    else{
                        res.json({
                            result: 1,
                            imageURL: problem[0].fileURL,
                            begin: progress.progress[problemNum - 1].begin
                        });
                    }
                });
        }
    );
});

module.exports = {
    router: router
};