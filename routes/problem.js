var express = require('express');
var router = express.Router();
var multer = require('multer');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, './public/problem');
        },
        filename: function (req, file, cb) {
            crypto.pseudoRandomBytes(16, function (err, raw) {
                if (err) { return cb(err); }
                cb(null, raw.toString('hex') + path.extname(file.originalname));
            });
        },
    }),
});

var Problem = require('../models/problem');

router.get('/', function(req, res){
    Problem.find({}).sort({ classType: 1, problemType: 1, num: 1 }).exec(function(err, problems){
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
            problems: problems
        });
    })
});

router.post('/', upload.single('file'), function(req, res){
    console.log(req.body);
    console.log(req.file);

    var problem = new Problem();
    problem.num = Number(req.body.num);
    problem.answer = req.body.answer;
    problem.classType = req.body.classType;
    problem.problemType = req.body.problemType;
    problem.hints = new Array(req.body.hint1, req.body.hint2, req.body.hint3);
    problem.fileURL = '/images/problem/' + req.file.filename;
    problem.filePath = req.file.path;

    problem.save(function(err){
        if(err){
            fs.exists(req.file.path, function(exists){
                if (exists) { fs.unlink(req.file.path); }
            });

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

router.delete('/:fileName', function(req, res){
    const fileURL = "/images/problem/" + req.params.fileName;
    console.log(req.fileURL);
    Problem.findOneAndDelete({ fileURL: fileURL },
        function(err, doc) {
            fs.exists(doc.filePath, function(exists){
                if (exists) { fs.unlink(doc.filePath); }
            });

            if (err) {
                console.error(err);
                res.status(500).json({
                    error: err.errmsg
                });
                return;
            }
            res.status(204).end();
    });
});

module.exports = router;