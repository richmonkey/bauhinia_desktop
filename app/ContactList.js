
var React = require('react');
var ReactDOM = require('react-dom');

var redux = require('react-redux')
var connect = redux.connect;


import {URL, API_URL} from './config.js';


var ContactList = React.createClass({
    getInitialState: function() {
        return {};
    },

    onClick: function(uid, e) {
        this.props.onContactClick(uid);
    },
    
    render: function() {
        var nodes = []
        var users = this.props.contacts;
        for (var i in users) {
            var user = users[i];

            var className = "name";
            var name = user.name;
            var avatar = user.avatar ? user.avatar : "images/_avatar.png";
            if (!name) {
                className = "uid";
                name = helper.getPhone(user.uid);
            }

            var active = user.active;
            
            var t = (
                <li className={active?"active":""} onClick={this.onClick.bind(this, user.uid)}
                    data-uid={user.uid}
                    key={user.uid}>
                    <img src={avatar} className="avatar" alt=""/>
                    <span className={className}>{name}</span>
                    <span className="num">{user.num||''}</span>
                </li>
            );  
            nodes.push(t);
        }
        return (
            <div className="contact-list">
                <ul id="usersList">
                    {nodes}
                </ul>
            </div>
        );        
    }
});


module.exports = ContactList;
