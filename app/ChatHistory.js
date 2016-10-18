var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('redux');
var createStore = redux.createStore;
var combineReducers = redux.combineReducers;
var redux = require('react-redux')
var Provider = redux.Provider;
var connect = redux.connect;


var htmlLayout = {
    buildText: function (msg) {
        return (
            <li className="chat-item" key={msg.msgLocalID} data-id={msg.id}>
                <div className={"message " + msg.cls}>
                    <div className="bubble">
                        <p className="pre">{msg.text}</p>
                        <span className="time">{helper.toTime(msg.timestamp * 1000)}</span>
                        {msg.ack ? <span className="ack"/> : <div/>}
                    </div>
                </div>
            </li>
        );
    },
    buildImage: function (msg) {
        return (
            <li className="chat-item" key={msg.msgLocalID} data-id={msg.id}>
                <div className={"message " + msg.cls}>
                    <div className="bubble">
                        <p className="pre">
                            <a href={msg.image} target="_blank">
                                <img className="image-thumb-body" src={msg.image} />
                            </a>
                        </p>
                        <span className="time">{helper.toTime(msg.timestamp * 1000)}</span>
                        {msg.ack ? <span className="ack"/> : <div/>}
                    </div>
                </div>
            </li>
        );
    },

    buildAudio: function (msg) {
        var audio_url = msg.audio.url + ".mp3";
        return (
            <li className="chat-item" key={msg.msgLocalID} data-id={msg.id}>
                <div className={"message"+msg.cls}>
                    <div className="bubble">
                        <p className="pre">
                            <audio  controls="controls" src={audio_url}/>
                        </p>
                        <span className="time">{helper.toTime(msg.timestamp * 1000)}</span>
                        {msg.ack ? <span className="ack"/> : <div/>}
                    </div>
                </div>
            </li>
        );
    },
};


var ChatHistory = React.createClass({
    appendMessage:function(msg) {
        var time = new Date();
        var m = {};
        m.id = msg.msgLocalID;
        if (msg.timestamp) {
            time.setTime(msg.timestamp * 1000);
            m.timestamp = msg.timestamp;
        }
        m.ack = msg.ack;
        m.received = msg.received;
        m.msgLocalID = msg.msgLocalID;
        if (this.props.loginUser.uid == msg.sender) {
            m.cls = "message-out";
        } else {
            m.cls = "message-in";
        }
        if (msg.contentObj.text) {
            m.text = util.toStaticHTML(msg.contentObj.text);
            return htmlLayout.buildText(m);
        } else if (msg.contentObj.audio) {
            m.audio = msg.contentObj.audio;
            return htmlLayout.buildAudio(m);
        } else if (msg.contentObj.image) {
            m.image = msg.contentObj.image;
            return htmlLayout.buildImage(m);
        } else {
            return null;
        }
    },

    render: function() {
        var nodes = [];
        var msgs = this.props.messages;
        console.log("render history:", msgs.length);
        for (var i in msgs) {
            var msg = msgs[i];
            var n = this.appendMessage(msg);
            if (n) {
                nodes.push(n);
            }
        }
        return (
            <div className="chat-list" id="chatHistory">
                <ul>
                    {nodes}
                </ul>
            </div>        
        );
    }
});

var ChatHistory = connect(function(state) {
    return {messages:state.messages,
            loginUser:state.loginUser};
})(ChatHistory);

module.exports = ChatHistory;
