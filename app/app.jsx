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
var Login = require("./Login.js");
var appReducer = require("./reducer");


//var URL = "http://dev.gobelieve.io";
//var API_URL = "http://192.168.33.10";

var URL = "http://gobelieve.io";
var API_URL = "http://api.gobelieve.io";
var QRCODE_EXPIRE = 3*60*1000;


var startup = new Date();
var player = null;


var Root = React.createClass({
    getInitialState: function() {
        return {};
    },
    render: function() {
        if (this.props.loginUser.uid) {
            return (<AppContent/>);
        } else {
            return (<Login />);
        }
    }
});

Root = connect((state)=>{
    return state;
})(Root);

var initState = {
    conversations:[],
    contacts:[],
    //当前会话
    conversation:{},
    messages:[],
    loginUser:{},
    qrcode:{timeout:false}
};
var store = createStore(appReducer, initState);

ReactDOM.render(
    <Provider store={store}>
        <Root/>
    </Provider>,
    document.getElementById('root')
);


$(document).ready(function () {
    player = document.getElementById("player");
});
