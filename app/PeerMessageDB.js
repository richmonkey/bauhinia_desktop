
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

PeerMessageDB.prototype.loadMessages = function(uid, cb) {
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

module.exports = PeerMessageDB;
