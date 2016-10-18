var redux = require('redux');
var createStore = redux.createStore;
var combineReducers = redux.combineReducers;


//当前会话
function conversationReducer(state={}, action) {
    switch(action.type) {
        case "set_conversation":
            return action.conversation;
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
            return state;
        default:
            return state;
    }
}

function messagesReducer(state = [], action) {
    switch(action.type) {
        case "set_messages":
            return action.messages;
        case "add_message":
            return state.concat(action.message);
        case "ack_message":
            var index = -1;
            for (var i = 0; i < state.length; i++) {
                var m = state[i];
                if (m.msgLocalID == action.msgLocalID) {
                    index = i;
                    break;
                }
            }
            
            if (index == -1) {
                return state;
            } else {
                var m = Object.assign({}, state[index], {ack:true});
                return [...state.slice(0, index), m, ...state.slice(index+1, state.length)];
            }
            break;
        default:
            return state;
    }
}

function contactsReducer(state=[], action) {
    switch(action.type) {
        case "set_contacts":
            return action.contacts;
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

var appReducer = combineReducers({conversations:conversationsReducer,
                                  messages:messagesReducer, 
                                  contacts:contactsReducer,
                                  conversation:conversationReducer,
                                  loginUser:loginUserReducer});
module.exports = appReducer;
