var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('react-redux')
var connect = redux.connect;

var ipc = require('electron').ipcRenderer;

function setDockBadge(total) {
    console.log("unread count:" + total);
    if (total > 0) {
        ipc.sendSync('set-badge', "" + total);
    } else {
        ipc.sendSync('set-badge', "");
    }
}

var ConversationList = React.createClass({
    onClick: function(conv, e) {
        if (conv.type == "peer") {
            var messages = this.props.imDB.loadUserMessage(conv.peer, (messages) => {
                this.props.dispatch({type:"set_conversation", conversation:conv});
                this.props.dispatch({type:"set_messages", messages:messages});
                scrollDown();

                this.props.dispatch({type:"set_unread", unread:0, cid:conv.cid});
                conversationDB.setNewCount(conv.cid, 0);
                var total = 0;
                for (var i = 0; i < this.props.conversations.length; i++) {
                    total = total + this.props.conversations[i].unread;
                }

                setDockBadge(total);
            });
        } else if (conv.type == "group") {
            var messages = this.props.groupDB.loadGroupMessage(conv.groupID, (messages) => {
                this.props.dispatch({type:"set_conversation", conversation:conv});
                this.props.dispatch({type:"set_messages", messages:messages});
                scrollDown();

                this.props.dispatch({type:"set_unread", unread:0, cid:conv.cid});
                conversationDB.setNewCount(conv.cid, 0);
                var total = 0;
                for (var i = 0; i < this.props.conversations.length; i++) {
                    total = total + this.props.conversations[i].unread;
                }

                setDockBadge(total);
            });            
        }
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
            console.log("11:", this.props.conversation.cid);
            console.log("cid:", conv.cid, " unread:", conv.unread, " active:", active);
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
                                    {"最近的消息内容"}
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
