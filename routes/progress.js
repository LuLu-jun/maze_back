var express = require('express');
var router = express.Router();

var Progress = require('../models/progress');

router.get('/', function(req, res, next){
    Progress.find({}).sort({ classNum: 1 }).exec(function(err, progresses){
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
            progresses: progresses
        });
    });
});

module.exports = router;