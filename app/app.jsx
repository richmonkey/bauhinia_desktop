var React = require('react');
var ReactDOM = require('react-dom');

var ContactList = React.createClass({
    getInitialState: function() {
        return {data: []};
    },

    loadData:function() {
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
                this.setState({data: data});
            }.bind(this),
            error: function(xhr, status, err) {
                console.error("/users", status, err.toString());
            }.bind(this)
        });
    },

    addUser:function(user) {
        var inserted = userDB.addUser(user);
        if (inserted) {
            var data = this.state.data;
            data.push(user);
            this.setState({data:data});
        }
    },

    render: function() {
        var nodes = []
        var users = this.state.data;
        for (var i in users) {
            var user = users[i];

            var className = "name";
            var name = helper.getUserName(user);
            if (!name) {
                className = "uid";
                name = helper.getPhone(user.uid);
            }
            var t = (
                <li data-uid={user.uid} key={user.uid}>
                    <img src={user.avatar?helper.getUserAvatar(user):"images/_avatar.png"} className="avatar" alt=""/>
                    <span className={className}>{name}</span>
                    <span className="num">{user.num||''}</span>
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
    getInitialState: function() {
        return {data: []};
    },

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
        if (loginUser.uid == msg.sender) {
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
    
    setHistoryMessage: function(msgs) {
        this.setState({data:msgs.slice(0)});
    },

    addMessage: function(msg) {
        console.log("add message...");
        var msgs = this.state.data;
        msgs.push(msg);
        this.setState({data:msgs});
    },

    ackMessage: function(msgID, uid) {
        console.log("ack message...");
        var msgs = this.state.data;
        for (var i in msgs) {
            var msg = msgs[i];
            if (msg.msgLocalID == msgID) {
                msg.ack = true;
                break;
            }
        }
        this.setState({data:msgs});
    },

    render: function() {
        var nodes = [];
        var msgs = this.state.data;
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

var AppContent = React.createClass({
    loadData: function() {
        this.contactList.loadData();
    },
    
    render: function() {
      var t = function (c) {
          this.contactList = c
      }.bind(this);
        
      var t2 = function (c) {
          this.chatHistory = c
      }.bind(this);

      return (
          <div className="app">
           <div className="pane pane-list">
              <div className="profile pane-header pane-list-header">
                  <img src="images/_avatar.png" className="avatar" alt=""/>
                  <span className="name" id="name"></span>
                  <a className="exit" href="#" id="exit">退出</a>
              </div>
              <div className="contact-list">
                  <ContactList ref={t}/>
              </div>
          </div>
          <div className="main pane pane-chat" id="main">
              <div className="intro" id="intro">
                  请选择联系人
              </div>
              <div className="pane-header pane-chat-header">
                  <img src="images/_avatar.png" id="to_user_avatar" className="avatar" alt=""/>
       
                  <div className="name" id="to_user"></div>
              </div>
              <ChatHistory ref={t2}/>
              <div className="chat-form pane-chat-footer">
                  <div className="shortcut-wrap">
                      <a href="#" id="clipboard" className="clipboard"></a>
                  </div>
                  <textarea id="entry" className="chat-input"></textarea>
              </div>
          </div>
         </div>
      );
  }
});

appComponent = ReactDOM.render(
        <AppContent id="app"/>,
    document.getElementById('chat')
);

