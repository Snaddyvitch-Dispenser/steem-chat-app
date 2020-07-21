import React from "react";
import crypto from "crypto";
import {toast} from "react-toastify";
import ScrollToBottom from "react-scroll-to-bottom";
import Message from "./Message";

class Channel extends React.Component {
    constructor(props){
        super(props);

        this.state = {'message': '', "isSending": false}
    }

    messageGetter() {
        var look_in = (this.props.currentChannel.isPrivateMessage ? "private" : "group");
        if (this.props.currentChannel.name in this.props.messageHistory[look_in]) {
            console.log(this.props.messageHistory[look_in][this.props.currentChannel.name]);
            return this.props.messageHistory[look_in][this.props.currentChannel.name];
        } else {
            return [];
        }
    }

    sendMessage() {
        this.setState({"isSending": true});
        if (this.state.message.length > 0) {
            var transaction_data = JSON.stringify({
                "format": "plaintext",
                "extensions": [],
                "app": "dmessages/v0.0.1",
                "to": this.props.currentChannel.name,
                "content": this.state.message,
                "expires": Math.floor((new Date()).getTime()/1000) + 20
            });

            try {
                window.hive_keychain.requestSignBuffer(this.props.userSignedIn,transaction_data,"Posting",(keychain_response) => {
                    if (keychain_response.success) {
                        var msg_location = (this.props.currentChannel.isPrivateMessage ? "private" : "channel");
                        var transaction_with_info={
                            "name": this.props.userSignedIn,
                            "signature": keychain_response.result,
                            "type": "send_" + msg_location + "_message",
                            "data": transaction_data
                        };
                        let transaction_string = JSON.stringify(transaction_with_info);

                        if (this.props.websocketOpen) {
                            this.props.websocketSend(transaction_string);
                            this.setState({'message': '', 'isSending': false});
                            // We don't have to worry about the next bit, it's only another layer of verification and isn't needed.
                            try {
                                console.log(JSON.stringify(transaction_string));
                                window.hive_keychain.requestCustomJson(this.props.userSignedIn, CUSTOM_JSON_IDENTIFIER, "Posting", JSON.stringify(["approve_message_by_hash",{"hash": crypto.createHash('sha256').update(JSON.stringify(transaction_string)).digest("hex"), "to": this.props.currentChannel.name, "to_type": msg_location}]), "Post message proof hash to chain", (keychain_response) => {
                                    if (!keychain_response.success) {
                                        console.log("Failed to broadcast to chain.");
                                    }
                                });
                            } catch {
                                console.log("Failed to broadcast to chain.");
                            }
                        } else {
                            this.setState({"isSending": false});
                        }
                    } else {
                        toast.error(keychain_response.message + ". Please try again.");
                        this.setState({"isSending": false});
                    }
                });
            } catch {
                toast.error("Can't communicate with Keychain. Please try again.");
                this.setState({"isSending": false});
            }
        }
    }

    render() {
        var current_messages = this.messageGetter();
        return (
            <div className="channel">
                <div className="channel-info">
                    <p><em className={"fas fa-" + (this.props.currentChannel.isPrivateMessage ? "at" : "hashtag")}/> {this.props.currentChannel.name}</p>
                </div>
                <ScrollToBottom className="channel-content" scrollViewClassName="scrollable-messages" followButtonClassName="scroll-to-bottom fas fa-arrow-down">
                    {current_messages.map((item, index) => (<Message data={item} key={JSON.stringify(item)} previous_message={((index > 0) ? current_messages[index - 1] : "")}/>))}
                </ScrollToBottom>
                <div className="channel-send row">
                    <input type="text" onKeyUp={event => {if (event.key === "Enter" || event.key === "NumpadEnter") { this.sendMessage() }}} disabled={!this.props.websocketOpen || this.state.isSending} className="message-text col-sm-11" value={this.state.message} onChange={event => this.setState({message: event.target.value.toString()})} />
                    <div className="channel-buttons col-sm-1">
                        <button disabled={!this.props.websocketOpen || this.state.isSending} onClick={() => this.sendMessage()} className="message-button message-send-button btn"><em className="far fa-paper-plane"/></button>
                        <button className="message-button message-user-button btn" style={{backgroundImage: `url( "https://images.hive.blog/u/${this.props.userSignedIn}/avatar")`}}/>
                        <button className="message-button message-add-button btn" onClick={() => this.props.signOut()}><em className="fas fa-sign-out-alt"/></button>
                    </div>
                </div>
            </div>
        );
    }
}

export default Channel;