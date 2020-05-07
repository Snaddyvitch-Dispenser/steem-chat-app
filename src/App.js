import React from 'react';
import ReactTooltip from 'react-tooltip';
import './App.scss';
import { ToastContainer, toast } from 'react-toastify';
import { Client, Signature, cryptoUtils } from 'dsteem';
import firefox_logo from './firefox.svg';
import chrome_logo from './chrome.svg';
import 'react-toastify/dist/ReactToastify.css';
import Websocket from 'react-websocket';
import ScrollToBottom from 'react-scroll-to-bottom';
import Since from 'react-since';
import store from 'store/dist/store.modern';
import axios from "axios";
import crypto from 'crypto';
import hive from '@hivechain/hivejs';

// Allow requests to api.dmessages.app to set cookies.
axios.defaults.withCredentials = true;

const CUSTOM_JSON_IDENTIFIER = "dmessages__v1_0_0_0";

// Entire App
class DMessages extends React.Component {
  constructor(props) {
    super(props);

    // State - for holding values from inputs and other HTML elements
    this.state = {'pmAddUsername': '', 'showAddChannels': false, 'channelAddName': '', 'showRemoveChannels': false, 'channelList': {"group":[{"name":"general","avatar":"dmessages"}],"private":[]}, 'currentUser': '', "currentChannel": {"name": "general", "isPrivateMessage": false}, "wsConnectionAttempts": 0, "wsIsOpen": false, 'history': {"group":{},"private":{}}};

    // Check if channels are stored in browser
    if (store.get('channels')) {
      // Load channel list from browser
      this.state.channelList = store.get('channels');
    }

    if (store.get('authorisedCache')) {
      // Load pre-approved messages and user keys from browser
      this.authorisedCache = store.get('authorisedCache');
    } else {
      this.authorisedCache = {"messages": [], "keys": {}};
    }

    // Load user from storage if saved
    if (store.get('user')) {
      if (store.get('user') !== "") {
        this.state.currentUser = store.get('user');
      }
    }

    if (store.get('currentChannel')) {
      this.state.currentChannel = store.get('currentChannel');
    }

    this.hiveClient = new Client('https://anyx.io');

    this.getFromChain();
  }

