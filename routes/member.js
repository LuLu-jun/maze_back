var express = require('express');
var router = express.Router();

var Member = require('../models/member');

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

        res.json({result: 1});
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

        res.status(204).end();
    })
});

module.exports = router;