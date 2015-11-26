function IMDB() {
    this.messages = {}
}

IMDB.prototype.saveMessage = function(uid, msg) {
    if (!this.messages[uid]) {
        this.messages[uid] = new Array()
    }

    this.messages[uid].push(msg)
}

IMDB.prototype.loadUserMessage = function(uid) {
    if (!this.messages[uid]) {
        return new Array();
    }
    return this.messages[uid];
}

IMDB.prototype.ackMessage = function(uid, msgLocalID) {
    if (!this.messages[uid]) {
        return
    }

    var messages = this.messages[uid];
    for (var i in messages) {
        var msg = messages[i];
        if (msg.msgLocalID == msgLocalID) {
            msg.ack = true;
            break;
        }
    }
}

IMDB.prototype.ackMessageFromRemote = function(uid, msgLocalID) {
    if (!this.messages[uid]) {
        return
    }
    var messages = this.messages[uid];
    for (var i in messages) {
        var msg = messages[i];
        if (msg.msgLocalID == msgLocalID) {
            msg.received = true;
            break;
        }
    }    
}
