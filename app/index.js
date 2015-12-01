var capture = require("mac-screen-capture")
var clipboard = require("clipboard")

var accessToken;
var loginUser = {};

//当前会话的uid
var peer = 0;
var msgLocalID = 1;

var im;
var imDB = new IMDB();
var QRCODE_EXPIRE = 3 * 60 * 1000;
var startup = new Date();

im = new IMService(observer);

var helper = {
    toTime: function (ts) {
        //时间戳取时间
        var d = ts ? new Date(ts) : new Date();
        var H = d.getHours();
        var m = d.getMinutes();
        return H + ':' + (m < 10 ? '0' + m : m);
    },
    getUserName: function (user) {
        if (user.name) {
            return user.name;
        } else {
            var uid = user.uid.toString(),
                i = uid.indexOf("0");
            return uid.substr(i + 1)
        }
    },
    getUserAvatar: function (user) {
        if (user.avatar) {
            var parser = document.createElement('a');
            parser.href = user.avatar;
            return parser.pathname;
        } else {
            return '';
        }
    },
    getPhone: function (phone) {
        if (phone) {
            return (phone + '').split('860')[1];
        } else {
            return ''
        }
    },
};
var htmlLoyout = {
    buildUser: function (user) {
        var html = [];

        html.push('<li data-uid="' + user.uid + '">');
        if (user.avatar) {
            html.push('    <img src="' + helper.getUserAvatar(user) + '" class="avatar" alt=""/>');
        } else {
            html.push('    <img src="images/_avatar.png" class="avatar" alt=""/>');
        }
        if (helper.getUserName(user)) {
            html.push('    <span class="name">' + helper.getUserName(user) + '</span>');
        }else{
            html.push('    <span class="uid">' + helper.getPhone(user.uid) + '</span>');
        }
        html.push('    <span class="num">' + (user.num || '') + '</span>');
        html.push('</li>');
        return html.join('');
    },
    buildText: function (msg) {
        var html = [];
        html.push('<li class="chat-item" data-id="' + msg.id + '">');
        html.push('    <div class="message ' + msg.cls + '">');
        html.push('        <div class="bubble"><p class="pre">' + msg.text + '</p>');
        html.push('           <span class="time">' + helper.toTime(msg.timestamp * 1000) + '</span>');

        if (msg.ack) {
            html.push('   <span class="ack"></span>');
        }
        if (msg.received) {
            html.push('   <span class="rack"></span>');
        }

        html.push('        </div>');
        html.push('    </div>');
        html.push('</li>');
        return html.join('');
    },
    buildImage: function (msg) {
        var html = [];
        html.push('<li class="chat-item"  data-id="' + msg.id + '">');
        html.push('    <div class="message ' + msg.cls + '">');
        html.push('        <div class="bubble"><p class="pre"><a href="' + msg.image + '" target="_blank">' +
            '<img class="image-thumb-body" src="' + msg.image + '" /></p></a>');
        html.push('           <span class="time">' + helper.toTime(msg.timestamp * 1000) + '</span>');

        if (msg.ack) {
            html.push('   <span class="ack"></span>');
        }
        if (msg.received) {
            html.push('   <span class="rack"></span>');
        }

        html.push('        </div>');
        html.push('    </div>');
        html.push('</li>');
        return html.join('');
    },
    buildAudio: function (msg) {
        var html = [];
        html.push('<li class="chat-item"  data-id="' + msg.id + '">');
        var audio_url = msg.audio.url + ".mp3";
        html.push('<li class="chat-item">');
        html.push('  <div class="message ' + msg.cls + '">');
        html.push('     <div class="bubble">');
        html.push('       <p class="pre"><audio  controls="controls" src="' + audio_url + '"></audio></p>');
        html.push('       <span class="time">' + helper.toTime(msg.timestamp * 1000) + '</span>');

        if (msg.ack) {
            html.push('   <span class="ack"></span>');
        }
        if (msg.received) {
            html.push('   <span class="rack"></span>');
        }

        html.push('     </div>');
        html.push('  </div>');
        html.push('</li>');
        return html.join('');
    },
    buildACK: function () {
        return '<span class="ack"></span>';
    },
    buildRACK: function () {
        return '<span class="rack"></span>';
    }
};

var node = {
    chatHistory: $("#chatHistory ul"),
    usersList: $('#usersList'),
    exit: $('#exit')
};

