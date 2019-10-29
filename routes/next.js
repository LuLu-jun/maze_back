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

    console.log(type, progress.recentPage.type);

    if (type == 'problem'){
        if (progress.problems[number - 1].begin == -1) { return false; }
        return true;
    }
    else if (type == 'story'){
        if (progress.stories[number - 1] == -1) { return false; }
        return true;
    }
    else if (type == 'branch'){
        if (progress.branches[number - 1].storyNumber == -1) { return false; }
        return true;
    }
    else{ //ending
        if (progress.recentPage.type != 'ending') { return false; }
        return true;
    }
}

function compareAnswer(num, classType, problemType, inputAnswer, next){
    Problem.find({ num: num, classType: classType })
        .exec(function(err, problem){ // 0: right, 1: wrong, 2: warning
            if (err) { next(1); }
            // else if (problem.length != 2) { next(1); }
            else{
                let retVal = 1;
                for (let idx in problem) {
                  if(problem[idx].answer == inputAnswer){
                    if(problem[idx].problemType == problemType){
                      retVal = 0;
                    }
                    else if (retVal != 0){
                      retVal = 2;
                    }
                  }
                }
                // 2019 세 타입 모두 틀린 경우 초기값 그대로 1
                // 자기 타입의 답을 입력한 경우 무조건 0으로 설정
                // 다른 타입의 답을 입력한 경우 이미 자신의 타입에서 정답이 확인된 경우를 제외하고 2로 설정
                next(retVal);
            }
        });
}

function checkTime(){ //현재 분이 짝수라면 true, else false
    var nowDate = new Date();

    if (nowDate.getMinutes() % 2 == 0) { return true; }
    else { return false; }
}

function pageAfterStory(page, classType, next){
    var nextPage = { type: undefined, number: undefined };
    if (page.type == 'story'){
        Problem.countDocuments({ classType: classType }, function(err, count){
            if (err){
                console.error(err);
                return;
            }
            // if (page.number == count/2){
            //     nextPage.type = 'ending';
            // }
            if(false){}
            else{
                nextPage.type = 'problem';
                nextPage.number = page.number;
            }

            next(nextPage);
        });
    }
}

