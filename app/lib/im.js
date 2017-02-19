function IMService(observer) {
    this.host = "imnode.gobelieve.io";
    this.port = 13890;
    this.accessToken = "";
    if (observer == undefined) {
        this.observer = null;
    } else {
        this.observer = observer;
    }

    this.socket = null;
    this.connectFailCount = 0;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.seq = 0;
    this.stopped = true;
    //sending message
    this.messages = {}

    this.device_id = IMService.guid();
}

IMService.HEADSIZE = 12;
IMService.VERSION = 1;

IMService.STATE_UNCONNECTED = 0;
IMService.STATE_CONNECTING = 1;
IMService.STATE_CONNECTED = 2;
IMService.STATE_CONNECTFAIL = 3;


IMService.MSG_AUTH_STATUS = 3;
IMService.MSG_IM = 4;
IMService.MSG_ACK = 5;
IMService.MSG_RST = 6;
IMService.MSG_PEER_ACK = 9;
IMService.MSG_AUTH_TOKEN = 15;


IMService.PLATFORM_ID = 3;


IMService.prototype.start = function () {
    if (!this.stopped) {
        console.log("im service already be started");
        return;
    }
    console.log("start im service");
    this.stopped = false;
    this.connect()
};

IMService.prototype.stop = function () {
    if (this.stopped) {
        console.log("im service already be stopped");
        return;
    }
    console.log("stop im service");
    this.stopped = true;
    if (this.socket == null) {
        return;
    }
    console.log("close socket");
    this.socket.close();
    this.socket = null;
};

IMService.prototype.callStateObserver = function () {
    if (this.observer != null && "onConnectState" in this.observer) {
        this.observer.onConnectState(this.connectState)
    }
};

IMService.prototype.connect = function () {
    if (this.stopped) {
        console.log("im service stopped");
        return;
    }
    if (this.socket != null) {
        console.log("socket is't null")
        return;
    }

    console.log("connect host:" + this.host + " port:" + this.port);
    this.connectState = IMService.STATE_CONNECTING;
    this.callStateObserver();

    if ("WebSocket" in window) {
        this.socket = eio({hostname:this.host, port:this.port, transports:["websocket"]});
    } else {
        this.socket = eio({hostname:this.host, port:this.port, transports:["polling"]});
    }

    var self = this;
    this.socket.on('open', function() {
        self.onOpen();
    });

    this.socket.on('error', function(err) {
        self.onError(err);
    });
};



IMService.prototype.onOpen = function () {
    console.log("socket opened");
    var self = this;
    this.socket.on('message', function(data) {
        self.onMessage(data)
    });
    this.socket.on('close', function() {
        self.onClose();
    });

    this.sendAuth();
    this.connectFailCount = 0;
    this.seq = 0;
    this.connectState = IMService.STATE_CONNECTED;
    this.callStateObserver();
};

IMService.prototype.onMessage = function (data) {
    if (typeof data == "string") {
        console.log("invalid data type:" + typeof data);
        return;
    } else if (!(data instanceof ArrayBuffer)) {
        console.log("invalid data type:" + typeof data);
        return;
    }

    var buf = new Uint8Array(data);
    var len = ntohl(buf, 0);
    var seq = ntohl(buf, 4)
    var cmd = buf[8];

    if (len + IMService.HEADSIZE < buf.length) {
        console.log("invalid data length:" + buf.length + " " + len+IMService.HEADSIZE);
        return;
    }

    var pos = IMService.HEADSIZE;
    if (cmd == IMService.MSG_IM) {
        var msg = {}

        msg.sender = ntoh64(buf, pos);
        pos += 8;

        msg.receiver = ntoh64(buf, pos);
        pos += 8;
        
        msg.timestamp = ntohl(buf, pos);
        pos += 4;

        //msgid
        pos += 4;

        msg.content = IMService.Utf8ArrayToStr(new Uint8Array(data, IMService.HEADSIZE + 24, len-24));

        console.log("im message sender:" + msg.sender +" receiver:" + msg.receiver + "content:" + msg.content);

        if (this.observer != null && "handlePeerMessage" in this.observer) {
            this.observer.handlePeerMessage(msg);
        }

        this.sendACK(seq);
    } else if(cmd == IMService.MSG_AUTH_STATUS) {
        var status = ntohl(buf, pos);
        console.log("auth status:" + status);
    } else if (cmd == IMService.MSG_ACK) {
        var ack = ntohl(buf, pos);
        if (ack in this.messages) {
            var msg = this.messages[ack];
            if (this.observer != null && "handleMessageACK" in this.observer){
                this.observer.handleMessageACK(msg.msgLocalID, msg.receiver)
            }
            delete this.messages[ack]
        }
    } else {
        console.log("message command:" + cmd);
    }
};

IMService.prototype.onError = function (err) {
    console.log("err:" + err);
    this.socket.close();
    this.socket = null;
    this.connectFailCount++;
    this.connectState = IMService.STATE_CONNECTFAIL;
    this.callStateObserver();

    var self = this;
    f = function() {
        self.connect()
    };
    setTimeout(f, this.connectFailCount*1000);
};

IMService.prototype.onClose = function() {
    console.log("socket disconnect");
    this.socket = null;
    this.connectState = IMService.STATE_UNCONNECTED;
    this.callStateObserver();
    
    for (var seq in this.messages) {
        var msg = this.messages[seq];
        if (this.observer != null && "handleMessageFailure" in this.observer){
            this.observer.handleMessageFailure(msg.msgLocalID, msg.receiver)
        }
    }
    this.messages = {};

    var self = this;
    f = function() {
        self.connect();
    };
    setTimeout(f, 400);
};

