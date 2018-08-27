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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/images', express.static('public'));
app.use('/api/member', memberRouter);
app.use('/api/problem', problemRouter);

var port = process.env.PORT || 19191;

var server = app.listen(port, function(){
 console.log("Express server has started on port " + port)
});