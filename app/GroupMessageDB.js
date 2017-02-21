
var Datastore = require('nedb')

function GroupMessageDB(filename) {
    this.db = new Datastore({filename:filename});
    this.db.loadDatabase();
}

GroupMessageDB.prototype.saveMessage = function(msg, cb) {
    
    msg.groupID = msg.receiver;
    console.log("groupid 2222:", msg.groupID);
    this.db.insert(msg, function(err, newMsg) {
        msg.msgLocalID = newMsg._id;
        cb(msg);
    });
}

GroupMessageDB.prototype.loadGroupMessage = function(gid, cb) {
    console.log("groupid 1111:", gid);
    this.db.find({groupID:gid}).sort({timestamp:1}).exec(function(err, msgs) {
        for (var i = 0; i < msgs.length; i++) {
            msgs[i].msgLocalID = msgs[i]._id;
            console.log("msg:" + msgs[i].content);
        }
        if (err) {
            cb([]);
        } else {
            cb(msgs);
        }
    });
}

GroupMessageDB.prototype.ackMessage = function(id) {
    this.db.update({_id:id}, {$set : {ack:true}}, {}, 
                   function(err, numReplaced) {
                       if (err) {
                           return;
                       }
                       console.log("update " + id + " success");

                   });
}


var groupConversationDB = {
    //设置未读消息数
    setNewCount:function(gid, unread) {
        var key = "news_group_" + gid;
        localStorage.setItem(key, ''+unread);
    },

    getNewCount:function(gid) {
        try {
            var key = "news_group_" + gid;
            var value = localStorage.getItem(key);
            if (value) {
                var n = parseInt(value);
                return isNaN(n) ? 0 : n;
            } else {
                return 0;
            }
        } catch(e) {
            return 0;
        }
    },

    //设置会话的最后一条消息
    setLatestMessage:function(gid, msg) {
        var key = "group_" + gid;
        var value = JSON.stringify(msg);
        localStorage.setItem(key, value);
    },

    getLatestMessage:function(gid) {
        try {
            var key = "group_" + gid;
            var value = localStorage.getItem(key);
            return JSON.parse(value);
        } catch(e) {
            return null;
        }
    },

    getConversationList:function() {
        var convs = [];
        for(var i=0; i<localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k.startsWith("group_")) {
                var gid = parseInt(k.slice(6));
                if (isNaN(gid)) {
                    continue;
                }
                var conv = {
                    groupID:gid,
                }
                convs.push(conv);
            }
        }
        return convs;
    },
}
