var React = require('react');
var ReactDOM = require('react-dom');


var InputBar = React.createClass({
    getInitialState: function() {
        return {
            showEmoji:false,
        };
    },
    
    renderEmoji: function() {
        //https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        var emojis = [
            {
                name: "grinning",
                value: "\u{1f600}"
            },
            {
                name: "smiley",
                value: "\u{1f603}"
            },
            {
                name: "wink",
                value: "\u{1f609}"
            },
            {
                name: "sweat_smile",
                value: "\u{1f605}"
            },
            {
                name: "yum",
                value: "\u{1f60b}"
            },
            {
                name: "sunglasses",
                value: "\u{1f60e}"
            },
            {
                name: "rage",
                value: "\u{1f621}"
            },
            {
                name: "confounded",
                value: "\u{1f616}"
            },
            {
                name: "flushed",
                value: "\u{1f633}"
            },
            {
                name: "disappointed",
                value: "\u{1f61e}"
            },
            {
                name: "sob",
                value: "\u{1f62d}"
            },
            {
                name: "neutral_face",
                value: "\u{1f610}"
            },
            {
                name: "innocent",
                value: "\u{1f607}"
            },
            {
                name: "grin",
                value: "\u{1f601}"
            },
            {
                name: "smirk",
                value: "\u{1f60f}"
            },
            {
                name: "scream",
                value: "\u{1f631}"
            },
            {
                name: "sleeping",
                value: "\u{1f634}"
            },
            {
                name: "flushed",
                value: "\u{1f633}"
            },
            {
                name: "confused",
                value: "\u{1f615}"
            },
            {
                name: "mask",
                value: "\u{1f637}"
            },
            {
                name: "blush",
                value: "\u{1f60a}"
            },
            {
                name: "worried",
                value: "\u{1f61f}"
            },
            {
                name: "hushed",
                value: "\u{1f62f}"
            },
            {
                name: "heartbeat",
                value: "\u{1f493}"
            },
            {
                name: "broken_heart",
                value: "\u{1f494}"
            },
            {
                name: "crescent_moon",
                value: "\u{1f319}"
            },
            {
                name: "star2",
                value: "\u{1f31f}"
            },
            {
                name: "sunny",
                value: "\u{2600}\u{fe0f}"
            },
            {
                name: "rainbow",
                value: "\u{1f308}"
            },
            {
                name: "heart_eyes",
                value: "\u{1f60d}"
            },
            {
                name: "kissing_smiling_eyes",
                value: "\u{1f619}"
            },
            {
                name: "lips",
                value: "\u{1f444}"
            },
            {
                name: "rose",
                value: "\u{1f339}"
            },
            {
                name: "rose",
                value: "\u{1f339}"
            },
            {
                name: "+1",
                value: "\u{1f44d}"
            },
        ];

        var self = this;
        var arr = emojis.map((e, index) => {
            function onEmojiClick() {
                console.log("emoji click:", e.name, e.value);
                var msg = $("#entry").val() + e.value;
                $("#entry").val(msg);
                $("#entry").focus();
            }
            
            return (
                <div key={index}>
                    <span>
                        <span onClick={onEmojiClick}
                              className="emoji">{e.value}</span>
                    </span>
                </div>
            );
        });

        return (
            <div className="expressionWrap">
                <i className="arrow"></i>
                {arr}
            </div>
        );
    },

    onEmoji: function(e) {
        var showEmoji = !this.state.showEmoji;
        this.setState({
            showEmoji:showEmoji
        });

        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    },

    hideEmoji: function() {
        this.setState({
            showEmoji:false
        });
    },

    onKeyPress:function(e) {
        if (e.key != 'Enter') return;

        var msg = $("#entry").val().replace("\n", "");
        if (!util.isBlank(msg)) {
            this.props.sendTextMessage(msg);
        }
        return false;
    },

    
    render: function() {
        return ( 
            <div className="chat-form pane-chat-footer">           
                <div id="MessageForm" className="">
                    <div id="MessageForm-header">
                        <div className="MessageForm-tool">
                            <i onClick={this.onEmoji}
                               className="iconfont-smile"></i>
                            {this.state.showEmoji ? this.renderEmoji() : null}
                        </div>
                        <div className="MessageForm-tool">
                            <i className="screen_shot"
                               id="screen_shot"
                               style={{
                                   position: 'relative',
                                   "zIndex": 1
                               }}
                               onClick={this.props.onClipboard}></i>
                        </div>
                        <div className="MessageForm-tool">
                            <i className="iconfont-upload"
                               id="upload-image"
                               style={{
                                   position: 'relative',
                                   "zIndex": 1
                               }}>
                            </i>

                            <div className="moxie-shim moxie-shim-html5"
                                 style={{position: 'absolute',
                                         top: "5px",
                                         left: "0px",
                                         width: "20px",
                                         height: "15px",
                                         overflow: "hidden",
                                         "zIndex": 2}}>
                                <input type="file"
                                       id="image"
                                       onChange={this.props.onImageChange}
                                       style={{
                                           fontSize: "999px",
                                           opacity: 0,
                                           position: "absolute",
                                           top: "0px",
                                           left: "0px",
                                           width: "100%",
                                           height: "100%"}}
                                       multiple=""
                                       accept="image/jpeg,image/gif,image/png">
                                </input>
                            </div>
                        </div>

                        <div className="MessageForm-tool">
                            <i className="file_shot"
                               id="upload-file"
                               style={{
                                   position: 'relative',
                                   "zIndex": 1}}>
                            </i>

                            <div className="moxie-shim moxie-shim-html5"
                                 style={{position: 'absolute',
                                         top: "5px",
                                         left: "0px",
                                         width: "20px",
                                         height: "15px",
                                         overflow: "hidden",
                                         "zIndex": 2}}>
                                <input type="file"
                                       id="file"
                                       onChange={this.props.onFileChange}
                                       style={{
                                           fontSize: "999px",
                                           opacity: 0,
                                           position: "absolute",
                                           top: "0px",
                                           left: "0px",
                                           width: "100%",
                                           height: "100%"}}
                                       multiple=""
                                       accept="">
                                </input>
                            </div>
                        </div>
                        
                    </div>
                    
                </div>

                <textarea onKeyPress={this.onKeyPress} id="entry" className="chat-input"></textarea>
            </div>
        );
    },        

    
});

module.exports = InputBar;
