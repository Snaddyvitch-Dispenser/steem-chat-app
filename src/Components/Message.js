import React from "react";
import ReactTooltip from "react-tooltip";
import Since from "react-since";

class Message extends React.Component {
    componentDidUpdate() {
        ReactTooltip.rebuild();
    }

    render () {
        let sent_at = (new Date(this.props.data.timestamp * 1000));
        let sent_at_formatted = sent_at.toLocaleDateString() + " " + sent_at.toLocaleTimeString();
        let verification_symbol = "fas fa-times";
        let verification_description = this.props.data.checked_message;
        let message_verification_class = " message-fake";
        let message_same_author = "";
        if ('checked' in this.props.data) {
            if (this.props.data.checked === "signed" || this.props.data.checked === "signed+chain") {
                verification_symbol="fas fa-check";
                if (this.props.data.checked === "signed+chain") {
                    verification_symbol = "fas fa-check-double";
                }
                verification_description = this.props.data.checked_message;
                message_verification_class = " message-signed";
                if (this.props.previous_message.from === this.props.data.from && this.props.previous_message.checked !== "fake") {
                    // If there's more than 5 minutes between the same user's messages, separate them.
                    if (this.props.previous_message.timestamp + 300 > this.props.data.timestamp) {
                        message_same_author = " same-author";
                    }
                }
            }
        }
        if (message_same_author.length > 0) {
            return (
                <div className={"message" + message_same_author + message_verification_class}>
                    <div className="message-text">{this.props.data.content}</div>
                </div>
            );
        } else {
            return (
                <div className={"message" + message_same_author + message_verification_class}>
                    <div className="message-avatar"
                         style={{backgroundImage: `url( "https://images.hive.blog/u/${this.props.data.from}/avatar")`}}/>
                    <div className="message-info">{this.props.data.from} - <span className="cursor-pointer" data-place="top" data-tip={sent_at_formatted}><Since
                        date={sent_at}/></span> <span data-tip={verification_description} className="cursor-pointer" data-place="top"><em
                        className={verification_symbol}/></span></div>
                    <div className="message-text">{this.props.data.content}</div>
                </div>
            );
        }
    }
}

export default Message;