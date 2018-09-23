var express = require('express');
var router = express.Router();

var validateAndGetProgress = require('./login').validateAndGetProgress;
var Problem = require('../models/problem');
var Progress = require('../models/progress');
var Branch = require('../models/branch');
var Member = require('../models/member');

const firstHintTime = 10, secondHintTime = 20;

function allowPage(requestPage, progress){
    const type = requestPage.type;
    const number = requestPage.number;

    if (type == 'problem'){
        if (progress.problems[number - 1].begin == -1) { return false; }
        return true;
    }
    else if (type == 'story'){
        if (progress.stories[number - 1] == -1) { return false; }
        return true;
    }
    else{
        if (progress.branches[number - 1].storyNumber == -1) { return false; }
        return true;
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

function pageAfterStory(page){
    var nextPage = { type: undefined, number: undefined };
    if (page.type == 'story'){
        nextPage.type = 'problem';
        nextPage.number = page.number;
    }
    return nextPage;
}

function pageAfterProblem(page, beforeStoryType, classType, next){
    var nextPage = { type: undefined, number: undefined, id: undefined };
    if (page.type == 'problem'){
        const beforeStory = page.number.toString() + "(" + beforeStoryType.toString() + ")";
        Branch.find({ beforeStory: beforeStory, classType: classType }).exec(function(err, branch){
            if (err) {
                console.error("what the fuck");
                return;
            }
            else if (branch.length != 1) { // No branch case
                nextPage.type = 'story';
                nextPage.number = page.number + 1;
            }
            else{
                nextPage.type = 'branch';
                nextPage.id = branch[0]._id;
            }
            next(nextPage);
        });
    }
}

function pageAfterBranch(page, branchStoryNum){
    var nextPage = { type: undefined, number: undefined };
    if (page.type == 'branch'){
        nextPage.type = 'story';
        nextPage.number = branchStoryNum + 0.5;
    }
    return nextPage;
}

function extractType(str){
    return Number(str.split("(")[1].split(")")[0]);
}

function updateProgressHint3(progress, problemNum){
    progress.problems[problemNum - 1].hints[2] = true;

    Progress.update({ _id: progress._id }, { $set: progress }, function (err, output){
        if (err) {
            console.log('Error during updateProgressHint');
            console.error(err);
        }
        if (output.n != 1){
            console.error('Number of matched progress is not 1 !!');
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

            const nowPage = {
                type: req.body.type,
                number: req.body.number
            };
            const validRequest = allowPage(nowPage, progress);
            if (!validRequest){
                res.json({
                    result: 0,
                    error: 'invalidate request'
                });
                return;
            }
            if (nowPage.type == 'story') {
                const nextPage = pageAfterStory(nowPage);

                if (progress.problems[nextPage.number - 1].begin != -1){ //visited story case -> no need for setting problem progress
                    res.json({
                        result: 1,
                        nextPage: nextPage
                    });
                    return;
                }

                progress.recentPage = nextPage;
                progress.problems[nextPage.number - 1].begin = new Date().getTime();

                Progress.update({ _id: progress._id }, { $set: progress }, function(err, output){
                    if (err){
                        console.error(err);
                        res.json({
                            result: 0,
                            error: err.errmsg
                        });
                        return;
                    }
                    if (output.n != 1) {
                        console.error('Number of matched progress is not 1 !!');
                        res.json({
                            result: 0,
                            error: 'Number of matched progress is not 1 !!'
                        });
                        return;
                    }
                    res.json({
                        result: 1,
                        nextPage: nextPage
                    });
                });
            }
            else if (nowPage.type == 'problem'){ //problem은 result가 -1이든 0이든 상관없이 답 맞아야 넘겨줌
                const inputAnswer = req.body.answer;

                var index = -1;
                for (var i=0; i<member.hintCodes.length; i++){
                    if (member.hintCodes[i].code == req.body.answer && member.hintCodes[i].used == false){
                        index = i;
                        break;
                    }
                }
                if (index != -1 && progress.problems[nowPage.number - 1].hints[2] == false){
                    member.hintCodes[index].used = true;
                    Member.update({ _id: member._id }, { $set: member }, function(err, output){
                        if (err) {
                            console.error(err);
                            res.json({
                                result: 0,
                                error: err.errmsg
                            });
                            return;
                        }
                        if (output.n != 1){
                            console.error('Number of matched member is not 1 !!');
                            res.json({
                                result: 0,
                                error: 'Number of matched member is not 1 !!'
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
                                if (output.n != 1) { console.error('Number of matched progress is not 1 !!'); }
                            });
                        }
                        else{
                            if (progress.problems[nowPage.number - 1].end != -1){ //visited problem
                                pageAfterProblem(nowPage, progress.stories[nowPage.number - 1], member.classType, function(nextPage){
                                    if (nextPage.type == 'story') {
                                        res.json({
                                            result: 1,
                                            nextPage: nextPage
                                        });
                                    }
                                    else{
                                        for (var i=0; i<progress.branches.length; i++){
                                            if (progress.branches[i].storyNumber == nowPage.number + 0.5){
                                                nextPage.number = i + 1;
                                                res.json({
                                                    result: 1,
                                                    nextPage: nextPage
                                                });
                                                break;
                                            }
                                        }
                                    }
                                });
                                return;
                            }
                            progress.problems[nowPage.number - 1].end = new Date().getTime();

                            pageAfterProblem(nowPage, progress.stories[nowPage.number - 1], member.classType, function (nextPage){
                                if (nextPage.type == 'story'){
                                    progress.recentPage = nextPage;
                                    progress.stories[nextPage.number - 1] = progress.stories[nowPage.number - 1];
                                }
                                else{ //next Page is branch
                                    for (var i=0; i<progress.branches.length; i++){
                                        if (progress.branches[i].storyNumber == -1){
                                            progress.branches[i] = { id: nextPage.id, storyNumber: nowPage.number + 0.5 };
                                            progress.recentPage = { type: 'branch', number: i+1 };
                                            nextPage.number = i + 1;
                                            break;
                                        }
                                    }
                                }
                                Progress.update({ _id: progress._id }, { $set: progress }, function(err, output){
                                    if (err){
                                        console.error(err);
                                        res.json({
                                            result: 0,
                                            error: err.errmsg
                                        });
                                        return;
                                    }
                                    if (output.n != 1) {
                                        console.error('Number of matched progress is not 1 !!');
                                        res.json({
                                            result: 0,
                                            error: 'Number of matched progress is not 1 !!'
                                        });
                                        return;
                                    }
                                    res.json({
                                        result: 1,
                                        nextPage: nextPage
                                    });
                                });
                            });
                        }
                    });
            }
            else{ //now page is branch
                const inputDecision = req.body.decision;
                const branchStoryNum = progress.branches[nowPage.number - 1].storyNumber;
                const nextPage = pageAfterBranch(nowPage, branchStoryNum);

                if (!(inputDecision == "yes" || inputDecision == "no")){
                    res.json({
                        result: 0
                    });
                    return;
                }

                Branch.find({ _id: progress.branches[nowPage.number -1].id }).exec(function(err, branch){
                    if (err){
                        console.error("what the fuck");
                        return;
                    }
                    else if (branch.length != 1){
                        console.error("what the fuck");
                        return;
                    }
                    else {
                        const yesStoryType = extractType(branch[0].yesStory);
                        const noStoryType = extractType(branch[0].noStory);

                        if (progress.stories[branchStoryNum - 0.5] != -1){ // visited branch
                            const pastDecision = progress.stories[branchStoryNum - 0.5] == yesStoryType;

                            if ((inputDecision =="yes") != pastDecision){ //pastDecision != inputDecision
                                res.json({
                                    result: 0,
                                    error: 'You already set other path !!'
                                });
                            }
                            else{
                                res.json({
                                    result: 1,
                                    nextPage: nextPage
                                });
                            }
                            return;
                        }

                        progress.recentPage = nextPage;
                        if (inputDecision == "yes") { progress.stories[nextPage.number - 1] = yesStoryType; }
                        else { progress.stories[nextPage.number - 1] = noStoryType; }

                        Progress.update({ _id: progress._id}, { $set: progress }, function (err, output){
                            if (err){
                                console.error(err);
                                res.json({
                                    result: 0,
                                    error: err.errmsg
                                });
                                return;
                            }
                            if (output.n != 1) {
                                console.error('Number of matched progress is not 1 !!');
                                res.json({
                                    result: 0,
                                    error: 'Number of matched progress is not 1 !!'
                                });
                                return;
                            }
                            res.json({
                                result: 1,
                                nextPage: nextPage
                            });
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
            if (progress.problems[problemNum - 1].end == -1) {
                var timeDiff = Math.ceil((new Date().getTime() - progress.problems[problemNum - 1].begin) / 1000);
            }
            else{
                var timeDiff = Math.ceil((progress.problems[problemNum - 1].end - progress.problems[problemNum - 1].begin) / 1000);
            }
            var progressHints = progress.problems[problemNum - 1].hints;

            if (timeDiff >= firstHintTime && !progressHints[0]) { //need update progress hint
                progress.problems[problemNum - 1].hints[0] = true;
                progressHints[0] = true;
            }

            if (timeDiff >= secondHintTime && !progressHints[1]) {
                progress.problems[problemNum - 1].hints[1] = true;
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
               if (output.n != 1) { console.error('Number of matched progress is not 1 !!'); }
            });
        }
    );
});

module.exports = {
    router: router,
    allowPage: allowPage
};