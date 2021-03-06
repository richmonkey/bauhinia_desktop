var capture = require("mac-screen-capture");

util = {
    urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
    //  html sanitizer
    toStaticHTML: function (inputHtml) {
        inputHtml = inputHtml.toString();
        return inputHtml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
    //pads n with zeros on the left,
    //digits is minimum length of output
    //zeroPad(3, 5); returns "005"
    //zeroPad(2, 500); returns "500"
    zeroPad: function (digits, n) {
        n = n.toString();
        while (n.length < digits)
            n = '0' + n;
        return n;
    },
    //it is almost 8 o'clock PM here
    //timeString(new Date); returns "19:49"
    timeString: function (date) {
        var minutes = date.getMinutes().toString();
        var hours = date.getHours().toString();
        return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
    },

    //does the argument only contain whitespace?
    isBlank: function (text) {
        var blank = /^\s*$/;
        return (text.match(blank) !== null);
    },

    setCookie:function (c_name,value,expires) {
        var exdate=new Date()
        if (expires) {
            exdate.setTime(exdate.getTime() + expires*1000);
            document.cookie=c_name+ "=" +escape(value)+
                ";expires="+exdate.toGMTString();
        } else {
            document.cookie=c_name+ "=" +escape(value);
        }
    },

    getCookie: function (c_name) {
        if (document.cookie.length>0) {
            c_start=document.cookie.indexOf(c_name + "=")
            if (c_start!=-1) { 
                c_start=c_start + c_name.length+1 
                c_end=document.cookie.indexOf(";",c_start)
                if (c_end==-1) c_end=document.cookie.length
                return unescape(document.cookie.substring(c_start,c_end))
            } 
        }
        return ""
    },

};


var helper = {
    toTime: function (ts) {
        //时间戳取时间
        var d = ts ? new Date(ts) : new Date();
        var H = d.getHours();
        var m = d.getMinutes();
        return H + ':' + (m < 10 ? '0' + m : m);
    },
    getUserName: function (user) {
        if (user.name) {
            return user.name;
        } else {
            var uid = user.uid.toString(),
                i = uid.indexOf("0");
            return uid.substr(i + 1)
        }
    },
    getUserAvatar: function (user) {
        if (user.avatar) {
            return user.avatar;
        } else {
            return '';
        }
    },
    getPhone: function (phone) {
        if (phone) {
            return (phone + '').split('860')[1];
        } else {
            return ''
        }
    },
};

function scrollDown() {
    $('#chatHistory').scrollTop($('#chatHistory ul').outerHeight());
    $("#entry").text('').focus();
}

function showLogin() {
    $("#loginView").removeClass('hide').show();
    $("#chat").addClass('hide').hide();
}

function showChat() {
    $("#loginView").addClass('hide').hide();
    $("#chat").removeClass('hide').show();
    scrollDown();
}


var userDB = {
    users : new Array(),
    addUser : function(newUser) {
        var exists = false;
        for (var i in this.users) {
            var user = this.users[i];
            if (user.uid == newUser.uid) {
                exists = true;
            }
        }
        if (!exists) {
            this.users.push(newUser);
        }
        return !exists;
    },
    findUser : function(uid) {
        for (var i in this.users) {
            var user = this.users[i];
            if (user.uid == uid) {
                return user;
            }
        }
        return null;
    }
};