var process = {
    playAudio: function () {

    },
    appendAudio: function (m) {
        node.chatHistory.append(htmlLoyout.buildAudio(m));
    },
    appendText: function (m) {
        node.chatHistory.append(htmlLoyout.buildText(m));
    },
    appendImage: function (m) {
        node.chatHistory.append(htmlLoyout.buildImage(m));
    },
    msgTip: function (uid) {
        var userDom = node.usersList.find('li[data-uid="' + uid + '"]'),
            num = '';
        if (userDom) {
            num = userDom.find('.num').text();
            if (!userDom.hasClass('active')) {
                if (num) {
                    num++;
                } else {
                    num = 1;
                }
                userDom.find('.num').text(num);
            }
            node.usersList.prepend(userDom);
        }
    },
    msgACK: function (msgID, uid) {
        node.chatHistory.find('li[data-id="' + msgID + '"] .bubble').append(htmlLoyout.buildACK());
    },
};

function scrollDown() {
    $('#chatHistory').scrollTop($('#chatHistory ul').outerHeight());
    $("#entry").text('').focus();
}

function appendMessage(msg) {
    var time = new Date();
    var m = {};
    m.id = msg.msgLocalID;
    if (msg.timestamp) {
        time.setTime(msg.timestamp * 1000);
        m.timestamp = msg.timestamp;
    }
    m.ack = msg.ack;
    m.received = msg.received;
    if (loginUser.uid == msg.sender) {
        m.cls = "message-out";
    } else {
        m.cls = "message-in";
    }
    if (msg.contentObj.text) {
        m.text = util.toStaticHTML(msg.contentObj.text);
        process.appendText(m);
    } else if (msg.contentObj.audio) {
        m.audio = msg.contentObj.audio;
        process.appendAudio(m);
    } else if (msg.contentObj.image) {
        m.image = msg.contentObj.image;
        process.appendImage(m);
    }
    console.log("message sender:", msg.sender, " receiver:", msg.receiver);
}

// add message on board
function addMessage(msg) {
    appendMessage(msg);
    scrollDown();
}

// show tip
function tip(type, name) {
    var tip, title;
    switch (type) {
        case 'online':
            tip = name + ' is online now.';
            title = 'Online Notify';
            break;
        case 'offline':
            tip = name + ' is offline now.';
            title = 'Offline Notify';
            break;
        case 'message':
            tip = name + ' is saying now.';
            title = 'Message Notify';
            break;
    }
    var pop = new Pop(title, tip);
}

function addUser(user) {
    node.usersList.prepend(htmlLoyout.buildUser(user));
}

function setName(username) {
    $("#name").text(username);
}

function showLogin() {
    $("#loginView").removeClass('hide').show();
    $("#chat").addClass('hide').hide();
}


function showChat() {
    $("#loginView").addClass('hide').hide();
    $("#chat").removeClass('hide').show();
    //$("entry").focus();
    scrollDown();
}

function initLogin(token, expires, uid) {
    var now = Math.floor(Date.now()/1000);
    loginUser.uid = uid;
    accessToken = token;
    var t = (expires - now)*1000;
    setTimeout(function() {
        //todo 提示用户会话过期
        localStorage.removeItem("accessToken");
        localStorage.removeItem("expires");
        localStorage.removeItem("uid");
        localStorage.removeItem("sid");
        location.reload();
    }, t);

    im.accessToken = accessToken;
    im.start();

    setName(loginUser.name || helper.getPhone(loginUser.uid));
    showChat();

    getContactList()
}

function onLoginSuccess(result) {
    console.log("login success user id:", result.uid,
        " access token:", result.access_token,
        " status code:", status);
    var now = Math.floor(Date.now()/1000);
    localStorage.accessToken = result.access_token;
    localStorage.uid = result.uid;
    localStorage.expires = now + result.expires_in;
    localStorage.sid = result.sid;
    initLogin(localStorage.accessToken, localStorage.expires, localStorage.uid);
}


function startCapture(target) {
    capture.captureScreen().then(
        function(code) {
            console.log("resolve code:" + code);
            if (code != 0) {
                return;
            }
            var temp = clipboard.readImage();
            var b64 = temp.toDataUrl();
            uploadImage(b64, 
                        function(url) {
                            sendImageMessage(url, target);
                        },
                        function() {
                        }
                       );
        }, function(code) {
            console.log("reject code:" + code);
        });
}


