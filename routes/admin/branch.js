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
        destination: function (req, file, cb){
            cb(null, './public/branch');
        },
        filename: function (req, file, cb){
            crypto.pseudoRandomBytes(16, function (err, raw){
                if (err) { return cb(err); }
                cb(null, raw.toString('hex') + path.extname(file.originalname));
            });
        },
    }),
});

var Branch = require('../../models/branch');
var validateAdmin = require('../login').validateAdmin;

router.get('/:id/:pwd', function(req, res){
    if (validateAdmin(req.params.id, req.params.pwd)){
        Branch.find({}).sort({classType: 1, beforeStory: 1}).exec(function(err, branches) {
            if (err){
                //console.error(err);
                res.json({
                    result: 0,
                    error: err.errmsg
                });
                return;
            }
            res.json({
                result: 1,
                branches: branches
            });
        });
        return;
    }
    res.json({
        result: 0,
        error: 'user validating failed'
    });
});

router.post('/:id/:pwd', upload.single('file'), function(req, res){
   if (validateAdmin(req.params.id, req.params.pwd)){
       var branch = new Branch();
       branch.num = Number(req.body.num);
       branch.classType = req.body.classType;
       branch.beforeStory = req.body.beforeStory;
       branch.yesStory = req.body.yesStory;
       branch.noStory = req.body.noStory;
       branch.fileURL = '/images/branch/' + req.file.filename;
       branch.filePath = req.file.path;

       branch.save(function (err){
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
        const fileURL = "/images/branch/" + req.params.fileName;

        Branch.findOneAndDelete({fileURL: fileURL},
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