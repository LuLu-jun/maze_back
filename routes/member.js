var express = require('express');
var router = express.Router();

var Member = require('../models/member');
var Progress = require('../models/progress');

router.get('/', function(req, res, next) {
    Member.find({}).sort({classNum: 1}).exec(function(err, members){
        if(err){
            console.error(err);
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
    })
});

router.post('/', function(req, res){
    console.log(req.body);
    var member = new Member(req.body);

    member.save(function(err){
        if(err){
            console.error(err);
            res.json({
                result: 0,
                error: err.errmsg
            });
            return;
        }

        var progress = new Progress();
        progress.classNum = req.body.classNum;
        progress.warningNum = 0;
        progress.progress = [];
        for (var i=0; i<10; i++){
            progress.progress.push(
                { begin: -1, end: -1 }
            );
        }

        progress.save(function(err){
            if(err){
                console.error(err);
                res.json({
                    result: 0,
                    error: err.errmsg
                });
                return;
            }

            res.json({result: 1});
        });
    });
});

router.delete('/:classNum', function(req, res){
    Member.deleteOne({ classNum: req.params.classNum }, function(err, output){
        if(err) {
            console.error(err);
            res.status(500).json({
                error: err.errmsg
            });
            return;
        }

        Progress.deleteOne({ classNum: req.params.classNum }, function(err, output){
            if(err) {
                console.error(err);
                res.status(500).json({
                    error: err.errmsg
                });
                return;
            }

            res.status(204).end();
        });
    });
});

module.exports = router;