function pageAfterProblem(page, beforeStoryType, classType, problemType, next){
    var nextPage = { type: undefined, number: undefined, id: undefined };
    if (page.type == 'problem'){
        Problem.countDocuments({ classType: classType, problemType: problemType }, function(err, count){
            if (err){
                console.error(err);
                return;
            }
            // if (page.number == count/2){
            //     nextPage.type = 'story';
            //     nextPage.number = page.number;
            //     next(nextPage);
            // }
            // else if (page.number == count/2 - 1 && checkTime()){
            //     nextPage.type = 'problem';
            //     nextPage.number = page.number + 1;
            //     next(nextPage);
            // }
            if(page.number == count){
              nextPage.type='ending'
              next(nextPage);
            }
            else{
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

function getHints(problemNum, classType, problemType, next){
    Problem.find({ num: problemNum, classType: classType, problemType: problemType })
    .exec(function(err, problem){
        if (err) { next(false); }
        else if (problem.length != 1) { next(false); }
        else{
            next(problem[0].hints);
        }
    });
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

            if (req.body.type == undefined || req.body.number == undefined){
                res.json({
                    result: 0,
                    error: 'Not enough request'
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
                pageAfterStory(nowPage, member.classType, function(nextPage){
                    if (nextPage.type == "problem") {
                        if (progress.problems[nextPage.number - 1].begin != -1) { //visited story case -> no need for setting problem progress
                            res.json({
                                result: 1,
                                nextPage: nextPage
                            });
                            return;
                        }
                        progress.problems[nextPage.number - 1].begin = new Date().getTime();
                    }
                    progress.recentPage = nextPage;

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
            else if (nowPage.type == 'problem'){ //problem은 result가 -1이든 0이든 상관없이 답 맞아야 넘겨줌
                if (req.body.answer == undefined){
                    res.json({
                        result: 0,
                        error: 'Not enough request'
                    });
                    return;
                }

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
                        getHint3(nowPage.number, member.classType, member.problemType, function(hint){
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

                compareAnswer(nowPage.number, member.classType, member.problemType, req.body.answer,
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
                                pageAfterProblem(nowPage, progress.stories[nowPage.number - 1], member.classType, member.problemType, function(nextPage){
                                    // if (nextPage.type == 'story') {
                                    //     res.json({
                                    //         result: 1,
                                    //         nextPage: nextPage
                                    //     });
                                    // }
                                    // else if(nextPage.type == 'problem'){
                                    //     res.json({
                                    //         result: 1,
                                    //         nextPage: nextPage
                                    //     });
                                    // }
                                    // else{
                                    //     for (var i=0; i<progress.branches.length; i++){
                                    //         if (progress.branches[i].storyNumber == nowPage.number + 0.5){
                                    //             nextPage.number = i + 1;
                                    //             res.json({
                                    //                 result: 1,
                                    //                 nextPage: nextPage
                                    //             });
                                    //             break;
                                    //         }
                                    //     }
                                    //
                                    //     if (nextPage.number == undefined){ // last problem visited and no branch past
                                    //         res.json({
                                    //             result: 1,
                                    //             nextPage: { type: 'problem', number: nowPage.number + 1 }
                                    //         });
                                    //     }
                                    // }
                                    res.json({
                                        result: 1,
                                        nextPage: nextPage
                                    });
                                });
                                return;
                            }
                            progress.problems[nowPage.number - 1].end = new Date().getTime();

                            pageAfterProblem(nowPage, progress.stories[nowPage.number - 1], member.classType, member.problemType, function (nextPage){
                                if (nextPage.type == 'story'){
                                    progress.recentPage = nextPage;
                                    progress.stories[nextPage.number - 1] = progress.stories[nextPage.number - 2];
                                }
                                // else if(nextPage.type == 'problem'){
                                //     progress.recentPage = nextPage;
                                //     progress.problems[nextPage.number - 1].begin = new Date().getTime();
                                // }
                                // else{ //next Page is branch
                                //     for (var i=0; i<progress.branches.length; i++){
                                //         if (progress.branches[i].storyNumber == -1){
                                //             progress.branches[i] = { id: nextPage.id, storyNumber: nowPage.number + 0.5 };
                                //             progress.recentPage = { type: 'branch', number: i+1 };
                                //             nextPage.number = i + 1;
                                //             break;
                                //         }
                                //     }
                                // }
                                progress.recentPage = nextPage;
                                // 2019 currently, all patterns are story -> problem -> story -> ... -> problem -> ending
                                // if problem -> problem exists, progress.problems[nextPage.number - 1].begin = new Date().getTime(); have to be in code for next problem
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
                if (req.body.decision == undefined){
                    res.json({
                        result: 0,
                        error: 'Not enough request'
                    });
                    return;
                }

                const inputDecision = req.body.decision;
                const branchStoryNum = progress.branches[nowPage.number - 1].storyNumber;
                if (!(inputDecision == "yes" || inputDecision == "no")) {
                    res.json({
                        result: 0
                    });
                    return;
                }

                Problem.countDocuments({ classType: member.classType }, function(err, count) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    if(count % 2 != 0){
                        console.error("problem number error");
                        return;
                    }

                    if (branchStoryNum + 0.5 == count/2){ // Bonus 문제 풀건지 선택창
                        // Ending 봤다면 No, 마지막 문제 begin이 -1이 아니라면 yes, 둘다 아니면 unvisited로 인식
                        // unvisited고 input이 no면 recentPage, ending갱신
                        // unvisited고 input이 yes면 recentPage, begin갱신
                        // 그리고, nextPage 넘겨줌

                        if (progress.problems[count/2 - 1].begin != -1){ //visited page, past input: yes
                            if (inputDecision != "yes"){
                                res.json({
                                    result: 0,
                                    error: 'You already set other path !!'
                                });
                            }
                            else{
                                res.json({
                                    result: 1,
                                    nextPage: { type: 'problem', number: count/2 }
                                });
                            }
                            return;
                        }
                        else if (progress.recentPage.type == 'ending'){ //visited page, past input: no
                            if (inputDecision != "no"){
                                res.json({
                                    result: 0,
                                    error: 'You already set other path !!'
                                });
                            }
                            else{
                                res.json({
                                    result: 1,
                                    nextPage: { type: 'ending' }
                                });
                            }
                            return;
                        }
                        else {
                            var nextPage = { type: undefined, number: undefined };
                            if (inputDecision == "yes"){
                                nextPage = { type: 'problem', number: count/2 };
                                progress.recentPage = nextPage;
                                progress.problems[nextPage.number - 1].begin = new Date().getTime();
                            }
                            else{
                                nextPage = { type: 'ending' };
                                progress.recentPage = nextPage;
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
                                if (output.n != 1){
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
                    }
                    else {
                        const nextPage = pageAfterBranch(nowPage, branchStoryNum);

                        Branch.find({_id: progress.branches[nowPage.number - 1].id}).exec(function (err, branch) {
                            if (err) {
                                console.error("what the fuck");
                                return;
                            }
                            else if (branch.length != 1) {
                                console.error("what the fuck");
                                return;
                            }
                            else {
                                const yesStoryType = extractType(branch[0].yesStory);
                                const noStoryType = extractType(branch[0].noStory);

                                if (progress.stories[branchStoryNum - 0.5] != -1) { // visited branch
                                    const pastDecision = progress.stories[branchStoryNum - 0.5] == yesStoryType;

                                    if ((inputDecision == "yes") != pastDecision) { //pastDecision != inputDecision
                                        res.json({
                                            result: 0,
                                            error: 'You already set other path !!'
                                        });
                                    }
                                    else {
                                        res.json({
                                            result: 1,
                                            nextPage: nextPage
                                        });
                                    }
                                    return;
                                }

                                progress.recentPage = nextPage;
                                if (inputDecision == "yes") {
                                    progress.stories[nextPage.number - 1] = yesStoryType;
                                }
                                else {
                                    progress.stories[nextPage.number - 1] = noStoryType;
                                }

                                Progress.update({_id: progress._id}, {$set: progress}, function (err, output) {
                                    if (err) {
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
                });
            }
        }
    );
});

router.get('/hint/:id/:pwd/:number', function(req, res){
    validateAndGetProgress(req.params.id, req.params.pwd,
        function(progress, member){
            if (progress == undefined) {
                res.json({
                    result: 0,
                    error: 'user validating failed'
                });
                return;
            }

            var problemNum = req.params.number;

            getHints(problemNum, member.classType, member.problemType,
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
