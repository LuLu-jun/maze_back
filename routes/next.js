var express = require('express');
var router = express.Router();

var validateAndGetProgress = require('./login').validateAndGetProgress;
var Problem = require('../models/problem');
var Progress = require('../models/progress');

const firstHintTime = 10, secondHintTime = 20;

function comparePage(a, b){ // a>b : -1, a<b : 1, a==b : 0
    if (a.number != b.number){
        if (a.number > b.number) { return -1; }
        else { return 1; }
    }
    else if (a.type == b.type){
        return 0;
    }
    else{
        if (a.type == 'story') { return 1; }
        else { return -1; }
    }
}

function compareAnswer(num, classType, problemType, inputAnswer, next){
    Problem.find({ num: num, classType: classType })
        .exec(function(err, problem){ // 0: right, 1: wrong, 2: warning
            if (err) { next(1); }
            else if (problem.length != 2) { next(1); }
            else{
                var myTypeAnswer = undefined, otherTypeAnswer = undefined;
                if (problem[0].problemType == problemType){
                    myTypeAnswer = problem[0].answer;
                    otherTypeAnswer = problem[1].answer;
                }
                else{
                    myTypeAnswer = problem[1].answer;
                    otherTypeAnswer = problem[0].answer;
                }

                if (myTypeAnswer == inputAnswer){ next(0); }
                else if(otherTypeAnswer == inputAnswer){ next(2); }
                else{ next(1); }
            }
        });
}

function getNextPage(page){
    var nextPage = { type: undefined, number: undefined };
    if (page.type == 'story'){
        nextPage.type = 'problem';
        nextPage.number = page.number;
    }
    else{
        nextPage.type = 'story';
        nextPage.number = page.number + 1;
    }
    return nextPage;
}

function getUpdateProgress(oldProgress, updateIndex, type){ // type 0 needs new begin, 1 needs new end
    var progress = [];
    for (var i=0; i<oldProgress.length; i++){
        if (i != updateIndex) { progress.push(oldProgress[i]); }
        else {
            if (type == 0) {
                progress.push(
                    { begin: new Date().getTime(), end: -1, hints: oldProgress[i].hints }
                );
            }
            else{
                progress.push(
                    { begin: oldProgress[i].begin, end: new Date().getTime(), hints: oldProgress[i].hints }
                );
            }
        }
    }
    return progress;
}

function getUpdateHintCodes(oldHintCodes, updateIndex){
    var hintCodes = [];
    for (var i=0; i<oldHintCodes.length; i++){
        if (i != updateIndex) { hintCodes.push(oldHintCodes[i]); }
        else {
            hintCodes.push({
                code: oldHintCodes[i].code,
                used: true
            });
        }
    }
    return hintCodes;
}

function updateProgressHint3(progress, problemNum){
    progress.progress[problemNum - 1].hints[2] = true;

    Progress.update({ _id: progress._id }, { $set: progress }, function (err, output){
        if (err) {
            console.log('Error during updateProgressHint');
            console.error(err);
        }
        if (output.n != 1){
            console.error('There is no matched progress');
        }
    });
}

function getHint3(num, classType, problemType, next){
    Problem.find({ num: num, classType: classType, problemType: problemType })
        .exec(function(err, problem){
            if (err) {
                next(false);
            }
            else if (problem.length != 1) {
                next(false);
            }
            else{
                next(problem[0].hints[2]);
            }
        });
}

function getHints(index, problemNum, classType, problemType, hintBool, hints, next){
    if (index >= 3){ // end
        next(hints);
    }
    else{
        if (hintBool[index] == true){
            Problem.find({ num: problemNum, classType: classType, problemType: problemType })
                .exec(function(err, problem){
                    if (err) { next(false); }
                    else if (problem.length != 1) { next(false); }
                    else{
                        hints[index] = problem[0].hints[index];
                        getHints(index + 1, problemNum, classType, problemType, hintBool, hints, next);
                    }
                });
        }
        else{
            getHints(index + 1, problemNum, classType, problemType, hintBool, hints, next);
        }
    }
}

