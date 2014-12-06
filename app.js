
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var MongoStore = require('connect-mongo')(express);
var settings = require('./settings');
var flash = require('connect-flash');//在session中存储信息
var fs = require('fs');
var accessLog = fs.createWriteStream('access.log',{flags:'a'});
var errorLog = fs.createWriteStream('error.log',{flags:'a'});

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
//设定视图文件（html）目录在根目录/views文件夹
app.set('views', path.join(__dirname, 'views'));
//设定视图模板引擎为ejs
app.set('view engine', 'ejs');
//设定网站图标。favicon(__dirname + '/public/images/xx.ico')
app.use(express.favicon());
//显示简单日志
app.use(express.logger({stream: accessLog}));
//解析请求体
app.use(express.json());
app.use(express.urlencoded());
//协助处理post请求
app.use(express.methodOverride());

app.use(express.cookieParser());
app.use(express.session({
	secret: settings.cookieSecret,
	key: settings.db,   //cookie name
	cookie: {maxAge: 3600 * 24 * 30},
	store: new MongoStore({
		db: settings.db
	})
}))

app.use(flash());

//调用路由解析的规则
app.use(app.router);
//将public设置为img/css/js等静态文件的目录
app.use(express.static(path.join(__dirname, 'public')));
//添加错误日志
app.use(function(err,req,res,next){
	var meta = '[' + new Date() + ']' + req.url + '\n';
	errorLog.write(meta + err.stack + '\n');
	next();
});

// development only 配置开发环境下的错误信息
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}
//设置 / 的主页由routes.index来处理
//app.get('/', routes.index);
/**
 *	equals
 *  app.get('/',function(req,res){
 *		res.render('index',{title: 'Express'});
 * 	})
 */

//app.get('/users', user.list);

//在app.js留总的路由接口
routes(app);



http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
