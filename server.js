var express     = require('express');
var app         = express();
var bodyParser  = require('body-parser');
var mongoose    = require('mongoose');

// CONNECT TO MONGODB SERVER
var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
    // CONNECTED TO MONGODB SERVER
    console.log("Connected to mongod server");
});

mongoose.connect('mongodb://localhost/maze', { useNewUrlParser: true });

var loginRouter = require('./routes/login').router;
var adminMemberRouter = require('./routes/admin/member');
var adminProblemRouter = require('./routes/admin/problem');
var adminStoryRouter = require('./routes/admin/story');
var adminBranchRouter = require('./routes/admin/branch');
var adminProgressRouter = require('./routes/admin/progress');
var homeRouter = require('./routes/home');
var nextRouter = require('./routes/next').router;
var storyRouter = require('./routes/story');
var problemRouter = require('./routes/problem').router;
var branchRouter = require('./routes/branch');
var timeRouter = require('./routes/time');

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/images', express.static('public'));
app.use('/api/login', loginRouter);
app.use('/api/admin/member', adminMemberRouter);
app.use('/api/admin/problem', adminProblemRouter);
app.use('/api/admin/story', adminStoryRouter);
app.use('/api/admin/branch', adminBranchRouter);
app.use('/api/admin/progress', adminProgressRouter);
app.use('/api/home', homeRouter);
app.use('/api/next', nextRouter);
app.use('/api/story', storyRouter);
app.use('/api/problem', problemRouter);
app.use('/api/branch', branchRouter);
app.use('/api/time', timeRouter);

var port = process.env.PORT || 19191;

var server = app.listen(port, function(){
 console.log("Express server has started on port " + port)
});