var crypto = require('crypto');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/blog');

var userSchema = new mongoose.Schema({
	name:String,
	password:String,
	email:String
},{
	collection:'users'
});

var userModel = mongoose.model('User',userSchema);

function User(user){
	this.name = user.name;
	this.password = user.password;
	this.email = user.email;
};

module.exports = User;

//存储用户信息
User.prototype.save = function(callback){
	var md5 = crypto.createHash('md5'),
		email_MD5 = md5.update(this.email.toLowerCase()).digest('hex');

	//要存入数据库的用户文档
	var user = {
		name: this.name,
		password: this.password,
		email: this.email
	};

	var newUser = new userModel(user);
	newUser.save(function(err,user){
		if(err){
			return callback(err);
		}
		callback(null,user);
	});
	//打开数据库
	/*mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		//读取users集合
		db.collection('users',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//将用户数据插入users集合
			collection.insert(user,{
				safe: true
			},function(err,user){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null,user[0]);  //成功时返回存储后用户文档
			});
		});
	});*/
};

//读取用户信息
User.getAll = function(name,callback){

	userModel.findOne({
		name:name
	},function(err,user){
		if(err){
			return callback(err);
		}
		callback(null,user);
	})

	/*mongodb.open(function(err,db){
		if(err){
			return callback(err);
		};

		db.collection('users',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			};
			//通过用户名(name)查找文档
			collection.findOne({
				name: name
			},function(err,user){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null,user);
			});
		});
	});*/
};

