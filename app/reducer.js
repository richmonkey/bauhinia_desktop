var redux = require('redux');
var createStore = redux.createStore;
var combineReducers = redux.combineReducers;


//当前会话
function conversationReducer(state={}, action) {
    switch(action.type) {
        case "set_conversation":
            return action.conversation;
        case "set_conversation_name":
            if (action.cid == state.cid) {
                return Object.assign({}, state, {avatar:action.avatar, name:action.name});
            }
            return state;
        default:
            return state;
    }
    
}

//会话列表
function conversationsReducer(state=[], action) {
    switch(action.type) {
        case "set_conversations":
            return action.conversations;
        case "add_conversation":
            return [action.conversation].concat(state);
        case "set_unread":
            var convs = state.map(function(conv) {
                if (conv.cid == action.cid) {
                    return Object.assign({}, conv, {unread:action.unread});
                }
                return conv
            });
            return convs;
        case "set_latest_message":
            var convs = state.map(function(conv) {
                if (conv.cid == action.conversation.cid) {
                    return Object.assign({}, conv, {message:action.message});
                }
                return conv
            });
            return convs;
        case "set_conversation_name":
            console.log("set name...");
            var convs = state.map(function(conv) {
                if (conv.cid == action.cid) {
                    return Object.assign({}, conv, {avatar:action.avatar, name:action.name});
                }
                return conv
            });
            return convs;
        default:
            return state;
    }
}


function loginUserReducer(state={}, action) {
    switch(action.type) {
        case "set_login_user":
            return action.loginUser;
        default:
            return state;
    }
}

function qrcodeReducer(state={}, action) {
    switch(action.type) {
        case "set_qrcode_timeout":
            return Object.assign({}, state, {timeout:action.timeout});
        case "set_qrcode_url":
            return Object.assign({}, state, {url:action.url});
        default:
            return state;
    }
}


//do not use combineReducers ignore init state of createStore
function appReducer(state={}, action) {
    return {
        conversations:conversationsReducer(state.conversations, action),
        conversation:conversationReducer(state.conversation, action),
        loginUser:loginUserReducer(state.loginUser, action),
        qrcode:qrcodeReducer(state.qrcode, action)
    };
}

module.exports = appReducer;
