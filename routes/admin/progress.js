var express = require('express');
var router = express.Router();

var Progress = require('../../models/progress');
var Member = require('../../models/member');
var validateAdmin = require('../login').validateAdmin;

function newHintCodes(oldHintCodes){
    var hintCodes = [];
    for (var i=0; i<oldHintCodes.length; i++){
        hintCodes.push({
            code: oldHintCodes[i].code,
            used: false
        });
    }
    return hintCodes;
}

router.get('/:id/:pwd', function(req, res, next){
    if (validateAdmin(req.params.id, req.params.pwd)) {
        Progress.find({}).sort({classNum: 1}).exec(function (err, progresses) {
            if (err) {
                //console.error(err);
                res.json({
                    result: 0,
                    error: err.errmsg
                });
                return;
            }
            res.json({
                result: 1,
                progresses: progresses
            });
        });
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

router.get('/reset/:id/:pwd', function(req, res, next){
    if (validateAdmin(req.params.id, req.params.pwd)) {
        Member.find({}).exec(function (err, members){
            for (var i=0; i<members.length; i++){
                var member = members[i];
                member.hintCodes = newHintCodes(member.hintCodes);
                member.save(function(err){
                    if (err){ console.error(err); }
                });
            }
        });
        Progress.find({}).exec(function (err, progresses) {
            var error = false;

            for (var i=0; i<progresses.length; i++){
                var progress = progresses[i];
                progress.warningNum = 0;
                progress.recentPage = {
                    type : 'story',
                    number : 1
                };
                progress.progress = [];
                for (var i=0; i<10; i++){
                    progress.progress.push(
                        { begin: -1, end: -1, hints: [false, false, false] }
                    );
                }
                progress.save(function (err) {
                    if (err) { error = err.errmsg; }
                });

                if (error != false){
                    break;
                }
            }

            if (error != false){
                res.json({
                    result: 0,
                    error: error
                });
            }
            else{ res.json({ result: 1 }); }
        });
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

module.exports = router;