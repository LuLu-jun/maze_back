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

var memberRouter = require('./routes/member');
var problemRouter = require('./routes/problem');
var storyRouter = require('./routes/story');
var progressRouter = require('./routes/progress');
var loginRouter = require('./routes/login').router;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/images', express.static('public'));
app.use('/api/member', memberRouter);
app.use('/api/problem', problemRouter);
app.use('/api/story', storyRouter);
app.use('/api/progress', progressRouter);
app.use('/api/login', loginRouter);

var port = process.env.PORT || 19191;

var server = app.listen(port, function(){
 console.log("Express server has started on port " + port)
});