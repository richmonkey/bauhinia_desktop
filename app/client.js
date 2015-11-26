//var URL = "http://dev.gobelieve.io";
//var API_URL = "http://192.168.33.10";

var URL = "http://gobelieve.io";
var API_URL = "http://api.gobelieve.io";


var userDB = {
    users : new Array(),
    addUser : function(newUser) {
        var exists = false;
        for (var i in this.users) {
            var user = this.users[i];
            if (user.uid == newUser.uid) {
                exists = true;
            }
        }
        if (!exists) {
            this.users.push(newUser);
        }
        return !exists;
    },
    findUser : function(uid) {
        for (var i in this.users) {
            var user = this.users[i];
            if (user.uid == uid) {
                return user;
            }
        }
        return null;
    }
}


var observer = {
    handlePeerMessage: function (msg) {
        console.log("msg sender:", msg.sender, " receiver:", msg.receiver, " content:", msg.content, " timestamp:", msg.timestamp);

        try {
            msg.contentObj = JSON.parse(msg.content)
        } catch (e) {
            console.log("json parse exception:", e);
            return
        }

        var cid;
        if (msg.sender == loginUser.uid) {
            cid = msg.receiver;
        } else {
            cid = msg.sender;
        }

        if (cid == peer) {
            addMessage(msg);
        }

        imDB.saveMessage(cid, msg);
        var user = {uid:cid};
        var inserted = userDB.addUser(user);
        if (inserted) {
            addUser(user);
        }
        if (msg.sender != loginUser.uid) {
            process.msgTip(cid);
        }
    },

    handleMessageACK: function (msgLocalID, uid) {
        imDB.ackMessage(uid, msgLocalID);
        process.msgACK(msgLocalID,uid);
        console.log("message ack local id:", msgLocalID, " uid:", uid);
    },
    handleMessageFailure: function (msgLocalID, uid) {
        console.log("message fail local id:", msgLocalID, " uid:", uid);
    },
    onConnectState: function (state) {
        if (state == IMService.STATE_CONNECTED) {
            console.log("im connected");
        } else if (state == IMService.STATE_CONNECTING) {
            console.log("im connecting");
        } else if (state == IMService.STATE_CONNECTFAIL) {
            console.log("im connect fail");
        } else if (state == IMService.STATE_UNCONNECTED) {
            console.log("im unconnected");
        }
    }
};


function getContactList() {
    $.ajax({
        url: URL + "/users",
        dataType: 'json',
        headers: {"Authorization": "Bearer " + accessToken},
        success: function (result, status, xhr) {
            for (var i in result) {
                contact = result[i];
                userDB.addUser(contact);
                addUser(contact);
                console.log("contact:", contact, contact.avatar, contact.name, contact.uid);
            }
        },
        error: function (xhr, err) {
            console.log("get contact list err:", err, xhr.status)
        }
    });
}

function qrcodeLogin(success, error) {
    console.log("app login sid:", sid);

    $.ajax({
        url: URL + "/qrcode/login",
        dataType: 'json',
        data: {sid: sid},
        success: function (result, status, xhr) {
            if (status == "success") {
                success(result);
            } else {
                console.log("login error status:", status);
                error();
            }
        },
        error: function (xhr, err) {
            console.log("login err:", err, xhr.status);
            if (xhr.status == 400) {
                console.log("timeout");
                var now = new Date();
                var t = now.getTime() - startup.getTime();
                if (t > QRCODE_EXPIRE) {
                    error();
                } else {
                    qrcodeLogin(success);
                }
            } else {
                error();
            }
        }
    });
}

function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    var response = {};

    if (matches.length !== 3) {
        return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');

    console.log("image type:" + response.type);
    return response;
}

function uploadImage(data, success, fail) {

    var url = API_URL + "/images";
    var image = decodeBase64Image(data);
    var imageData = image.data;
    var imageType = image.type;
    var headers = {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": imageType
    };

    $.ajax({
        url: url,
        method: "POST",
        headers: headers,
        data:imageData,
        processData:false,
        success: function (result, status, xhr) {
            if (status == "success") {
                console.log("url:" + result + result.src_url);
                success(result.src_url);
            } else {
                fail();
            }
        },
        error: function (xhr, err) {
            console.log("upload image error:", err, xhr.status, xhr);
            fail();
        }
    });
}

function refreshQRCode(success) {
    url = URL + "/qrcode/session";
    $.ajax({
        url: url,
        dataType: 'json',
        method:'GET',
        success: function (result, status, xhr) {
            if (status == "success") {
                success(result);
            } else {

            }
        },
        error: function (xhr, err) {
            console.log("refresh qrcode error:", err, xhr.status);
        }
    });
}