router.post('/:id/:pwd', function(req, res){
    validateAndGetProgress(req.params.id, req.params.pwd,
        function(progress, member){
            if (progress == undefined) {
                res.json({
                    result: 0,
                    error: 'user validating failed'
                });
                return;
            }

            const recentPage = progress.recentPage;
            const nowPage = {
                type: req.body.type,
                number: req.body.number
            };
            const result = comparePage(recentPage, nowPage); //1: recentPage < nowPage
            if (result == 1){
                res.json({
                    result: 0,
                    error: 'invalidate request'
                });
                return;
            }
            if (recentPage.type == 'story') {
                if (result == -1){
                    res.json({
                        result: 1
                    });
                    return;
                }
                const nextPage = getNextPage(recentPage);
                progress.recentPage = nextPage;
                progress.progress = getUpdateProgress(progress.progress, nextPage.number - 1, 0);

                progress.save(function (err) {
                    if (err) {
                        console.error(err);
                        res.json({
                            result: 0,
                            error: err.errmsg
                        });
                        return;
                    }
                    res.json({result: 1});
                });
            }
            else{ //problem은 result가 -1이든 0이든 상관없이 답 맞아야 넘겨줌
                const inputAnswer = req.body.answer;

                var index = -1;
                for (var i=0; i<member.hintCodes.length; i++){
                    if (member.hintCodes[i].code == req.body.answer && member.hintCodes[i].used == false){
                        index = i;
                        break;
                    }
                }
                if (index != -1 && progress.progress[nowPage.number - 1].hints[2] == false){
                    member.hintCodes = getUpdateHintCodes(member.hintCodes, index);
                    member.save(function (err){
                        if (err) {
                            console.error(err);
                            res.json({
                                result: 0,
                                error: err.errmsg
                            });
                            return;
                        }
                        updateProgressHint3(progress, req.body.number);
                        getHint3(nowPage.number, member.classType, member.problemType[nowPage.number - 1], function(hint){
                            if (hint == false) {
                                res.json({
                                    result: 0,
                                    error: 'There is something error on getting hint'
                                });
                            }
                            else {
                                res.json({
                                    result: 2,
                                    hint: hint
                                });
                            }
                        });
                    });
                    return;
                }

                compareAnswer(nowPage.number, member.classType, member.problemType[nowPage.number - 1], req.body.answer,
                    function(result){
                        if (result == 1){
                            res.json({
                                result: 0,
                                error: 'wrong answer'
                            });
                        }
                        else if(result == 2){
                            res.json({
                                result: 0,
                                error: 'WARNING !!'
                            });
                            progress.warningNum = progress.warningNum + 1;
                            Progress.update({ _id: progress._id }, { $set: progress }, function(err, output){
                                if (err){
                                    console.error(err);
                                }
                                if (output.n != 1) { console.error('There is no matched progress'); }
                            });
                        }
                        else{
                            const nextPage = getNextPage(recentPage);
                            progress.recentPage = nextPage;
                            progress.progress = getUpdateProgress(progress.progress, nextPage.number - 2, 1);
                            progress.save(function (err) {
                                if (err) {
                                    console.error(err);
                                    res.json({
                                        result: 0,
                                        error: err.errmsg
                                    });
                                    return;
                                }
                                res.json({result: 1});
                            });
                        }
                    });
            }
        }
    );
});

router.get('/hint/:id/:pwd/:number', function(req, res){
    validateAndGetProgress(req.params.id, req.params.pwd,
        function(progress, member){
            var problemNum = req.params.number;
            var timeDiff = Math.ceil((new Date().getTime() - progress.progress[problemNum - 1].begin) / 1000);
            var progressHints = progress.progress[problemNum - 1].hints;

            if (timeDiff >= firstHintTime && !progressHints[0]) { //need update progress hint
                progress.progress[problemNum - 1].hints[0] = true;
                progressHints[0] = true;
            }

            if (timeDiff >= secondHintTime && !progressHints[1]) {
                progress.progress[problemNum - 1].hints[1] = true;
                progressHints[1] = true;
            }

            var hints = [undefined, undefined, undefined];
            getHints(0, problemNum, member.classType, member.problemType[problemNum - 1], progressHints, hints,
                function (hints){
                    if (hints != false) {
                        res.json({
                            result: 1,
                            hints: hints
                        });
                    }
                    else {
                        res.json({
                            result: 0,
                            error: 'Something problem on getting hints'
                        });
                    }
                }
            );

            progress.save(function(err) {
                if (err){
                    console.error(err);
                }
            });
            Progress.update({ _id: progress._id }, {$set: progress}, function(err, output){
               if (err){
                   console.error(err);
               }
               if (output.n != 1) { console.error('There is no matched progress'); }
            });
        }
    );
});

module.exports = {
    router: router,
    comparePage: comparePage
};