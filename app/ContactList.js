
var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('react-redux')
var connect = redux.connect;



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


var ContactList = connect(function(state) {
    return state;
})(ContactList);
module.exports = ContactList;
