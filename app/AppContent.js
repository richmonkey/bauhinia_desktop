var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('redux');
var createStore = redux.createStore;
var combineReducers = redux.combineReducers;
var redux = require('react-redux')
var Provider = redux.Provider;
var connect = redux.connect;


var ConversationList = require('./ConversationList.js');
var ContactList = require('./ContactList.js');
var ChatHistory = require("./ChatHistory.js");
var AppContent = require("./AppContent.js");


var capture = require("mac-screen-capture");
var clipboard = require("clipboard");
var remote = require('remote');
var app = remote.require('app');
var ipc = require('ipc');
var path = require('path');


var URL = "http://gobelieve.io";
var API_URL = "http://api.gobelieve.io";
var QRCODE_EXPIRE = 3*60*1000;


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


function setDockBadge(total) {
    console.log("unread count:" + total);
    if (total > 0) {
        ipc.sendSync('set-badge', "" + total);
    } else {
        ipc.sendSync('set-badge', "");
    }
}

var AppContent = React.createClass({
    loadContacts:function(accessToken) {
        console.log("get user list...");
        $.ajax({
            url: URL+"/users",
            dataType: 'json',
            headers: {"Authorization": "Bearer " + accessToken},
            success: function(data) {
                console.log("users:" + typeof(data));
                //for (var i in data) {
                //    var contact = data[i];
                    //userDB.addUser(contact);
                //}
                this.props.dispatch({type:"set_contacts", contacts:data});
            }.bind(this),
            error: function(xhr, status, err) {
                console.error("/users", status, err.toString());
            }.bind(this)
        });
    },

    loadData: function(uid, token) {
        var filename = path.join(app.getPath("userData"), "messages_" + uid + ".db");
        console.log("message db file name:" + filename);
        this.imDB = new IMDB(filename);

        this.im.accessToken = token;
        this.im.start();

        var loginUser = {uid:uid};
        this.props.dispatch({type:"set_login_user", loginUser:loginUser});
        var convs = conversationDB.getConversationList();
        console.log("convs:" + convs + " " + convs.length);
        this.props.dispatch({type:"set_conversations", conversations:convs});

        this.loadContacts(token);
    },

    showNotification: function(title, body) {
        // Let's check if the browser supports notifications
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
        }

        var options = {
            body:body,
        };

        var notification = new Notification(title, options);
        notification.onclick = function() {
            console.log("notification on click");
        };
    },

    showMessageNotification: function(msg) {
        var cid;
        if (msg.sender == this.props.loginUser.uid) {
            cid = msg.receiver;
        } else {
            cid = msg.sender;
        }
        var u = userDB.findUser(cid);
        var title = ""
        if (u && u.name) {
            console.log("u name:" + u.name);
            title = u.name;
        } else {
            title = helper.getPhone(cid);
        }
        var content = "";
        if (msg.contentObj.text) {
            content = msg.contentObj.text;
        } else if (msg.contentObj.audio) {
            content = "一条语音";
        } else if (msg.contentObj.image) {
            content = "一张图片";
        }

        this.showNotification(title, content);

    },


    startCapture: function(target) {
        capture.captureScreen().then(
            function (code) {
                console.log("resolve code:" + code);
                if (code != 0) {
                    return;
                }
                var temp = clipboard.readImage();
                var b64 = temp.toDataUrl();
                var now = new Date();
                var obj = {"image": b64};
                var msg = {
                    sender: this.props.loginUser.uid,
                    receiver: target,
                    content: JSON.stringify(obj),
                    timestamp: (now.getTime() / 1000)
                };
                msg.contentObj = obj;
                this.imDB.saveMessage(target, msg);
                addMessage(msg);
                $("#chatHistory").show();
                uploadImage(b64,
                            function (url) {
                                var obj = {"image": url};
                                msg.content = JSON.stringify(obj);
                                msg.contentObj = obj;
                                if (this.im.connectState == IMService.STATE_CONNECTED) {
                                    this.im.sendPeerMessage(msg);
                                }
                            },
                            function () {
                                console.log('error');
                            }
                );
            }, function (code) {
                console.log("reject code:" + code);
            });
    },



    handlePeerMessage: function (msg) {
        console.log("msg sender:", msg.sender, " receiver:", msg.receiver, " content:", msg.content, " timestamp:", msg.timestamp);

        try {
            msg.contentObj = JSON.parse(msg.content)
        } catch (e) {
            console.log("json parse exception:", e);
            return
        }

        var cid;
        if (msg.sender == this.props.loginUser.uid) {
            cid = msg.receiver;
        } else {
            cid = msg.sender;
        }

        this.imDB.saveMessage(cid, msg, () =>  {
            conversationDB.setLatestMessage(cid, msg);

            if (this.props.conversation.cid == cid) {
                this.props.dispatch({type:"add_message", message:msg});
                scrollDown();
            }

            var index = -1;
            for (var i = 0; i < this.props.conversations.length; i++) {
                if (this.props.conversations[i].cid == cid) {
                    index = i;
                    break;
                }
            }

            var conv = {cid:cid, message:msg, unread:0};
            if (index == -1) {
                this.props.dispatch({type:"add_conversation", conversation:conv});
            }

            if (msg.sender != this.props.loginUser.uid) {
                //process.msgTip(cid);
                if (player.paused) {
                    console.log("play.....");
                    player.play();
                } else {
                    console.log("player is playing...");
                }
            } else {
                this.imDB.ackMessage(cid, msg.msgLocalID);
                if (this.props.conversation.cid == cid) {
                    this.props.dispatch({type:"ack_message", 
                                         msgLocalID:msg.msgLocalID});
                }
            }

            var win = remote.getCurrentWindow();
            if ((!win.isFocused() || cid != this.props.conversation.cid) && 
                msg.sender != this.props.loginUser.uid) {
                this.showMessageNotification(msg);

                var index = -1;
                for (var i = 0; i < this.props.conversations.length; i++) {
                    if (this.props.conversations[i].cid == cid) {
                        index = i;
                        break;
                    }
                }

                if (index != -1) {
                    var unread = this.props.conversations[index].unread + 1;
                    this.props.dispatch({type:"set_unread", cid:cid, unread:unread});
                    conversationDB.setNewCount(cid, unread);

                    var total = 0;
                    for (var i = 0; i < this.props.conversations.length; i++) {
                        total = total + this.props.conversations[i].unread;
                    }
                    setDockBadge(total);
                }
            }
        });
    },

    handleMessageACK: function (msgLocalID, uid) {
        this.imDB.ackMessage(uid, msgLocalID);
        if (this.props.conversation.cid == uid) {
            this.props.dispatch({type:"ack_message", msgLocalID:msgLocalID});
        }
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
    },


    getInitialState: function() {
        this.im = new IMService(this);
        return {};
    },
    componentDidMount: function() {
    },

    componentWillUnmount: function() {
    },
    

    sendTextMessage:function(text, target) {
        var now = new Date();
        var obj = {"text": text};
        var textMsg = JSON.stringify(obj);
        var message = {
            sender: this.props.loginUser.uid,
            receiver: target,
            content: textMsg,
            timestamp: (now.getTime() / 1000)
        };
        message.contentObj = obj;
        if (this.im.connectState == IMService.STATE_CONNECTED) {
            this.imDB.saveMessage(target, message, () => {
                conversationDB.setLatestMessage(target, message);
                this.props.dispatch({type:"set_latest_message", 
                                     message:message, 
                                     conversation:this.props.conversation});
                this.props.dispatch({type:"add_message", message:message});
                scrollDown();
                this.im.sendPeerMessage(message);

                $("#entry").val("");
                $("#chatHistory").show();
            });
        }
    },




    onKeyPress:function(e) {
        if (e.key != 'Enter') return;

        var target = this.props.conversation.cid;
        //var target = parseInt($("#to_user").attr("data-uid"));
        var msg = $("#entry").val().replace("\n", "");
        if (!util.isBlank(msg)) {
            this.sendTextMessage(msg, target);
        }
        return false;
    },

    onExit: function() {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("expires");
        localStorage.removeItem("uid");
        localStorage.removeItem("sid");
        localStorage.clear();
        location.reload();
    },
    
    //截屏
    onClipboard:function() {
        var target = parseInt($("#to_user").attr("data-uid"));
        this.startCapture(target);
    },

    render: function() {
        var name = "";
        if (this.props.conversation.cid) {
            name = helper.getPhone(this.props.conversation.cid);
        }

        var loginUser = this.props.loginUser;
        var username = "";
        if (loginUser.uid) {
            username = (loginUser.name || helper.getPhone(loginUser.uid));
        }

        return (
            <div className="app">
                <div className="pane pane-list">
                    <div className="profile pane-header pane-list-header">
                        <img src="images/_avatar.png" className="avatar" alt=""/>
                        <span className="name" id="name">{username}</span>
                        <a className="exit" onClick={this.onExit} href="#" id="exit">退出</a>
                    </div>
                    <div className="contact-list">
                        <ConversationList imDB={this.imDB}/>
                    </div>
                </div>
                <div className="main pane pane-chat" id="main">
                    <div className={"intro" + (this.props.conversation.cid ? " hide" : "")} id="intro">
                        请选择联系人
                    </div>
                    <div className="pane-header pane-chat-header">
                        <img src="images/_avatar.png" id="to_user_avatar" className="avatar" alt=""/>
                        <div className="name" id="to_user">{name}</div>
                    </div>
                    <ChatHistory/>
                    <div className="chat-form pane-chat-footer">
                        <div className="shortcut-wrap">
                            <a href="#" id="clipboard" onClick={this.onClipboard}className="clipboard"></a>
                        </div>
                        <textarea onKeyPress={this.onKeyPress} id="entry" className="chat-input"></textarea>
                    </div>
                </div>
            </div>

        );
    }
});


AppContent = connect(function(state){
    return state;
}, null, null, {withRef:true})(AppContent);

module.exports = AppContent;
