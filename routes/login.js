var express = require('express');
var router = express.Router();

var Member = require('../models/member');
var Progress = require('../models/progress');

async function validateAdmin(id, pwd){
    // if (id == 'admin' && pwd == 'admin') {
    //     return true;
    // }
    // return false;
    validateUser(id, pwd, (res, admin)=>{
      return admin
    })  
}

function validateUser(id, pwd, next){
    var result = undefined;
    Member.find({ id: id , pwd: pwd }).exec(function(err, member){
        if (err){
            //console.error(err);
            next(false, false);
            return;
        }
        if (member.length != 1) {
            next(false, false);
            return;
        }
        if (id == 'admin'){
          next(true, true);
          return;
        }
        next(true, false);
    });
}

function validateAndGetProgress(id, pwd, next){
    Member.find({ id: id, pwd: pwd }).exec(function(err, member){
        if (err){ next (undefined, undefined); }
        else if (member.length != 1){ next (undefined, undefined); }
        else{
            Progress.find({ classNum: member[0].classNum }).exec(function(err, progress){
                if (err) { next (undefined, undefined); }
                else if (progress.length != 1) { next (undefined, undefined); }
                else{
                    next (progress[0], member[0]);
                }
            });
        }
    });
}

router.post('/', function(req, res, next){
    if (req.body.id == undefined || req.body.pwd == undefined){
        res.json({
            result: 0,
            error: 'Not enough request'
        });
        return;
    }

    validateUser(req.body.id, req.body.pwd,
        function (result, admin){
            if (result){
                res.json({
                    result: 1,
                    isAdmin: admin,
                    recentPage: -1,
                });
                return;
            }
            res.json({
                result: 0,
                error: 'user validating failed'
            });
        });
});

module.exports = {
    router: router,
    validateAdmin: validateAdmin,
    validateUser: validateUser,
    validateAndGetProgress: validateAndGetProgress
};