  async getFromChain() {
    let outer_this = this;
    hive.api.streamOperations(async function (err, operation) {
      if (err === undefined || err == null) {
        if (operation[0] === 'custom_json') {
          if (operation[1]["id"] === CUSTOM_JSON_IDENTIFIER) {
            try {
              let contents = JSON.parse(operation[1]["json"]);
              if (contents[0] === "approve_message_by_hash") {
                if ('hash' in contents[1] && 'to' in contents[1] && 'to_type' in contents[1]) {
                  let signed_by = operation[1]["required_posting_auths"][0];
                  let dm_name = contents[1]["to"];
                  if (contents[1]["to"] === outer_this.state.currentUser) {
                    dm_name = signed_by
                  }
                  let history = outer_this.state.history;
                  if (contents[1]["to_type"] === "channel") {
                    if (!(contents[1]["to"] in history.group)) {
                      history["group"][contents[1]["to"]] = [];
                    }

                    let current_group = history["group"][contents[1]["to"]];
                    for (let g = 0; g < current_group.length; g++) {
                      if (crypto.createHash('sha256').update(JSON.stringify(current_group[g].raw_data)).digest("hex") === contents[1]["hash"]) {
                        if (current_group[g].checked === "signed") {
                          current_group[g].checked = "signed+chain";
                          current_group[g].checked_message = "This message was verified with both a signature and on-chain transaction!";
                          history["group"][contents[1]["to"]] = current_group;
                          outer_this.setState({'history': history});
                          break;
                        }
                      }
                    }
                  } else if (contents[1]["to_type"] === "private") {
                    if (!(dm_name in history.private)) {
                      history["private"][dm_name] = [];
                    }

                    let current_private_message = history["private"][dm_name];
                    for (let p = 0; p < current_private_message.length; p++) {
                      if (crypto.createHash('sha256').update(JSON.stringify(current_private_message[p].raw_data)).digest("hex") === contents[1]["hash"]) {
                        if (current_private_message[p].checked === "signed") {
                          current_private_message[p].checked = "signed+chain";
                          current_private_message[p].checked_message = "This message was verified with both a signature and on-chain transaction!";
                          history["private"][dm_name] = current_private_message;
                          outer_this.setState({'history': history});
                          break;
                        }
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.log("Error processing CUSTOM_JSON from chain!", e);
            }
          }
        }
      }
    });
  }

  // Toggle add channels box
  toggleAddChannels() {
    this.setState({showAddChannels: !this.state.showAddChannels});
  }
  
  // Show remove channels overlay, allowing users to click to delete channels.
  toggleRemoveChannels() {
    this.setState({showRemoveChannels: !this.state.showRemoveChannels});
  }

  // Add a channel to a user's channel list
  addChannel(name, isPrivateMessage=true, avatar="") {
    let channels = this.state.channelList;
    if (isPrivateMessage) {
      if ((channels.private.indexOf(name) === -1)) {
        channels.private.push(name);
      }
    } else {
      if ((channels.group.filter(value=> value["name"] === name).length === 0)) {
        channels.group.push({"name": name, "avatar": avatar});
      }
    }
    this.setState({channelList: channels});
    store.set('channels', this.state.channelList);
  }

  // Remove a channel from a user's channel list
  removeChannel (name, isPrivateMessage=true) {
    var channels = this.state.channelList;
    if (isPrivateMessage) {
      // Loop through all Private Messages
      for( var pmsChecked = 0; pmsChecked < this.state.channelList.private.length; pmsChecked++) {
        // If Private Message username matches
        if (channels.private[pmsChecked] === name) { 
            channels.private.splice(pmsChecked, 1); // Remove elements
            pmsChecked--; // Decrement by one, because an element has been removed
          }
        }
    } else {
      // Loop through all channels
      for( var channelsChecked = 0; channelsChecked < this.state.channelList.group.length; channelsChecked++){
        // If channel matches
        if ( this.state.channelList.group[channelsChecked]["name"] === name) {
          this.state.channelList.group.splice(channelsChecked, 1); // Remove element
          channelsChecked--; // Decrement by one, because we just removed an element. 
      }}
    }
    // Update browser copy & state
    this.setState({channelList: channels});
    store.set('channels', channels);
  }

  onChannelClick(channel, isPrivateMessage=true){
    this.setState({currentChannel: {"name": channel, "isPrivateMessage": isPrivateMessage}});
    store.set('currentChannel', {"name": channel, "isPrivateMessage": isPrivateMessage});
  }

  // Pass required functions down to ChannelList, and return the result for use in the app
  renderChannelList() {
    return (
      <ChannelList onChannelClick={(channel, isPrivateMessage=true) => this.onChannelClick(channel, isPrivateMessage)} showRemoveIcon={this.state.showRemoveChannels} addChannelsDialog={() => this.toggleAddChannels()} removeChannelsDialog={() => this.toggleRemoveChannels()} removeChannel={(name, isPrivateMessage) => this.removeChannel(name, isPrivateMessage)} channels={this.state.channelList} />
    );
  }

  renderAddChannelDialog(){
    if (this.state.showAddChannels) {
      return (
        <div id="add-channels-overlay" className="overlay">
          <div id="add-channels" className="sm-modal">
            <button className="close-button" onClick={() => this.setState({showAddChannels: false})}>&times;</button>
            <h4>Add Channel</h4>
            <div className="row">
              <div className="col col-offset-2">
                <div>
                  <h5>Group Chat</h5>
                  <p>Start a chat in a public group.</p>
                  <div className="input-with-icon">
                    <div className="input-icon" id="person-avatar-dm" style={{backgroundImage: `url( "https://steemitimages.com/u/dmessages/avatar")`}}/>
                    <input type="text" id="group_message_username" value={this.state.channelAddName} onChange={event => this.setState({channelAddName: event.target.value.toLowerCase()})} maxLength="16" />
                    <button className="input-action" onClick={() => {if(this.state.channelAddName !== "") {this.addChannel(this.state.channelAddName,false,"dmessages"); this.setState({showAddChannels: false, channelAddName: ""})}}}>+</button>
                  </div>
                </div>
              </div>
              <div className="col col-offset-2">
                <div>
                  <h5>Private Message</h5>
                  <p>Send a private message to another user.</p>
                  <div className="input-with-icon">
                    <div maxLength="100" className="input-icon" id="person-avatar-dm" style={{backgroundImage: `url( "https://steemitimages.com/u/${this.state.pmAddUsername}/avatar")`}}/>
                    <input type="text" value={this.state.pmAddUsername} id="private_message_username" onChange={event => this.setState({pmAddUsername: event.target.value.toLowerCase()})} maxLength="32" />
                    <button className="input-action" onClick={() => {if(this.state.pmAddUsername !== "" && this.state.pmAddUsername !== "null") {this.addChannel(this.state.pmAddUsername); this.setState({showAddChannels: false, pmAddUsername: ""})}}}>+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      return "";
    }
  }

  userSignedIn(user) {
    this.setState({"currentUser": user});
    store.set('user', this.state.currentUser);
  }

  renderLoginPanel() {
    return (<LoginPanel websocketGetHistory={() => this.onWebsocketConnect()} signedInAs={this.state.currentUser} onSignIn={(user) => {this.userSignedIn(user)}} />);
  }

  renderChannel() {
    return (<Channel userSignedIn={this.state.currentUser} websocketOpen={this.state.wsIsOpen} websocketSend={(message) => this.websocketSendMessage(message)} currentChannel={this.state.currentChannel} messageHistory={this.state.history} signOut={() => this.signUserOut()} />);
  }

  signUserOut() {
    this.setState({"currentUser": ""});
    store.set('user', "");
  }

  async validateMessage(message) {
    // get the hash of this message
    let msg_successful_match = false;
    let msg_failure_reason = "";
    let message_hash = crypto.createHash('sha256').update(JSON.stringify(message)).digest("hex");
    let posting_key = "";

    // Check if we've already verified it
    if (this.authorisedCache.messages.includes(message_hash)) {
      // Set matched to true
      msg_successful_match = true;
    } else {
      // If we have their key stored, try that first
      if (message.from in this.authorisedCache.keys) {
        // Try and recover the value (catch in case the signature isn't a real signature)
        try {
          // If the recovered key equals the key the user has
          if (this.authorisedCache.keys[message.from] === (Signature.fromString(message.signature).recover(cryptoUtils.sha256(message.signed_data))).toString()) {
            // Set match to true
            msg_successful_match = true;
          }
        } catch {
          // Log the failure
          console.log("Cached user key outdated or invalid message");
        }
      }

    // Least cached method - VERY SLOW (relatively)
    // If not matched
    if (!msg_successful_match) {
      try {
        // Get from the blockchain
        const [account] = await this.hiveClient.database.getAccounts([message.from]);

        let user_public_posting_key = account.posting.key_auths[0][0];

        // Recover public key from message
        let recovered_public_key = Signature.fromString(message.signature).recover(cryptoUtils.sha256(message.signed_data));

        // Check they match
        if (user_public_posting_key === recovered_public_key.toString()) {
          posting_key = user_public_posting_key;
          msg_successful_match = true;
        }
      } catch {
        msg_failure_reason = "This message was not signed or was signed with a bad signature!";
        console.log("Bad Signature!");
      }
    }

    try {
      // Try to parse the data that was included
      var parsed_signed_data = JSON.parse(message.signed_data);

      if (parsed_signed_data.to !== message.to) {
        msg_successful_match = false;
        msg_failure_reason = "Message to field is not the same as the signed message."
      }

      if (parsed_signed_data.content !== message.content) {
        msg_successful_match = false;
        msg_failure_reason = "Message content doesn't match what was signed.";
      }

      if (parsed_signed_data.expires < message.timestamp) {
        msg_successful_match = false;
        msg_failure_reason = "This signature has expired before the server received it."
      }
    } catch {
      msg_successful_match = false;
      msg_failure_reason = "This message is missing required fields and has an invalid signature";
    }
  }

      // Check if it matches
      if (msg_successful_match) {
        message.checked = "signed";
        // Add hash to hashes list, to save time in future runs
        this.authorisedCache.messages.push(message_hash);
        this.authorisedCache.keys[message.from] = posting_key;
        store.set('authorisedCache', this.authorisedCache);
        message.checked = "signed";
        message.checked_message = "This message was signed with a valid key and all fields match.";
        return message;
      } else {
        message.checked = "fake";
        message.checked_message = msg_failure_reason;
        return message;
      }
  }

  async websocketReceiveMessage(data) {
    let message_data = false;
    try {
      message_data = JSON.parse(data);
    } catch {
      // In the unlikely event of packet drops .etc. ignore it
    }

    if (message_data !== false) {
      // commanded message
      if ('command' in message_data) {
        // Contains history from before we were logged in...
        if (message_data.command === "history") {
          // Create a clear History
          var history = {"group":{},"private":{}};
          // Fill History with new history
          for (var i = 0; i < message_data.data.length; i++) {
            // Store as a variable for easier access
            let current_msg = message_data.data[i];
            current_msg = await this.validateMessage(current_msg);
            if (current_msg.type === "channel") {
              if (!(current_msg.to in history.group)) {
                history["group"][current_msg.to] = [];
              }

              history["group"][current_msg.to].push(current_msg);
            } else if (current_msg.type === "private") {
              var dm_name = ((current_msg.to === this.state.currentUser) ? current_msg.from : current_msg.to);
              if (!(dm_name in history.private)) {
                history["private"][dm_name] = [];
              }

              history["private"][dm_name].push(current_msg);
            }
          }
          console.log(history);
          // Save history to state - updating all channels
          this.setState({'history': history});
        } else if (message_data.command === "message") {
            let history_now = this.state.history;
            let adding_msg = await this.validateMessage(message_data.data);

            if (adding_msg.type === "channel") {
              if (!(adding_msg.to in history_now.group)) {
                history_now["group"][adding_msg.to] = [];
              }

              history_now["group"][adding_msg.to].push(adding_msg);
            } else if (adding_msg.type === "private") {
              var pm_name = ((adding_msg.to === this.state.currentUser) ? adding_msg.from : adding_msg.to);
              if (!(pm_name in history_now.private)) {
                history_now["private"][pm_name] = [];
              }

              history_now["private"][pm_name].push(adding_msg);
            }
            console.log(history_now);
            // Save history to state - updating all channels
            this.setState({'history': history_now});
        }
        // Response to sending messages
      } else if ('success' in message_data) {
        // If it's successful - show success message
        if (message_data.success) {
          toast.success("Message sent successfully.");
        } else {
          if (message_data.error === "Message expired, you probably took too long to approve this message in Keychain! Please try again.") {
            toast.error("You took too long to sign that last message. Please sign a new one.");
            this.onWebsocketConnect();
          } else {
            // Otherwise spit out the error.
            toast.error("Error: " + message_data.error);
          }
        }
      }
    }
  }

  websocketSendMessage(msg) {
    this.chatWebSocket.sendMessage(msg);
  }

  onWebsocketConnect() {
    if (this.state.currentUser !== "") {
    var signed_challenge = JSON.stringify({
      "expires": Math.floor((new Date()).getTime() / 1000) + 120,
      "message": "Please sign me into dMessages",
    });
    try {
      window.hive_keychain.requestSignBuffer(this.state.currentUser,signed_challenge,"Posting",(keychain_response) => {
        if (keychain_response.success) {
          var challenge_login = JSON.stringify({
            "name": this.state.currentUser,
            "signature": keychain_response.result,
            "type": "login",
            "data": signed_challenge
          });

          this.chatWebSocket.sendMessage(challenge_login);
        } else {
          toast.error(keychain_response.message + ". Retrying in 5 seconds.");
          setTimeout(() => {
            this.onWebsocketConnect();
          }, 5000);
        }
      });
    } catch {
      this.setState({"wsConnectionAttempts": this.state.wsConnectionAttempts + 1});
      if (this.state.wsConnectionAttempts > 1) {
        toast.error("Keychain doesn't appear to be available. Retrying in 5 seconds.");
        setTimeout(() => {
            this.onWebsocketConnect();
        }, 5000);
      } else {
        setTimeout(() => {
            this.onWebsocketConnect();
        }, 1000);
      }
    }
  } else {
    // If we're not signed in, wait until we are and then log in
    setTimeout(() => {
      this.onWebsocketConnect();
    }, 3000);
  }
}

  // Render the entire app
  render() {
    return (
      <div className="App">
        <ToastContainer />
        <main>
          <Websocket ref={Websocket => {this.chatWebSocket = Websocket;}} url="wss://chat.websocket.ws:443" onMessage={this.websocketReceiveMessage.bind(this)} onClose={() => {toast.error("Disconnected, retrying."); this.setState({"wsIsOpen": false});}} onOpen={() => {toast.success("Connected!"); this.setState({"wsIsOpen": true}); this.onWebsocketConnect();}} />
          {this.renderLoginPanel()}
          {this.renderAddChannelDialog()}
          {this.renderChannelList()}
          {this.renderChannel()}
        </main>
        <script src="https://kit.fontawesome.com/e169a3044d.js" crossOrigin="anonymous"/>
      </div>
    );
  }
}

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

class LoginPanel extends React.Component {
  constructor(props) {
    super(props);

    // State - for holding values from inputs and other HTML elements
    this.state = {'loginAs': '', 'keychain': true};
  }
  
  startLoginChallenge(){
    // If user text not blank
    if (this.state.loginAs !== "") {      
      // Get challenge
      axios.get("https://api.dmessages.app/challenge.php", { params: { user: this.state.loginAs }}).then((response) => {
        if (response.data.success) {
          window.hive_keychain.requestVerifyKey(response.data.data.user,response.data.data.challenge, "Memo", (answer) => {
            if (answer.success) {
              let requestData = new FormData();
              requestData.set('user', response.data.data.user);
              requestData.set('answer', answer.result);
              axios({
                method: 'post',
                url: 'https://api.dmessages.app/challenge_solve.php',
                data: requestData
              }).then((response) => {
                if (response.data.success) {
                  toast.success("You're signed in!");
                  this.props.onSignIn(response.data.user);
                } else {
                  if (response.data.user === undefined) {
                    toast.error(response.data.error_message);
                  } else {
                    toast.success("You're signed in!");
                    this.props.onSignIn(response.data.user);
                    this.props.websocketGetHistory();
                  }
                }
              });
            } else {
              toast.error(answer.message);
            }
          });
        } else {
          if (response.data.user === undefined) {
            toast.error(response.data.error_message);
          } else {
            toast.success("You're signed in!");
            this.props.onSignIn(response.data.user);

            this.props.websocketGetHistory();
          }
        }
      });
    } else {
      toast.error("Please enter a username");
    }
  }

  getLoginFormContent() {
    setTimeout(() => {
      try {
        window.hive_keychain.requestHandshake(() => {
          this.setState({keychain: true});
        });
      } catch {
        this.setState({keychain: false});
      } // Catch in case Keychain isn't loaded/installed yet
    }, 500);
    if ((window.hive_keychain === null || window.hive_keychain === undefined) && this.state.keychain === false) {
      return (
        <span className="login-info">
          <h3>This app requires Hive Keychain</h3>
          <h4>Install it on:</h4>
          <div className="browsers">
            <a rel="nofollow" href="https://addons.mozilla.org/en-US/firefox/addon/hive-keychain">
              <img src={firefox_logo} alt="Firefox" />
            </a>
            <a rel="nofollow" href="https://chrome.google.com/webstore/detail/hive-keychain/jcacnejopjdphbnjgfaaobbfafkihpep">
              <img src={chrome_logo} alt="Chrome" />
            </a>
          </div>
          <p className="copyright-text">The Firefox logo is a trademark of the Mozilla Foundation in the U.S. and other countries. Google Chrome is a trademark of Google LLC</p>
        </span>
      );
    } else {
      return (
        <span className="login-info">
          <h5>Enter your username to login with Hive Keychain</h5>
          <div className="form-row">
            <input className="form-control col-sm-9" onChange={event => this.setState({loginAs: event.target.value.toLowerCase()})}  type="text" id="username" />
            <div className="col-sm-1"/>
            <button className="btn btn-primary col-sm-2" onClick={() => this.startLoginChallenge()}>Login!</button>
          </div>
        </span>
      );
    }
  }

  render () {
    if (this.props.signedInAs === "") {
      return (
        <div className="overlay">
          <div className="sm-modal">
            {this.getLoginFormContent()}
          </div>
        </div>
      );
    } else {
      // Get chat history
      //setTimeout(() => {
        //WebSocketSignIn(this.props.signedInAs,this.props.websocket);
      //},500);
      return "";
    }
  }
}

// List of channels (sidebar) containing <ChannelIcon />s
class ChannelList extends React.Component {
  // Update tooltips (for added channels) when the list changes
  componentDidUpdate() {
    ReactTooltip.rebuild();
  }

  // Render the channel list
  render() {
    // Work out if separators are needed
    let first_break = "";
    if (this.props.channels.private.length > 0) {
      first_break = <div className="hr"/>;
    }
    let second_break = "";
    if (this.props.channels.group.length > 0) {
      second_break = <div className="hr"/>;
    }

    return (
      <div id="channel-bar">
        {this.props.channels.private.map((item) => (<ChannelIcon key={item} showRemoveIcon={this.props.showRemoveIcon} removeChannel={()=>this.props.removeChannel(item)} onClick={() => this.props.onChannelClick(item)} user={item}/>))}
        {first_break}
        {this.props.channels.group.map((item) => (<ChannelIcon key={item.name} name={item.name} onClick={() => this.props.onChannelClick(item.name, false)} removeChannel={()=>this.props.removeChannel(item.name, false)} showRemoveIcon={this.props.showRemoveIcon} avatar={item.avatar}/>))}
        {second_break}
        <div className="command-icon" onClick={this.props.addChannelsDialog} data-tip="Add">+</div>
        <div className="command-icon" onClick={this.props.removeChannelsDialog} data-tip="Remove">-</div>
        <ReactTooltip effect="solid" place="right" backgroundColor="#000" />
      </div>
    );
  }
}

function ChannelIcon(props) {
  let channel_name = "";
  let avatar_name = "";
  if (!props.avatar) {
    channel_name = props.user;
    avatar_name = props.user;
  } else {
    channel_name = props.name;
    avatar_name = props.avatar;
  }
  return (
    <div onClick={props.onClick} className={"channel-icon" + (props.showRemoveIcon ? " show-delete" : "")}
         style={{backgroundImage: `url( "https://images.hive.blog/u/${avatar_name}/avatar")`}} data-tip={channel_name}><div onClick={props.removeChannel} className="delete-channel">&times;</div></div>
  );
}

export default DMessages;