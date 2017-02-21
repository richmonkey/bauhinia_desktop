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
                var index = -1;
                for (var i = 0; i < this.props.conversations.length; i++) {
                    var conv = this.props.conversations[i];
                    if (conv.cid == conv.cid) {
                        index = i;
                        break;
                    }
                }
                if (index == -1) {
                    return;
                }

                console.log("messages:" + messages.length);
                var conv = this.props.conversations[i];
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
                var index = -1;
                for (var i = 0; i < this.props.conversations.length; i++) {
                    var conv = this.props.conversations[i];
                    if (conv.cid == conv.cid) {
                        index = i;
                        break;
                    }
                }
                if (index == -1) {
                    return;
                }

                console.log("messages:" + messages.length);
                var conv = this.props.conversations[i];
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
            console.log("unread:" + conv.unread);

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

            
            var t = (
                <li onClick={this.onClick.bind(this, conv)} data-uid={conv.cid} key={conv.cid}>
                    <img src={avatar} className="avatar" alt=""/>
                    <span className="name">{name}</span>
                    <span className="num">{conv.unread||''}</span>
                </li>
            );  
            nodes.push(t);
        }
        return (
            <ul id="usersList">
                {nodes}
            </ul>
        );        
    }
});

var ConversationList = connect(function(state) {
    return state;
})(ConversationList);
module.exports = ConversationList;
