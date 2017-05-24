var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('react-redux')
var connect = redux.connect;

var ConversationList = React.createClass({
    onClick: function(conv, e) {
        this.props.onConversationClick(conv);
    },

    render: function() {
        console.log("render conversation list");
        var nodes = []
        var convs = this.props.conversations;
        for (var i in convs) {
            var conv = convs[i];

            var name = "";
            var avatar = "";
            if (conv.type == "peer") {
                avatar = "images/_avatar.png";
            } else if (conv.type == "group") {
                avatar = "images/avatar_group.png";
            }

            if (conv.name) {
                name = conv.name;
            }

            if (conv.avatar) {
                avatar = conv.avatar;
            }

            var active = false;
            if (conv.cid == this.props.conversation.cid) {
                active = true;
            }
            console.log("cid:", conv.cid, " unread:", conv.unread, " active:", active);
            var msg = "";
            if (conv.message) {
                if (conv.message.contentObj.text) {
                    msg = util.toStaticHTML(conv.message.contentObj.text);
                } else if (conv.message.contentObj.audio) {
                    msg = "语音";
                } else if (conv.message.contentObj.image) {
                    msg = "图片";
                } else {
                    msg = "未知消息类型";
                }
            }
            var t = (
                <div className={active?"chatList selected":"chatList"}  onClick={this.onClick.bind(this, conv)} data-uid={conv.cid} key={conv.cid}>
                    <div className="chat_item online slider-left">
                        <div className="ext">
                            <p className="attr clearfix timer">
                                <span className="pull-left">02-18</span>
                            </p>
                            <p className="attr clearfix">
                                <span className="badge">{conv.unread||''}</span>
                            </p>
                        </div>

                        <div className="photo">
                            <img src={avatar} className="img" alt=""/>
                        </div>

                        <div className="info">
                            <h3 className="nickname">
                                <span className="nickname_text">
                                    {name}
                                </span>
                            </h3>
                            <p className="msg">
                                <span>
                                    {msg}
                                </span>
                            </p>
                        </div>
                    </div>

                </div>
            )
            nodes.push(t);
        }

        return (
            <div className="chatArea">
                {nodes}
            </div>
        )
    }
});

var ConversationList = connect(function(state) {
    return state;
})(ConversationList);
module.exports = ConversationList;
