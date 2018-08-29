var express = require('express');
var router = express.Router();
var multer = require('multer');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

function deleteFile(filePath){
    fs.exists(filePath, function (exists) {
        if (exists) {
            fs.unlink(filePath);
        }
    });
}

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
var validateAdmin = require('../routes/login').validateAdmin;

router.get('/:id/:pwd', function(req, res){
    if (validateAdmin(req.params.id, req.params.pwd)) {
        Problem.find({}).sort({classType: 1, problemType: 1, num: 1}).exec(function (err, problems) {
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
                problems: problems
            });
        })
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

router.post('/:id/:pwd', upload.single('file'), function(req, res){
    if (validateAdmin(req.params.id, req.params.pwd)) {
        var problem = new Problem();
        problem.num = Number(req.body.num);
        problem.answer = req.body.answer;
        problem.classType = req.body.classType;
        problem.problemType = req.body.problemType;
        problem.hints = new Array(req.body.hint1, req.body.hint2, req.body.hint3);
        problem.fileURL = '/images/problem/' + req.file.filename;
        problem.filePath = req.file.path;

        problem.save(function (err) {
            if (err) {
                //console.error(err);
                deleteFile(req.file.path);
                res.json({
                    result: 0,
                    error: err.errmsg
                });
                return;
            }
            res.json({result: 1});
        });
        return;
    }
    deleteFile(req.file.path);
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

router.delete('/:id/:pwd/:fileName', function(req, res){
    if (validateAdmin(req.params.id, req.params.pwd)) {
        const fileURL = "/images/problem/" + req.params.fileName;

        Problem.findOneAndDelete({fileURL: fileURL},
            function (err, doc) {
                deleteFile(doc.filePath);
                if (err) {
                    //console.error(err);
                    res.status(500).json({
                        error: err.errmsg
                    });
                    return;
                }
                res.status(204).end();
        });
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

module.exports = router;