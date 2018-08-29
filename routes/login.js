var express = require('express');
var router = express.Router();

var Member = require('../models/member');

function validateAdmin(id, pwd){
    if (id == 'admin' && pwd == 'admin195828') {
        return true;
    }
    return false;
}

function validateUser(id, pwd, next){
    var result = undefined;
    Member.find({ id: id , pwd: pwd }).exec(function(err, member){
        if (err){
            //console.error(err);
            next(false);
        }
        if (member.length != 1) { return false; }
        next(true);
    });
}

router.post('/', function(req, res, next){
    if (validateAdmin(req.body.id, req.body.pwd)){
        res.json({
            result: 1,
            isAdmin: true,
            // TODO : get recent page
        });
        return;
    }
    validateUser(req.body.id, req.body.pwd,
        function (result){
            if (result){
                res.json({
                    result: 1,
                    isAdmin: false,
                    recentPage: -1,
                    // TODO : get recent page
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
};