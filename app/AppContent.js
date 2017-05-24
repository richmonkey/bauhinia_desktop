var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('redux');
var createStore = redux.createStore;
var combineReducers = redux.combineReducers;
var redux = require('react-redux')
var Provider = redux.Provider;
var connect = redux.connect;

var InputBar = require('./InputBar.js');
var ConversationList = require('./ConversationList.js');
var ContactList = require('./ContactList.js');
var ChatHistory = require("./ChatHistory.js");

var PeerMessageDB = require('./PeerMessageDB.js');
var GroupMessageDB = require('./GroupMessageDB.js');
var ConversationDB = require('./ConversationDB.js');


var remote = require('electron').remote;
var ipc = require('electron').ipcRenderer;
const {clipboard} = require('electron')
var path = remote.require('path');
var app = require('electron').remote.app;


import {URL, API_URL} from './config.js';
var QRCODE_EXPIRE = 3*60*1000;
var CONVERSATION_PEER = "peer";
var CONVERSATION_GROUP = "group";

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
                for (var i in data) {
                    var contact = data[i];
                    userDB.addUser(contact);
                }

                var conversations = this.props.conversations;
                var newConvs = conversations.map((c) => {
                    if (c.type == CONVERSATION_PEER) {
                        var t = data.find((contact)=> {
                            return (contact.uid == c.peer);
                        });
                        if (t) {
                            c.name = t.name;
                            c.avatar = t.avatar;
                        }
                    }
                    return c;
                });
                console.log("set conversations 222...");                
                this.props.dispatch({type:"set_conversations", conversations:newConvs});
                this.setState({contacts:data});
            }.bind(this),
            error: function(xhr, status, err) {
                console.error("/users", status, err.toString());
            }.bind(this)
        });
    },

    getGroup: function(groupID) {
        var token = this.props.loginUser.token;
        var p = new Promise(function(resolve, reject) {
            //获取群组名称
            $.ajax({
                url: API_URL + "/groups/" + groupID,
                dataType: 'json',
                headers: {"Authorization": "Bearer " + token},
                success: function(result, status, xhr) {
                    var data = result.data;
                    console.log("group:", data.name, data.id, data.super);
                    resolve(data);
                },
                error: function(xhr, status, err) {
                    console.error("error:", status, err.toString());
                    reject(status);
                }
            });
        });
        return p;
    },
    
    loadData: function() {
        var self = this;
        var uid = this.props.loginUser.uid;
        var token = this.props.loginUser.token;
        var filename = path.join(app.getPath("userData"), "peer_messages_" + uid + ".db");
        console.log("peer message db file name:" + filename);
        this.imDB = new PeerMessageDB(filename);

        filename = path.join(app.getPath("userData"), "group_messages_" + uid + ".db");
        console.log("group message db file name:" + filename);
        this.groupDB = new GroupMessageDB(filename);

        filename = path.join(app.getPath("userData"), "conversations_" + uid + ".db");
        console.log("conversation db file name:" + filename);
        this.conversationDB = new ConversationDB(filename);

        this.im.accessToken = token;
        this.im.start();

        this.conversationDB.getConversationList((err, convs) => {
            if (err) {
                return;
            }
            var convs = convs.map(function(c) {
                if (c.type == CONVERSATION_PEER) {
                    var u = userDB.findUser(c.peer);
                    if (u) {
                        c.name = u.name;
                        c.avatar = u.avatar;
                    } else {
                        c.name = helper.getPhone(c.peer);
                        c.avatar = "";
                    }
                } else if (c.type == CONVERSATION_GROUP) {
                    self.getGroup(c.groupID)
                        .then((group) => {
                            self.props.dispatch({type:"set_conversation_name", name:group.name, avatar:"", cid:c.cid});
                        });
                }
                return c;
            });
            console.log("set conversations 111...");
            this.props.dispatch({type:"set_conversations", conversations:convs});
        });
    

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
        var u = userDB.findUser(msg.sender);
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


    uploadImage: function(data) {
        var url = API_URL + "/images";
        var image = decodeBase64Image(data);
        var imageData = image.data;
        var imageType = image.type;
        var headers = {
            "Authorization": "Bearer " + this.props.loginUser.token,
            "Content-Type": imageType
        };

        var p = new Promise(function(resolve, reject) {
            $.ajax({
                url: url,
                method: "POST",
                headers: headers,
                data:imageData,
                processData:false,
                success: function (result, status, xhr) {
                    if (status == "success") {
                        console.log("url:" + result + result.src_url);
                        resolve(result.src_url);
                    } else {
                        reject(status);
                    }
                },
                error: function (xhr, err) {
                    console.log("upload image error:", err, xhr.status, xhr);
                    reject(xhr.status);
                }
            });
            
        });

        return p;
    },

    sendTextMessage:function(text) {
        var now = new Date();
        var obj = {"text": text};
        var textMsg = JSON.stringify(obj);
        var message;
        
        if (this.props.conversation.type == CONVERSATION_PEER) {
            var peer = this.props.conversation.peer;
            message = {
                peer: this.props.conversation.peer,
                sender: this.props.loginUser.uid,
                receiver: this.props.conversation.peer,
                content: textMsg,
                timestamp: (now.getTime() / 1000),
                contentObj: obj,
            };
            
            if (this.im.connectState == IMService.STATE_CONNECTED) {
                this.imDB.saveMessage(message, () => {
                    this.conversationDB.setLatestMessage(this.props.conversation.cid, message);
                    this.props.dispatch({type:"set_latest_message",
                                         message:message,
                                         conversation:this.props.conversation});
                    this.im.sendPeerMessage(message);
                    
                    if (this.chat) {
                        this.chat.getWrappedInstance().addMessage(message);
                    }
                    
                    $("#entry").val("");
                });
            }
        } else if (this.props.conversation.type == CONVERSATION_GROUP) {
            message = {
                groupID: this.props.conversation.groupID,
                sender: this.props.loginUser.uid,
                receiver: this.props.conversation.groupID,
                content: textMsg,
                timestamp: (now.getTime() / 1000),
                contentObj: obj,
            };

            var groupID = this.props.conversation.groupID;
            if (this.im.connectState == IMService.STATE_CONNECTED) {
                this.groupDB.saveMessage(message, () => {
                    this.conversationDB.setLatestMessage(this.props.conversation.cid, message);
                    this.props.dispatch({type:"set_latest_message",
                                         message:message,
                                         conversation:this.props.conversation});
                    this.im.sendGroupMessage(message);                    
                    if (this.chat) {
                        this.chat.getWrappedInstance().addMessage(message);
                    }
                    $("#entry").val("");
                });
            }
        }
    },

    sendImageMessage: function(b64) {
        var now = new Date();
        var obj = {"image": b64};

        if (this.props.conversation.type == CONVERSATION_PEER) {
            var msg = {
                peer: this.props.conversation.peer,
                sender: this.props.loginUser.uid,
                receiver: this.props.conversation.peer,
                content: JSON.stringify(obj),
                timestamp: (now.getTime() / 1000)
            };
            msg.contentObj = obj;
            this.imDB.saveMessage(msg, () => {
                this.conversationDB.setLatestMessage(this.props.conversation.cid, msg);
                this.props.dispatch({type:"set_latest_message",
                                     message:msg,
                                     conversation:this.props.conversation});
                if (this.chat) {
                    this.chat.getWrappedInstance().addMessage(msg);
                }
                
                this.uploadImage(b64)
                    .then((url) => {
                        var obj = {"image": url};
                        msg.content = JSON.stringify(obj);
                        msg.contentObj = obj;
                        if (this.im.connectState == IMService.STATE_CONNECTED) {
                            this.im.sendPeerMessage(msg);
                        }
                    })
                    .catch(function () {
                        console.log('error');
                    });
            });

        } else if (this.props.conversation.type == CONVERSATION_GROUP) {
            var msg = {
                groupID: this.props.conversation.groupID,
                sender: this.props.loginUser.uid,
                receiver: this.props.conversation.groupID,
                content: JSON.stringify(obj),
                timestamp: (now.getTime() / 1000)
            };
            msg.contentObj = obj;
            
            this.groupDB.saveMessage(msg, () => {
                this.conversationDB.setLatestMessage(this.props.conversation.cid, msg);
                this.props.dispatch({type:"set_latest_message",
                                     message:msg,
                                     conversation:this.props.conversation});

                if (this.chat) {
                    this.chat.getWrappedInstance().addMessage(msg);
                }
                
                this.uploadImage(b64)
                    .then((url) => {
                        var obj = {"image": url};
                        msg.content = JSON.stringify(obj);
                        msg.contentObj = obj;
                        if (this.im.connectState == IMService.STATE_CONNECTED) {
                            this.im.sendGroupMessage(msg);
                        }
                    })
                    .catch(function () {
                        console.log('error');
                    });
            });            
        }
    },
    
    startCapture: function(target) {
        var oldImage = clipboard.readImage();
        var oldB64;
        if (oldImage) {
            oldB64 = oldImage.toDataURL();
        }

        console.log("old image:", oldB64);
        var self = this;
        capture.captureScreen()
               .then((code) => {
                   console.log("resolve code:" + code);
                   if (code != 0) {
                       return;
                   }
                   var temp = clipboard.readImage();
                   if (temp) {
                       var b64 = temp.toDataURL();
                       self.setState({
                           showPreview:true,
                           preview:b64,
                       })
                       console.log("image:", b64);
                       if (b64 != oldB64) {
                           //this.sendImageMessage(b64);
                       }
                   }
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


        if (msg.sender != this.props.loginUser.uid) {
            if (player.paused) {
                console.log("play.....");
                player.play();
            } else {
                console.log("player is playing...");
            }
            msg.peer = msg.sender;
        } else {
            //收到自己在其他端发出去的消息
            msg.ack = true;
            msg.peer = msg.receiver;
        }

        var cid = "peer_" + msg.peer;

        this.imDB.saveMessage(msg, () =>  {
            this.conversationDB.setLatestMessage(cid, msg);

            if (this.props.conversation.cid == cid) {
                if (this.chat) {
                    this.chat.getWrappedInstance().addMessage(msg);
                }
            }

            var index = -1;
            for (var i = 0; i < this.props.conversations.length; i++) {
                if (this.props.conversations[i].cid == cid) {
                    index = i;
                    break;
                }
            }

            var conv = null;
            if (index == -1) {
                var name = helper.getPhone(msg.peer);
                conv = {
                    type:CONVERSATION_PEER,
                    peer:msg.peer,
                    cid:cid,
                    message:msg,
                    unread:0,
                    name:name,
                };

                this.conversationDB.addConversation(conv);
                this.props.dispatch({type:"add_conversation", conversation:conv});
            } else {
                conv = this.props.conversations[i];
            }

            this.conversationDB.setLatestMessage(cid, msg);
            this.props.dispatch({type:"set_latest_message",
                                 message:msg,
                                 conversation:conv});
            
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
                    this.conversationDB.setNewCount(cid, unread);

                    var total = 0;
                    for (var i = 0; i < this.props.conversations.length; i++) {
                        total = total + this.props.conversations[i].unread;
                    }
                    setDockBadge(total);
                }
            }
        });
    },

    handleMessageACK: function (msg) {
        var msgLocalID = msg.msgLocalID;
        var uid = msg.receiver;
        var cid = "peer_" + uid;
        this.imDB.ackMessage(msgLocalID);
        if (this.props.conversation.cid == cid) {
            if (this.chat) {
                this.chat.getWrappedInstance().ackMessage(msgLocalID);
            }
        }
        console.log("message ack local id:", msgLocalID, " uid:", uid);
    },
    
    handleMessageFailure: function (msg) {
        var msgLocalID = msg.msgLocalID;
        var uid = msg.receiver;        
        console.log("message fail local id:", msgLocalID, " uid:", uid);
    },

    handleGroupMessage: function (msg) {
        console.log("group msg sender:", msg.sender, " receiver:", msg.receiver, " content:", msg.content, " timestamp:", msg.timestamp);
        var groupID = msg.receiver;
        var cid = "group_" + groupID;
        
        var index = this.props.conversations.findIndex((c) => {
            return (c.cid == cid);
        });

        if (index == -1) {
            var accessToken = this.props.loginUser.token;

            this.getGroup(groupID)
                .then((group) => {
                    this.props.dispatch({type:"set_conversation_name",
                                         name:group.name,
                                         cid:cid});
                });
        }
        
        try {
            msg.contentObj = JSON.parse(msg.content)
        } catch (e) {
            console.log("json parse exception:", e);
            return
        }

        if (msg.sender != this.props.loginUser.uid) {
            if (player.paused) {
                player.play();
            }
            msg.outgoing = false;
        } else {
            //收到自己在其他端发出去的消息
            msg.ack = true;
            msg.outgoing = true;
        }
        
        
        this.groupDB.saveMessage(msg, () =>  {
            this.conversationDB.setLatestMessage(cid, msg);

            if (this.props.conversation.cid == cid) {
                if (this.chat) {
                    this.chat.getWrappedInstance().addMessage(msg);
                }                
            }

            var index = -1;
            for (var i = 0; i < this.props.conversations.length; i++) {
                if (this.props.conversations[i].cid == cid) {
                    index = i;
                    break;
                }
            }

            var conv = null;
            if (index == -1) {
                var name = ""+groupID;
                conv = {
                    groupID:groupID,
                    type:CONVERSATION_GROUP,
                    cid:cid,
                    message:msg,
                    unread:0,
                    name:name
                };

                this.conversationDB.addConversation(conv);
                this.props.dispatch({type:"add_conversation", conversation:conv});
            } else {
                conv = this.props.conversations[i];
            }

            this.conversationDB.setLatestMessage(cid, msg);            
            this.props.dispatch({type:"set_latest_message",
                                 message:msg,
                                 conversation:conv});
            
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
                    this.conversationDB.setNewCount(cid, unread);

                    var total = 0;
                    for (var i = 0; i < this.props.conversations.length; i++) {
                        total = total + this.props.conversations[i].unread;
                    }
                    setDockBadge(total);
                }
            }
        });        
    },

    handleGroupMessageACK: function (msg) {
        var msgLocalID = msg.msgLocalID;
        var groupID = msg.receiver;
        var cid = "group_" + groupID;
        
        this.groupDB.ackMessage(msgLocalID);
        if (this.props.conversation.cid == cid) {
            if (this.chat) {
                this.chat.getWrappedInstance().ackMessage(msgLocalID);
            }
        }
        console.log("message ack local id:", msgLocalID, " groupID:", groupID);
    },
    
    handleGroupMessageFailure: function (msg) {
        var msgLocalID = msg.msgLocalID;
        var uid = msg.receiver;        
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
        this.im = new IMService();
        this.im.observer = this;
        return {
            showContact:false,
            showConversation:true,
            showPreview:false,
            preview:"",
            contacts:[],
            contact:{},
        };
    },

    componentWillMount: function() {
        this.loadData();
    },

    componentDidMount: function() {

    },

    componentWillUnmount: function() {
    },

    onExit: function() {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("expires");
        localStorage.removeItem("uid");
        localStorage.removeItem("sid");
        location.reload();
    },

    onContactItemClick(uid) {
        var users = this.state.contacts;

        var u = users.find((item) => {
            return (item.uid == uid);
        });

        if (!u) {
            return;
        }
        
        users.forEach((item)=> {
            item.active = false;
        });
        u.active = true;
        this.setState({contact:u});
    },
    
    onConversationClick(conv) {
        this.props.dispatch({type:"set_conversation", conversation:conv});
        this.props.dispatch({type:"set_unread", unread:0, cid:conv.cid});
        this.conversationDB.setNewCount(conv.cid, 0);
        var total = 0;
        for (var i = 0; i < this.props.conversations.length; i++) {
            total = total + this.props.conversations[i].unread;
        }

        setDockBadge(total);
    },
    
    onSendMessage:function() {
        console.log("on send message");
        var uid = this.state.contact.uid;
        var cid = "peer_" + uid;
            
        var index = -1;
        for (var i = 0; i < this.props.conversations.length; i++) {
            var conv = this.props.conversations[i];
            if (conv.cid == cid) {
                index = i;
                break;
            }
        }
        var conv;
        if (index == -1) {
            conv = {
                type:CONVERSATION_PEER,
                peer:this.state.contact.uid,
                cid:"peer_" + this.state.contact.uid,
                name:this.state.contact.name,
                avatar:this.state.contact.avatar,
                unread:0,
            };

            this.conversationDB.addConversation(conv);
            this.props.dispatch({type:"add_conversation", conversation:conv});
        } else {
            conv = this.props.conversations[i];
        }

        this.props.dispatch({type:"set_conversation", conversation:conv});
        this.props.dispatch({type:"set_unread", unread:0, cid:conv.cid});
        this.conversationDB.setNewCount(conv.cid, 0);
        var total = 0;
        for (var i = 0; i < this.props.conversations.length; i++) {
            total = total + this.props.conversations[i].unread;
        }

        setDockBadge(total);

        this.setState({
            showConversation:true,
            showContact:false
        });
    },
    
    //截屏
    onClipboard:function() {
        this.startCapture();
    },

    onContactClick: function() {
        console.log("show contact");
        this.setState({showContact:true, showConversation:false});
    },

    onMessageClick: function() {
        this.setState({showContact:false, showConversation:true});
    },

    onFileChange: function(e) {
        var file = document.getElementById('file');
        console.log("file:", file.value);
    },

    onImageChange: function() {
        var file = document.getElementById('image');
        var f = file.files[0];
        console.log("file:", f.preview, f.type);
        console.log("file:", file.value, file.files[0].preview, file.type, file.preview);
        this.setState({
            showPreview:true,
            preview:"",
        });

        var self = this;
        
        var reader = new FileReader();
        reader.onload = function (e) {
            var src = e.target.result;
            
            var maxWidth = 1024;
            var maxHeight = 1024;
            var img = new Image();
            img.onload = function () {
                var canvas = document.createElement('canvas');
                if (img.height > maxHeight) {
                    img.width = maxHeight / img.height * img.width;
                    img.height = maxHeight;
                }
                var ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                var preview = canvas.toDataURL('image/jpeg');
                self.setState({preview:preview});
            };
            img.src = src;
        };
        reader.readAsDataURL(f);

        file.value = "";
    },
    

    renderMessage: function() {
        var name = this.props.conversation.name;
        var avatar = this.props.conversation.avatar;

        if (!avatar) {
            var conv = this.props.conversation;
            if (conv.type == "peer") {
                avatar = "images/_avatar.png";
            } else if (conv.type == "group") {
                avatar = "images/avatar_group.png";
            }
        }
        
        return (
            <div className="main pane pane-chat" id="main">
                
                <div className={"intro" + (this.props.conversation.cid ? " hide" : "")} id="intro">
                    请选择联系人
                </div>
                
                <div className="pane-header pane-chat-header">
                    <img src={avatar} id="to_user_avatar" className="avatar" alt=""/>
                    <div className="name" id="to_user">{name}</div>
                </div>
                <ChatHistory ref={(chat) => { this.chat = chat; }}
                             imDB={this.imDB}
                             groupDB={this.groupDB}/>

                <InputBar
                    ref={(input) => { this.inputBar = input; }}
                    onImageChange={this.onImageChange}
                    onClipboard={this.onClipboard}
                    onFileChange={this.onFileChange}
                    sendTextMessage={this.sendTextMessage} />
            </div>
        );
    },

    renderContact: function() {
        var avatar = this.state.contact.avatar;
        if (!avatar) {
            avatar = "images/_avatar.png";
        }
        
        return (
            <div className="main pane pane-chat" id="main">
                
                <div className={"intro" + (this.state.contact.uid ? " hide" : "")} id="intro">
                    请选择联系人
                </div>

                <div className="contact">
                    <div className="header">
                        <span>{this.state.contact.name}</span>
                        <img src={avatar} className="avatar"/>
                    </div>
                    <div className="line">
                    </div>
                    <button className="" onClick={this.onSendMessage}>发消息</button>
                </div>
            </div>
        );
    },

    renderBar: function() {
        var c1 = this.state.showConversation ? "LeftNav-item iconfont-single cur" : "LeftNav-item iconfont-single";
        var c2 = this.state.showContact ? "LeftNav-item iconfont-group cur": "LeftNav-item iconfont-group";
        return (
            <div className="toolbar">
                <div className="LeftNav">
                    <div className={c1}
                         onClick={this.onMessageClick}>
                        <div className="singleChat">
                            <a>single chat</a>
                        </div>
                    </div>
                    <div className={c2}
                         onClick={this.onContactClick}>
                        <div className="groupChat">
                            <a>group chat</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    },


    onCancel: function() {
        this.setState({
            showPreview:false,
            preview:"",
        });
    },

    onSend: function() {
        var b64 = this.state.preview;
        if (b64) {
            this.sendImageMessage(b64);
        }
        this.setState({
            showPreview:false,
            preview:"",
        });
    },
    
    renderPreview: function() {
        var loading = !this.state.preview;
        var display = loading ? "inline-block" : "none";
        return (
            <div>
                <div className="previewPicLayer"></div>
                <div className="previewPic" tabIndex="1">
                    <span className="closeBtn"
                          onClick={this.onCancel}></span>
                    <h2>发送图片</h2>
                    <div className="picWrap">
                        <img className="picContent" src={this.state.preview} alt=""/>
                    </div>
                    <div className="picFooter">
                        <button type="button"
                                className="btn"
                                onClick={this.onCancel}>
                            取消
                        </button>
                        <button type="button"
                                className="btn cur"
                                onClick={this.onSend}>
                            发送
                        </button>
                    </div>
                </div>
                <div className="load-container" style={{display:display}}>
                    <div className="loader">Loading...</div>
                </div>
            </div>
        );
    },
    
    onDocumentClick: function() {
        if (this.inputBar) {
            this.inputBar.hideEmoji();
        }
    },
    
    render: function() {
        var loginUser = this.props.loginUser;
        var username = "";
        if (loginUser.uid) {
            username = (loginUser.name || helper.getPhone(loginUser.uid));
        }

        
        return (
            <div onClick={this.onDocumentClick}
                 className="app">
                {this.renderBar()}
                <div className="pane pane-list">
                    <div className="profile pane-header pane-list-header">
                        <img src="images/_avatar.png" className="avatar" alt=""/>
                        <span className="name" id="name">{username}</span>
                        <a className="exit" onClick={this.onExit} href="#" id="exit">退出</a>
                    </div>
                    

                    {this.state.showConversation ?
                     <ConversationList
                         onConversationClick={this.onConversationClick}
                         imDB={this.imDB}
                         groupDB={this.groupDB}/> : null}
                    {this.state.showContact ?
                     <ContactList contacts={this.state.contacts}
                                  onContactClick={this.onContactItemClick} /> : null}

                </div>

                {this.state.showConversation ? this.renderMessage() : null}
                {this.state.showContact ? this.renderContact(): null}
                {this.state.showPreview ? this.renderPreview(): null}
            </div>
        );
    }
});


AppContent = connect(function(state){
    return state;
}, null, null, {withRef:true})(AppContent);

module.exports = AppContent;
