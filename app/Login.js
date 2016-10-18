var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('react-redux')
var Provider = redux.Provider;
var connect = redux.connect;


var URL = "http://gobelieve.io";
var API_URL = "http://api.gobelieve.io";
var QRCODE_EXPIRE = 3*60*1000;


var Login = React.createClass({
    getInitialState: function() {
        return {timeout:false};
    },

    onLoginSuccess: function(result) {
        console.log("login success user id:", result.uid,
                    " access token:", result.access_token,
                    " status code:", status);

        var now = Math.floor(Date.now() / 1000);
        localStorage.accessToken = result.access_token;
        localStorage.uid = result.uid;
        localStorage.expires = now + result.expires_in;
        localStorage.sid = result.sid;

        var t = (localStorage.expires - now) * 1000;
        setTimeout(function () {
            //todo 提示用户会话过期
            localStorage.removeItem("accessToken");
            localStorage.removeItem("expires");
            localStorage.removeItem("uid");
            localStorage.removeItem("sid");
            location.reload();
        }, t);

        var loginUser = {uid:result.uid, token:result.access_token, sid:result.sid, expires:now + result.expires_in};
        this.props.dispatch({type:"set_login_user", loginUser:loginUser});
    },

    qrcodeLogin: function(sid, success, error) {
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
                        this.qrcodeLogin(sid, success, error);
                    }
                } else {
                    error();
                }
            }
        });
    },
    
    refreshQRCode: function() {
        var success = (result) => {
            var sid = result.sid;
            console.log("sid:" + sid);

            var s = URL + "/qrcode/" + sid;
            this.props.dispatch({type:"set_qrcode_url", url:s});
            this.qrcodeLogin(sid, this.onLoginSuccess,
                         () => {
                            //二维码过期
                            console.log("qrcode expires");
                            this.props.dispatch({type:"set_qrcode_timeout", 
                                                 timeout:true});
                        });
        }

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
    },
    
    componentDidMount: function() {
        console.log("access token:" + localStorage.accessToken);
        console.log("token expires:" + localStorage.expires);
        console.log("uid:" + localStorage.uid)
        var now = Math.floor(Date.now() / 1000);
        if (localStorage.accessToken &&
            localStorage.uid &&
            localStorage.sid &&
            now < localStorage.expires) {
            var sid = localStorage.sid
            console.log("sid:" + sid);
            var s = URL + "/qrcode/" + sid;
            this.props.dispatch({type:"set_qrcode_url", url:s});
            this.qrcodeLogin(sid, this.onLoginSuccess,
                         () => {
                            this.refreshQRCode();
                        });
        } else {
            this.refreshQRCode();
        }
    },

    onReload:function() {
        location.reload();
    },

    render: function() {
        return (
            <div id="loginView" className="app-wrap full-wrap">
                <h1>羊蹄甲</h1>

                <div className="img">
                    <div className={"qrcode-timeout" + (this.props.qrcode.timeout ? "" : " hide")} onClick={this.onReload} id="reload">
                        <div className="circle">
                            <div className="icon-reset"></div>
                            <div className="reload">二维码超时，点击刷新</div>
                        </div>
                    </div>
                    <img id="qrcode" src={this.props.qrcode.url}/>

                    <p className="desc">请使用羊蹄甲扫描二维码以登录</p>

                </div>
            </div>
        );
    }
});


Login = connect((state)=>{
    return state;
})(Login);

module.exports = Login;