IMService.prototype.sendACK = function(ack) {
    var arrayBuffer = new ArrayBuffer(4);
    var buf = new Uint8Array(arrayBuffer);
    htonl(buf, 0, ack);
    this.send(IMService.MSG_ACK, buf);
}

IMService.prototype.sendAuth = function() {
    var arrayBuffer = new ArrayBuffer(1024);
    var buf = new Uint8Array(arrayBuffer);
    var pos = 0;
    buf[pos] = IMService.PLATFORM_ID;
    pos++;
    
    var t = IMService.StrToUtf8Array(this.accessToken);
    buf[pos] = t.length;
    pos++;
    buf.set(t, pos);
    pos += t.length;

    t = IMService.StrToUtf8Array(this.device_id);
    buf[pos] = t.length;
    pos++;
    buf.set(t, pos);
    pos += t.length;

    var body = new Uint8Array(arrayBuffer, 0, pos);
    this.send(IMService.MSG_AUTH_TOKEN, body);
}

//typeof body == uint8array
IMService.prototype.send = function (cmd, body) {
    if (this.socket == null) {
        return false;
    }
    this.seq++;

    var arrayBuffer = new ArrayBuffer(IMService.HEADSIZE+body.length);
    var buf = new Uint8Array(arrayBuffer);
    var pos = 0;
    htonl(buf, pos, body.length);
    pos += 4;
    htonl(buf, pos, this.seq);
    pos += 4;

    buf[pos] = cmd;
    pos++;
    buf[pos] = IMService.VERSION;
    pos++;
    buf[pos] = 0;
    buf[pos+1] = 0;
    //buf.fill(2, pos, pos + 2);
    pos += 2;

    buf.set(body, pos);
    pos += body.length;

    this.socket.send(arrayBuffer);
    return true
};

IMService.prototype.sendPeerMessage = function (msg) {
    if (this.connectState != IMService.STATE_CONNECTED) {
        return false;
    }

    var content = IMService.StrToUtf8Array(msg.content);
    var arrayBuffer = new ArrayBuffer(24+content.length);
    var buf = new Uint8Array(arrayBuffer);
    var pos = 0;

    hton64(buf, pos, msg.sender);
    pos += 8;
    hton64(buf, pos, msg.receiver);
    pos += 8;
    htonl(buf, pos, msg.timestamp)
    pos += 4;
    htonl(buf, pos, msg.msgLocalID);
    pos += 4;
    buf.set(content, pos);

    var r = this.send(IMService.MSG_IM, buf);
    if (!r) {
        return false;
    }

    this.messages[this.seq] = msg;
    return true;
};

IMService.Utf8ArrayToStr= function (array) {
    var out, i, len, c;
    var char2, char3;

    out = "";
    len = array.length;
    i = 0;

    // XXX: Invalid bytes are ignored
    while(i < len) {
        c = array[i++];
        if (c >> 7 == 0) {
            // 0xxx xxxx
            out += String.fromCharCode(c);
            continue;
        }

        // Invalid starting byte
        if (c >> 6 == 0x02) {
            continue;
        }

        // #### MULTIBYTE ####
        // How many bytes left for thus character?
        var extraLength = null;
        if (c >> 5 == 0x06) {
            extraLength = 1;
        } else if (c >> 4 == 0x0e) {
            extraLength = 2;
        } else if (c >> 3 == 0x1e) {
            extraLength = 3;
        } else if (c >> 2 == 0x3e) {
            extraLength = 4;
        } else if (c >> 1 == 0x7e) {
            extraLength = 5;
        } else {
            continue;
        }

        // Do we have enough bytes in our data?
        if (i+extraLength > len) {
            var leftovers = array.slice(i-1);

            // If there is an invalid byte in the leftovers we might want to
            // continue from there.
            for (; i < len; i++) if (array[i] >> 6 != 0x02) break;
            if (i != len) continue;

            // All leftover bytes are valid.
            return {result: out, leftovers: leftovers};
        }
        // Remove the UTF-8 prefix from the char (res)
        var mask = (1 << (8 - extraLength - 1)) - 1,
            res = c & mask, nextChar, count;

        for (count = 0; count < extraLength; count++) {
            nextChar = array[i++];

            // Is the char valid multibyte part?
            if (nextChar >> 6 != 0x02) {break;};
            res = (res << 6) | (nextChar & 0x3f);
        }

        if (count != extraLength) {
            i--;
            continue;
        }

        if (res <= 0xffff) {
            out += String.fromCharCode(res);
            continue;
        }

        res -= 0x10000;
        var high = ((res >> 10) & 0x3ff) + 0xd800,
            low = (res & 0x3ff) + 0xdc00;
        out += String.fromCharCode(high, low);
    }

    return out;
}

IMService.StrToUtf8Array = function (str) {
    var arrayBuffer = new ArrayBuffer(str.length*3);
    var buf = new Uint8Array(arrayBuffer);
    var pos = 0;

    for (var i = 0; i < str.length; i++) {
        var value = str.charCodeAt(i);

        if (value < 0x80) {
            buf[pos] = value;
            pos++;
        } else if (value < 0x0800) {
            buf[pos] = (value >> 6) | 0xD0;
            pos++;
            buf[pos] = (value & 0x3F) | 0x80;
            pos++;
        } else if (value <= 0xFFFF) {
            buf[pos] = (value >> 12) | 0xE0;
            pos++;
            buf[pos] = ((value >> 6) & 0x3F) | 0x80;
            pos++;
            buf[pos] = (value & 0x3F) | 0x80;
            pos++;
        } 
    }
    return new Uint8Array(arrayBuffer.slice(0, pos));
}


IMService.guid = function () {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
}
