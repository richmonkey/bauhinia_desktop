var capture = require("mac-screen-capture")
var clipboard = require("clipboard")
var remote = require('remote');
var app = remote.require('app');
var ipc = require('ipc');


var sid = "";
var accessToken;

var loginUser = {};
var unreadCount = {};

//当前会话的uid
var peer = 0;

var im = new IMService(observer);
var imDB = new IMDB();
var startup = new Date();
var player = null;

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
            return user.avatar;
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

var node = {
    chatHistory: $("#chatHistory ul"),
    usersList: $('#usersList'),
    exit: $('#exit')
};

var process = {
    playAudio: function () {

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
        appComponent.chatHistory.ackMessage(msgID, uid);
    },
};

function scrollDown() {
    $('#chatHistory').scrollTop($('#chatHistory ul').outerHeight());
    $("#entry").text('').focus();
}

// add message on board
function addMessage(msg) {
    appComponent.chatHistory.addMessage(msg);
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

    console.log("app:" + appComponent);
    appComponent.loadData();
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
    player = document.getElementById("player");
    $('#clipboard').on('click',function(){
        var target = parseInt($("#to_user").attr("data-uid"));
        startCapture(target);
    })

    $('#reload').on("click", function () {
        location.reload();
    });

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

        ///读取聊天记录添加到列表
        var messages = imDB.loadUserMessage(uid);
        appComponent.chatHistory.setHistoryMessage(messages);
        scrollDown();

        //设置当前会话uid
        peer = uid;
        unreadCount[peer] = 0;

        setDockBadge();
    });

    //deal with chat mode.
    $("#entry").keypress(function (e) {
        if (e.keyCode != 13) return;
        var target = parseInt($("#to_user").attr("data-uid"));
        var msg = $("#entry").val().replace("\n", "");
        if (!util.isBlank(msg)) {
            sendTextMessage(msg, target);
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
                            $("#qrcode").attr('src', s);
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
            $("#qrcode").attr('src', s);
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
