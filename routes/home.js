var express = require('express');
var router = express.Router();

var Progress = require('../models/progress');
var validateAndGetProgress = require('./login').validateAndGetProgress;

router.get('/:id/:pwd', function(req, res, next){
    validateAndGetProgress(req.params.id, req.params.pwd,
        function(progress) {
            if (progress == undefined) {
                res.json({
                    result: 0,
                    error: 'user validating failed'
                });
            }
            else {
                res.json({
                    result: 1,
                    progress: progress
                });
            }
        }
    );
});

module.exports = router;