function sendImageMessage(url, target) {
    console.log("target:" + target);
    var now = new Date();
    var obj = {"image": url};
    var content = JSON.stringify(obj);
    var message = {
        sender: loginUser.uid,
        receiver: target,
        content: content,
        msgLocalID: msgLocalID++,
        timestamp: (now.getTime() / 1000)
    };
    message.contentObj = obj;
    if (im.connectState == IMService.STATE_CONNECTED) {
        imDB.saveMessage(target, message);
        im.sendPeerMessage(message);
        addMessage(message);
        $("#chatHistory").show();
    }
}
function sendTextMessage(text, target) {
    var now = new Date();
    var obj = {"text": text};
    var textMsg = JSON.stringify(obj);
    var message = {
        sender: loginUser.uid,
        receiver: target,
        content: textMsg,
        msgLocalID: msgLocalID++,
        timestamp: (now.getTime() / 1000)
    };
    message.contentObj = obj;
    if (im.connectState == IMService.STATE_CONNECTED) {
        imDB.saveMessage(target, message);
        im.sendPeerMessage(message);
        $("#entry").val(""); 
        addMessage(message);
        $("#chatHistory").show();
    }
}

$(document).ready(function () {
    $('#clipboard').on('click',function(){
        var target = parseInt($("#to_user").attr("data-uid"));
        startCapture(target);
    })

    node.exit.on('click', function () {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("expires");
        localStorage.removeItem("uid");
        localStorage.removeItem("sid");
        location.reload();
    });

    node.usersList.on('click', 'li', function () {
        var _this = $(this),
            uid = _this.attr('data-uid'),
            main = $('#main');

        if (peer == uid) {
            return;
        }
        $('#intro').hide();
        $('#to_user').attr('data-uid', uid);
        user = userDB.findUser(uid);
        if (user) {
            $('#to_user').text(helper.getUserName(user));
        } else {
            $('#to_user').text(helper.getPhone(uid));
        }
        if (user.avatar) {
            $('#to_user_avatar').attr("src", helper.getUserAvatar(user));
        } else {
            var defaultAvatar = "images/_avatar.png";
            $('#to_user_avatar').attr("src", defaultAvatar);
        }

        main.find('.chat-wrap').removeClass('hide');
        _this.addClass('active').siblings().removeClass('active');
        _this.find('.num').text('');
        node.chatHistory.html("");
        ///读取聊天记录添加到列表
        var messages = imDB.loadUserMessage(uid);
        for (var i in messages) {
            var msg = messages[i];
            console.log("message:", msg);
            appendMessage(msg)
        }
        //设置当前会话uid
        peer = uid;
    });

    //deal with chat mode.
    $("#entry").keypress(function (e) {
        if (e.keyCode != 13) return;
        var target = parseInt($("#to_user").attr("data-uid"));
        var msg = $("#entry").val().replace("\n", "");
        if (!util.isBlank(msg)) {
            sendTextMessage(msg);
        }
        return false;
    });

    console.log("access token:" + localStorage.accessToken);
    console.log("token expires:" + localStorage.expires);
    console.log("uid:" + localStorage.uid)
    var now = Math.floor(Date.now()/1000);

    if (localStorage.accessToken && 
        localStorage.uid && 
        localStorage.sid &&
        now < localStorage.expires) {
        sid = localStorage.sid
        console.log("sid:" + sid);
        qrcodeLogin(onLoginSuccess, 
                    function() {
                        showLogin();
                        refreshQRCode(function(result) {
                            sid = result.sid;
                            var s = URL + "/qrcode/" + sid;
                            
                            //$("#qrcode").src = s;
                            var n = document.getElementById("qrcode");
                            n.src = s;
                            console.log("sid:" + sid);
                            qrcodeLogin(onLoginSuccess, 
                                        function() {
                                            //二维码过期
                                            console.log("qrcode expires");
                                            $('.qrcode-timeout').removeClass('hide');
                                        });
                        });
                    });
    } else {
        showLogin();
        refreshQRCode(function(result) {
            sid = result.sid;
            var s = URL + "/qrcode/" + sid;
            
            //$("#qrcode").src = s;
            var n = document.getElementById("qrcode");
            n.src = s;
            console.log("sid:" + sid);
            qrcodeLogin(onLoginSuccess, 
                        function() {
                            //二维码过期
                            console.log("qrcode expires");
                            $('.qrcode-timeout').removeClass('hide');
                        });
        });

    }
});
