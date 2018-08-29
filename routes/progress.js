var express = require('express');
var router = express.Router();

var Progress = require('../models/progress');
var validateAdmin = require('../routes/login').validateAdmin;

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

module.exports = router;