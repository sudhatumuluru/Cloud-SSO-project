var express  = require('express'),
    compress = require('compression'),
    hbs      = require('hbs'),
    moment   = require('moment'),
    router   = require(__dirname + '/routes').router,
    app      = express(),
    error    = require(__dirname + '/middleware/error'),
    logger = require('connect-logger'),
    cookieParser = require('cookie-parser'),
    session = require('cookie-session'),
    fs = require('fs'),
    crypto = require('crypto');

hbs.registerPartials(__dirname + '/views/partials');

hbs.registerHelper('dateFormat', function(context, block) {
    var f = block.hash.format || "MMM DD, YYYY hh:mm:ss A";
    return moment(context).format(f);
});

app.set('view engine', 'html');
app.set('views', __dirname + '/views/pages');
app.engine('html', hbs.__express);

app.use(logger());
app.use(cookieParser('a deep secret'));
app.use(session({secret: '1234567890QWERTY'}));

app.use(compress({
    filter: function(req, res) {
        return (/json|text|javascript|css|image\/svg\+xml|application\/x-font-ttf/).test(res.getHeader('Content-Type'));
    },
    level: 9
}));

if (app.get('env') === 'development'){
    app.use(express.static(__dirname + '/public', {maxAge: 86400000}));
}

var route = express.Router();

route.get('/index.html', function(req, res){
    res.redirect(301, '/');
});
route.get('/', router.index);
route.get('/auth', router.auth);
route.get('/getAToken', router.getAToken);
route.get('/dashboard', router.dashboard);

app.use('/', route);

app.use(error.notFound);
app.use(error.serverError);

/** Start App **/
var cluster = require('cluster'),
    numCPUs = require('os').cpus().length,
    app,
    server;
if (cluster.isMaster && !module.parent) {
    for (var i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
      console.log('worker ' + worker.process.pid + ' died');
    });
} else {
    server = app.listen(process.env.PORT || 3000, function () {
        var host = server.address().address,
            port = server.address().port;
        console.log('App listening at http://%s:%s with worker id %s', host, port, cluster.worker.id);
    });
}
/** End handling Start App **/

module.exports = app;
