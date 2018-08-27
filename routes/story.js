var express = require('express');
var router = express.Router();
var multer = require('multer');
var crypto = require('crypto');
var path = require('path');
var fs = require('fs');

const upload = multer({
   storage: multer.diskStorage({
       destination: function (req, file, cb){
           cb(null, './public/story');
       },
       filename: function (req, file, cb){
           crypto.pseudoRandomBytes(16, function (err, raw){
              if (err) { return cb(err); }
               console.log(file.originalname);
               console.log(path.extname(file.originalname));
              cb(null, raw.toString('hex') + path.extname(file.originalname));
           });
       },
   }),
});

var Story = require('../models/story');

router.get('/', function(req, res){
    Story.find({}).sort({ classType: 1, num: 1 }).exec(function(err, stories){
       if (err){
           console.log(err);
           res.json({
               result: 0,
               error: err.errmsg
           });
           return;
       }
        res.json({
            result: 1,
            stories: stories
        });
    });
});

router.post('/', upload.single('file'), function(req, res){
    var story = new Story();
    story.num = Number(req.body.num);
    story.classType = req.body.classType;
    story.fileURL = '/images/story/' + req.file.filename;
    story.filePath = req.file.path;

    story.save(function(err){
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
    const fileURL = "/images/story/" + req.params.fileName;

    Story.findOneAndDelete({ fileURL: fileURL },
        function(err, doc){
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