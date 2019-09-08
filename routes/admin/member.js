var express = require('express');
var router = express.Router();

var Member = require('../../models/member');
var Progress = require('../../models/progress');
var validateAdmin = require('../login').validateAdmin;

router.get('/:id/:pwd', function(req, res, next) {
    if (validateAdmin(req.params.id, req.params.pwd)){
        Member.find({}).sort({classNum: 1}).exec(function(err, members){
            if(err){
                //console.error(err);
                res.json({
                    result: 0,
                    error: err.errmsg
                });
                return;
            }
            res.json({
                result: 1,
                members: members
            });
        });
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

router.post('/:id/:pwd', function(req, res){
    if (validateAdmin(req.params.id, req.params.pwd)){
        if (req.body.classNum == undefined || req.body.id == undefined || req.body.pwd == undefined
        || req.body.classType == undefined || req.body.problemType == undefined
        || req.body.hintCodes[0] == undefined || req.body.hintCodes[1] == undefined || req.body.hintCodes[2] == undefined){
            res.json({
                result: 0,
                error: 'Not enough request'
            });
            return;
        }

        var member = new Member();
        member.classNum = req.body.classNum;
        member.id = req.body.id;
        member.pwd = req.body.pwd;
        member.classType = req.body.classType;
        member.problemType = req.body.problemType;
        member.hintCodes = [];

        for (var i=0; i<3;i ++){
            member.hintCodes.push({
                code: req.body.hintCodes[i],
                used: false
            });
        }

        member.save(function(err){
            if(err){
                //console.error(err);
                res.json({
                    result: 0,
                    error: err.errmsg
                });
                return;
            }

            var progress = new Progress();
            progress.classNum = req.body.classNum;
            progress.warningNum = 0;
            progress.recentPage = {
                type : 'story',
                number : 1
            };
            progress.problems = [];
            for (var i=0; i<10; i++){
                progress.problems.push(
                    { begin: -1, end: -1, hints: [false, false, false] }
                );
            }
            progress.stories = [];
            for (var i=0; i<10; i++){
                progress.stories.push(-1);
            }
            progress.stories[0] = 1;
            progress.branches = [];
            for (var i=0; i<5; i++){
                progress.branches.push(
                    { id: "", storyNumber: -1 }
                );
            }

            progress.save(function(err){
                if(err){
                    //console.error(err);
                    res.json({
                        result: 0,
                        error: err.errmsg
                    });
                    return;
                }

                res.json({result: 1});
            });
        });
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

router.delete('/:id/:pwd/:classNum', function(req, res){
    if (validateAdmin(req.params.id, req.params.pwd)) {
        Member.deleteOne({classNum: req.params.classNum}, function (err, output) {
            if (err) {
                //console.error(err);
                res.status(500).json({
                    error: err.errmsg
                });
                return;
            }

            Progress.deleteOne({classNum: req.params.classNum}, function (err, output) {
                if (err) {
                    //console.error(err);
                    res.status(500).json({
                        error: err.errmsg
                    });
                    return;
                }

                res.json({result: 1});
            });
        });
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

module.exports = router;