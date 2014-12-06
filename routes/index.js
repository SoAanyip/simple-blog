
/*
 * GET home page.
 */

    //crypto用于给密码加密
var crypto = require('crypto'),    
	User = require('../models/user.js'),
	Post = require('../models/post.js'),
	Comment = require('../models/comment.js'),
	fs = require('fs'),
	errorLog = fs.createWriteStream('error.log',{flags:'a'});


//原本的
/*exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};*/

module.exports = function(app){

	app.get('/',function(req, res){
		
		var page = req.query.p? parseInt(req.query.p) : 1;

		Post.getTen(null,page,function(err,posts,total){
			if(err){
				posts = [];
			}
			res.render('index',{
				title: '首页',
				user: req.session.user,
				posts:posts,
				page:page,
				isFirstPage: (page-1) == 0,
				isLastPage: ((page-1)*10 + posts.length) == total,
			  	success: req.flash('success').toString(),
			  	error: req.flash('error').toString()
			});
		});
		/*var param = {title: '主页'};
		if(req.session.user){
			param.user = req.session.user;
		}
		if(req.flash('success').toString()){
			param.success = req.flash('success').toString();
		}
		if(req.flash('error').toString()){
			param.error = req.flash('error').toString();
		}*/

		/*res.render('index', param);*/
		
	});

//注册	
	app.all('/reg',checkNotLogin);
	app.get('/reg',function(req,res){
		res.render('reg',{
			title: '注册',
		  	success: req.flash('success').toString(),
		  	error: req.flash('error').toString()
		});
	});

	//注册的功能
	app.post('/reg',function(req, res){
		var name = req.body.name,
			password = req.body.password,
			rePassword = req.body.repeatPassword;

		if(password !== password){
			req.flash('error','not matching password');
			return res.redirect('/reg');
		};

		//生成md5密码
		var md5 = crypto.createHash('md5'),
			password = md5.update(password).digest('hex'),
			newUser = new User({
				name: name,
				password: password,
				email: req.body.email
			});

		//检测用户是否存在
		User.getAll(newUser.name,function(err,user){
			if(user){
				req.flash('error','user already existed');
				return res.redirect('/reg');
			}

			newUser.save(function(err,user){
				if(err){
					req.flash('error',err);
					return res.redirect('/reg');
				}
				req.session.user = user;
				req.flash('success','register successed');
				res.redirect('/');
			});
		});
	});

//登录
	app.all('/login',checkNotLogin);
	app.get('/login',function(req, res){
	  res.render('login', { 
	  	title: '登录',
	  	error: req.flash('error').toString()
	   });
	});
	app.post('/login',function(req, res){
		var md5 = crypto.createHash('md5'),
			password = md5.update(req.body.password).digest('hex');

		User.getAll(req.body.name,function(err,user){
			if(!user){
				req.flash('error','user not exist');
				return res.redirect('/login');
			}
			if(user.password !== password){
				req.flash('error','wrong password');
				return res.redirect('/login');
			}
			req.session.user = user;
			req.flash('success','login successed');
			res.redirect('/');
		});
	});


	app.all('/post',checkLogin);
	app.get('/post',function(req, res){
	  res.render('post', { 
	  	title: '发表',
	  	user: req.session.user,
	  	 });
	});
	app.post('/post',function(req, res){
		var currentUser = req.session.user,
			post = new Post(currentUser.name,req.body.title,req.body.post);
		post.save(function(err){
			if(err){
				req.flash('error',err);
				return res.redirect('/post');
			}
			req.flash('success','post success');
			res.redirect('/');
		});
	});



	app.all('/logout',checkLogin);
	app.get('/logout',function(req, res){
		req.session.user = null;
		req.flash('success','logout successed');
		res.redirect('/');
	});

	app.get('/u/:name',function(req,res){

		var page = req.query.p? parseInt(req.query.p) : 1;

		User.getAll(req.params.name,function(err,user){
			if(!user){
				req.flash('error',err);
				return res.redirect('/');
			}

			Post.getTen(user.name,page,function(err,posts,total){
				if(err){
					req.flash('error',err);
					return res.redirect('/');
				}
				res.render('user',{
					title: user.name,
					posts:posts,
					page:page,
					isFirstPage:(page-1)==0,
					isLastPage:((page-1)*10 + posts.length) == total,
					user:req.session.user,
					success: req.flash('success').toString(),
					error: req.flash('error').toString()
				});
			});
		});
	});

	app.get('/u/:name/:day/:title',function(req,res){
		Post.getOne(req.params.name,req.params.day,req.params.title,function(err,post){
			if(err){
				req.flash('error',err);
				return res.redirect('/');
			}
			res.render('article',{
				title:req.params.title,
				post:post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});
	app.post('/u/:name/:day/:title',function(req,res){
		var date = new Date(),
			time = date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()
		 + " " + date.getHours() + ":" + 
		 (date.getMinutes()<10? '0' + date.getMinutes(): date.getMinutes());
		 var comment = {
		 	name:req.body.name,
		 	email: req.body.email,
		 	website:req.body.website,
		 	time:time,
		 	content:req.body.content
		 };
		 var newComment = new Comment(req.params.name,req.params.day,
		 	req.params.title,comment);
		 newComment.save(function(err){
		 	if(err){
		 		req.flash('error',err);
		 		return res.redirect('back');
		 	}
		 	req.flash('success','comment successed');
		 	res.redirect('back');
		 });
	});


	app.all('/edit/:name/:day/:title',checkLogin);
	app.get('/edit/:name/:day/:title',function(req,res){
		var currentUser = req.session.user;
		Post.edit(currentUser.name,req.params.day,req.params.title,function(err,post){
			if(err){
				req.flash('error',err);
				return res.redirect('back');
			}
			res.render('edit',{
				title:'edit',
				post: post,
				user: req.session.user,
				success: req.flash('success').toString(),
				error: req.flash('error').toString()
			});
		});
	});

	app.post('/edit/:name/:day/:title',function(req,res){
		var currentUser = req.session.user;
		Post.update(currentUser.name,req.params.day,req.params.title,req.body.post,function(err){
			var url='/u/' + req.params.name + '/' + req.params.day + '/' + 
				req.params.title;
			if(err){
				req.flash('error',err);
				return res.redirect(url);
			}
			req.flash('success','update successed');
			res.redirect(url);
		});
	});


	app.all('/remove/:name/:day/:title',checkLogin);
	app.get('/remove/:name/:day/:title',function(req,res){
		var currentUser = req.session.user;
		Post.remove(currentUser.name,req.params.day,req.params.title,function(err){
			if(err){
				req.flash('error',err);
				res.redirect('back');
			}
			req.flash('success','delete successed');
			res.redirect('/');
		});
	});


	app.all('/reprint/:name/:day/:title',checkLogin);
	app.get('/reprint/:name/:day/:title',function(req,res){
		Post.edit(req.params.name,req.params.day,req.params.title,function(err,post){
			if(err){
				req.flash('error',err);
				return res.redirect('back');
			}
			var currentUser = req.session.user,
				reprint_from = {name: post.name,day: post.time.day,title:post.title},
				reprint_to = {name:currentUser.name};

			Post.reprint(reprint_from,reprint_to,function(err,postAfter){
				if(err){
					req.flash('error',err);
					return res.redirect('back');
				}
				req.flash('success','reprint successed');
				//未解决：post的属性无论显示在哪里都没有问题，但是在url红会报错，暂时解决办法：
				//用encodeURIComponent先转码。
				var url = '/u/' + postAfter.name + '/' + postAfter.time.day + '/' + encodeURIComponent(postAfter.title);
				res.redirect(url);
			});
		});
	});


	app.get('/search',function(req,res){
		Post.search(req.query.keyword,function(err,posts){
			if(err){
				req.flash('error',err);
				return res.redirect('/');
			}
			res.render('search',{
				title:'SEARCH:' + req.query.keyword,
				posts:posts,
				user:req.session.user,
				success:req.flash('success').toString(),
				error:req.flash('error').toString()
			});
		});
	});

	app.use(function(req,res){
		res.render('404');
	})

	//是否登录的检查
	function checkLogin(req,res,next){
		if(!req.session.user){
			req.flash('error','not login');
			res.redirect('/login');
		}
		next();
	}
	function checkNotLogin(req,res,next){
		if(req.session.user){
			req.flash('error','has logined');
			res.redirect('back');  //返回上一页  带参数
		}
		next();
	}
};