var Datastore = require('nedb')

function ConversationDB(filename) {
    this.db = new Datastore({filename:filename});
    this.db.loadDatabase();
}

ConversationDB.prototype.addConversation = function(conv) {
    this.db.insert(conv, function(err, newConv) {

    });
}

ConversationDB.prototype.setLatestMessage = function(cid, msg) {
    this.db.update({cid:cid}, {$set : {message:msg}}, {}, 
                   function(err, numReplaced) {
                       console.log("set latest message:", err, numReplaced);
                   });    
}

ConversationDB.prototype.setNewCount = function(cid, unread) {
    this.db.update({cid:cid}, {$set : {unread:unread}}, {}, 
                   function(err, numReplaced) {
                       console.log("set new count:", err, numReplaced);
                   });    
}

ConversationDB.prototype.getConversationList = function(cb) {
    this.db.find({}).exec(function(err, convs) {
        cb(err, convs);
    });
}

module.exports = ConversationDB;
