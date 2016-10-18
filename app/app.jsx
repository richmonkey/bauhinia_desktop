var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('redux');
var createStore = redux.createStore;
var combineReducers = redux.combineReducers;
var redux = require('react-redux')
var Provider = redux.Provider;
var connect = redux.connect;



var remote = require('remote');
var app = remote.require('app');
var ipc = require('ipc');
var path = require('path');

var AppContent = require("./AppContent.js");
var appReducer = require("./reducer");


//var URL = "http://dev.gobelieve.io";
//var API_URL = "http://192.168.33.10";

var URL = "http://gobelieve.io";
var API_URL = "http://api.gobelieve.io";
var QRCODE_EXPIRE = 3*60*1000;


var sid = "";
var accessToken;

var im = null;

var startup = new Date();
var player = null;

var appComponent = null;


function bindAppContent(c) {
    console.log("bind app content:" + c);
    appComponent = c.getWrappedInstance();
}

var initState = {
    conversations:[],
    contacts:[],
    //当前会话
    conversation:{},
    messages:[],
    loginUser:{}
};
var store = createStore(appReducer, initState);

ReactDOM.render(
    <Provider store={store}>
        <AppContent id="app" ref={bindAppContent}/>
    </Provider>,
    document.getElementById('chat')
);


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
                    qrcodeLogin(success, error);
                }
            } else {
                error();
            }
        }
    });
}


function refreshQRCode(success) {
    var url = URL + "/qrcode/session";
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


function initLogin(token, expires, uid) {
    var now = Math.floor(Date.now() / 1000);
    accessToken = token;
    var t = (expires - now) * 1000;
    setTimeout(function () {
        //todo 提示用户会话过期
        localStorage.removeItem("accessToken");
        localStorage.removeItem("expires");
        localStorage.removeItem("uid");
        localStorage.removeItem("sid");
        location.reload();
    }, t);

    showChat();

    console.log("app:" + appComponent);
    appComponent.loadData(uid, token);
}

function onLoginSuccess(result) {
    console.log("login success user id:", result.uid,
                " access token:", result.access_token,
                " status code:", status);
    var now = Math.floor(Date.now() / 1000);
    localStorage.accessToken = result.access_token;
    localStorage.uid = result.uid;
    localStorage.expires = now + result.expires_in;
    localStorage.sid = result.sid;
    initLogin(localStorage.accessToken, localStorage.expires, localStorage.uid);
}


$(document).ready(function () {
    player = document.getElementById("player");

    console.log("access token:" + localStorage.accessToken);
    console.log("token expires:" + localStorage.expires);
    console.log("uid:" + localStorage.uid)
    var now = Math.floor(Date.now() / 1000);

    if (localStorage.accessToken &&
        localStorage.uid &&
        localStorage.sid &&
        now < localStorage.expires) {
        sid = localStorage.sid
        console.log("sid:" + sid);
        qrcodeLogin(onLoginSuccess,
                    function () {
                        showLogin();
                        refreshQRCode(function (result) {
                            sid = result.sid;
                            var s = URL + "/qrcode/" + sid;
                            $("#qrcode").attr('src', s);
                            console.log("sid:" + sid);
                            qrcodeLogin(onLoginSuccess,
                                        function () {
                                            //二维码过期
                                            console.log("qrcode expires");
                                            $('.qrcode-timeout').removeClass('hide');
                                        });
                        });
                    });
    } else {
        showLogin();
        refreshQRCode(function (result) {
            sid = result.sid;
            var s = URL + "/qrcode/" + sid;
            $("#qrcode").attr('src', s);
            console.log("sid:" + sid);
            qrcodeLogin(onLoginSuccess,
                        function () {
                            //二维码过期
                            console.log("qrcode expires");
                            $('.qrcode-timeout').removeClass('hide');
                        });
        });

    }
});
