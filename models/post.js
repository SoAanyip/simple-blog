var mongodb = require('./db');
var markdown = require('markdown').markdown;
var fs = require('fs'),
	errorLog = fs.createWriteStream('error.log',{flags:'a'});

function Post(name,title,post){
	this.name = name;
	this.post = post;
	this.title = title;
}

module.exports = Post;

//save an article
Post.prototype.save = function(callback){
	var date = new Date();

	var time = {
		date: date,
		year: date.getFullYear(),
		month: date.getFullYear() + "-" + (date.getMonth()+1),
		day: date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate(),
		minute: date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()
		 + " " + date.getHours() + ":" + 
		 (date.getMinutes()<10? '0' + date.getMinutes(): date.getMinutes())
	};

	var post = {
		name: this.name,
		time:time,
		title:this.title,
		post:this.post,
		comments: [],
		reprint_info:{}
	};

	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}

		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}

			collection.insert(post,{
				safe:true
			},function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};

Post.getAll = function(name,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}

		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			var query = {};
			if(name){
				query.name = name;
			}

			collection.find(query).sort({
				time:-1
			}).toArray(function(err,docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				//解析markdown为html
				docs.forEach(function(doc){
					doc.post = markdown.toHTML(doc.post);
				});
				callback(null,docs);
			});
		});
	});
};

Post.getTen = function(name,page,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}

		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}

			var query = {};
			if(name){
				query.name = name;
			}
			collection.count(query,function(err,total){
				collection.find(query,{
					skip: (page -1 )*10,
					limit: 10
				}).sort({
					time:-1
				}).toArray(function(err,docs){
					mongodb.close();
					if(err){
						return callback(err);
					}
					docs.forEach(function(doc){
						doc.post = markdown.toHTML(doc.post);
					});
					callback(null,docs,total);
				});
			});
		});
	});
};


Post.getOne = function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}

		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}

			collection.findOne({
				"name": name,
				"time.day": day,
				"title": title
			},function(err,doc){
				mongodb.close();
				if(err){
					return callback(err);
				}
				if(doc){
					doc.post = markdown.toHTML(doc.post);
					if(doc.comments){
						doc.comments.forEach(function(comment){
							comment.content = markdown.toHTML(comment.content);
						});
					}
				}
				
				callback(null, doc);
			});
		});
	});
};

Post.edit = function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}

		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}

			collection.findOne({
				'name':name,
				'time.day':day,
				'title':title
			},function(err,doc){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null,doc);
			});
		});
	});
};

Post.update = function(name,day,title,post,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.update({
				"name":name,
				"time.day": day,
				"title":title
			},{
				$set:{post:post}
			},function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null);
			});
		});
	});
};

Post.remove = function(name,day,title,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}

			collection.findOne({
				'name':name,
				'time.day':day,
				'title':title
			},function(err,doc){
				if(err){
					mongodb.close();
					return callback(err);
				}

				var reprint_from = doc.reprint_info.reprint_from || "";
				if(reprint_from){
					collection.update({
						'name':reprint_from.name,
						'time.day': reprint_from.day,
						'title':reprint_from.title
					},{
						$pull:{
							'reprint_info.reprint_to':{
								'name':name,
								'day':day,
								'title':title
							}
						}
					},function(err){
						if(err){
							mongodb.close();
							return callback(err);
						}
					});
				}
				//..
				/*var reprint_to = doc.reprint_info.reprint_to || "";
				if(reprint_to){
					for(var i = 0,length = reprint_to.length;i<length;i++){
						errorLog.write('all:' + length + ',remove: '+ reprint_to[i].title + ',author: ' + reprint_to[i].name);
						Post.remove(reprint_to[i].name,reprint_to[i].day,reprint_to[i].title,function(err){
							if(err){
								mongodb.close();
								return callback(err);
							}
						})
					}
				}*/
				//..
				collection.remove({
					"name":name,
					"time.day": day,
					"title":title
				},
			/**
			 *  Write concetns. 
			 * if 0,  there will be no way for the driver to know about the change
			 * so it will continue and silently fail to write.
			 */
				{
					w: 1
				},function(err){
					mongodb.close();
					if(err){
						return callback(err);
					}
					callback(null);
				});
			});
		});
	});
};

Post.search = function(keyword,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				db.close();
				return callback(err);
			}

			var pattern = new RegExp("^.*" + keyword + ".*$","i");
			collection.find({
				'title': pattern
			},{
				'name':1,
				'time':1,
				'title':1
			}).sort({
				time:-1
			}).toArray(function(err,docs){
				mongodb.close();
				if(err)
					return callback(err);
				callback(null,docs);
			});
		});
	});
};

Post.reprint = function(reprint_from,reprint_to,callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}

			collection.findOne({
				'name':reprint_from.name,
				'time.day':reprint_from.day,
				'title':reprint_from.title
			},function(err,doc){
				if(err){
					mongodb.close();
					return callback(err);
				}

				var date = new Date();
				var time = {
					date: date,
					year: date.getFullYear(),
					month: date.getFullYear() + "-" + (date.getMonth()+1),
					day: date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate(),
					minute: date.getFullYear() + "-" + (date.getMonth()+1) + "-" + date.getDate()
					 + " " + date.getHours() + ":" + 
					 (date.getMinutes()<10? '0' + date.getMinutes(): date.getMinutes())
				};

				/**
				 *  将原doc在数据库中的id删除，在此之上修改它的内容，
				 *	作为一篇新的被转载的文章存入数据库
				 */
				delete doc._id; //删除其在数据库中的id

				doc.name = reprint_to.name;
				doc.time = time;
				doc.title = (doc.title.search(/[转载]/) >-1) ? doc.title : "[转载]" + doc.title;
				doc.comments = [];
				doc.reprint_info = {'reprint_from':reprint_from};

				//更新被转载文章的repaint_info的reprint_to
				collection.update({
					name:reprint_from.name,
					'time.day':reprint_from.day,
					title:reprint_from.title
				},{
					$push:{
						'reprint_info.reprint_to':{
							'name':doc.name,
							'day':time.day,
							'title':doc.title
						}
					}
				},function(err){
					if(err){
						mongodb.close();
						return callback(err);
					}

					collection.insert(doc,{
						safe:true
					},function(err,post){
						mongodb.close();
						if(err){
							return callback(err);
						}
						callback(null,post[0]);
					});
				});
			});
		});
	});
};