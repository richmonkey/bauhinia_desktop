
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

GroupMessageDB.prototype.loadMessages = function(gid, cb) {
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

module.exports = GroupMessageDB;
