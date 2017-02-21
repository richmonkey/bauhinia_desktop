
var Datastore = require('nedb')

function PeerMessageDB(filename) {
    this.db = new Datastore({filename:filename});
    this.db.loadDatabase();
}

PeerMessageDB.prototype.saveMessage = function(msg, cb) {
    this.db.insert(msg, function(err, newMsg) {
        msg.msgLocalID = newMsg._id;
        cb(msg);
    });
}

PeerMessageDB.prototype.loadUserMessage = function(uid, cb) {
    this.db.find({peer:uid}).sort({timestamp:1}).exec(function(err, msgs) {
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

PeerMessageDB.prototype.ackMessage = function(id) {
    this.db.update({_id:id}, {$set : {ack:true}}, {}, 
                   function(err, numReplaced) {
                       if (err) {
                           return;
                       }
                       console.log("update " + id + " success");

                   });
}


var conversationDB = {
    //设置未读消息数
    setNewCount:function(uid, unread) {
        var key = "news_peer_" + uid;
        localStorage.setItem(key, ''+unread);
    },

    getNewCount:function(uid) {
        try {
            var key = "news_peer_" + uid;
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
    setLatestMessage:function(uid, msg) {
        var key = "peer_" + uid;
        var value = JSON.stringify(msg);
        localStorage.setItem(key, value);
    },

    getLatestMessage:function(uid) {
        try {
            var key = "peer_" + uid;
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
            if (k.startsWith("peer_")) {
                var uid = parseInt(k.slice(5));
                var conv = {
                    peer:uid,
                }
                convs.push(conv);
            }
        }
        return convs;
    },
}
