var express = require('express');
var router = express.Router();

var validateAndGetProgress = require('./login').validateAndGetProgress;
var allowPage = require('./next').allowPage;
var Branch = require('../models/branch');

router.get('/:id/:pwd/:number', function(req, res, next){
   validateAndGetProgress(req.params.id, req.params.pwd, function(progress, member){
       if (progress == undefined){
           res.json({
               result: 0,
               error: 'user validating failed'
           });
           return;
       }

       const requestPage = {
           type: 'branch',
           number: req.params.number
       };
       if (!allowPage(requestPage, progress)){
           res.json({
               result: 0,
               error: 'invalidate request'
           });
           return;
       }

       const branchNum = req.params.number;
       const branchId = progress.branches[branchNum - 1].id;
       Branch.find({ _id: branchId }).exec(function(err, branch){
           if (err){
               res.json({
                   result: 0,
                   error: err.errmsg
               });
           }
           else if (branch.length != 1){
               res.json({
                   result: 0,
                   error: 'There is no branch!'
               });
           }
           else{
               res.json({
                   result: 1,
                   imageURL: branch[0].fileURL
               });
           }
       });
   });
});

module.exports = router;