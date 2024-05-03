import React from 'react';
import './App.scss';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Websocket from 'react-websocket';
import store from 'store/dist/store.modern';
import crypto from 'crypto';
import hive from '@hiveio/hive-js';
import ChannelList from "./Components/ChannelList";
import LoginPanel from "./Components/LoginPanel";
import Channel from "./Components/Channel";
import {CUSTOM_JSON_IDENTIFIER} from "./config";
import validateMessage from "./Libraries/MessageValidator";

// Entire App
class DMessages extends React.Component {
  constructor(props) {
    super(props);

    // State - for holding values from inputs and other HTML elements
    this.state = {'pmAddUsername': '', 'showAddChannels': false, 'channelAddName': '', 'loginUser': '', 'showRemoveChannels': false, 'channelList': {"group":[{"name":"general","avatar":"dmessages"}],"private":[]}, 'currentUser': '', "currentChannel": {"name": "general", "isPrivateMessage": false}, "wsConnectionAttempts": 0, "wsIsOpen": false, 'history': {"group":{},"private":{}}};

    // Check if channels are stored in browser
    if (store.get('channels')) {
      // Load channel list from browser
      this.state.channelList = store.get('channels');
    }

    // Load user from storage if saved
    this.state.currentUser = store.get('user') || '';

    if (store.get('currentChannel')) {
      this.state.currentChannel = store.get('currentChannel');
    }

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
    this.setState((prevState) => {
      return {showAddChannels: !prevState.showAddChannels};
    });
  }
  
  // Show remove channels overlay, allowing users to click to delete channels.
  toggleRemoveChannels() {
    this.setState((prevState) => {
      return {showRemoveChannels: !prevState.showRemoveChannels};
    });
  }

  // Add a channel to a user's channel list
  addChannel(name, isPrivateMessage=true, avatar="") {
    this.setState((prevState) => {
      let channels = prevState.channelList;

      if (isPrivateMessage) {
        if ((channels.private.indexOf(name) === -1)) {
          channels.private.push(name);
        }
      } else {
        if ((channels.group.filter(value=> value["name"] === name).length === 0)) {
          channels.group.push({"name": name, "avatar": avatar});
        }
      }

      store.set('channels', channels);
      return {channelList: channels};
    });
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
                    <div className="input-icon" id="person-avatar-dm" style={{backgroundImage: `url( "https://steemitimages.com/u/${this.state.pmAddUsername}/avatar")`}}/>
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
    return (<LoginPanel websocketGetHistory={user => this.onWebsocketConnect(user)} signedInAs={this.state.currentUser} onSignIn={(user) => {this.userSignedIn(user)}} />);
  }

  renderChannel() {
    return (<Channel userSignedIn={this.state.currentUser} websocketOpen={this.state.wsIsOpen} websocketSend={(message) => this.websocketSendMessage(message)} currentChannel={this.state.currentChannel} messageHistory={this.state.history} signOut={() => this.signUserOut()} />);
  }

  signUserOut() {
    this.setState({"currentUser": ""});
    store.set('user', "");
  }

  async validateMessage(message) {
    return await validateMessage(message);
  }

  handleMessage(history, message) {
    if (message.type === "channel") {
      if (!(message.to in history.group)) {
        history["group"][message.to] = [];
      }

      history["group"][message.to].push(message);
    } else if (message.type === "private") {
      let dm_name = ((message.to === this.state.currentUser) ? message.from : message.to);
      if (!(dm_name in history.private)) {
        history["private"][dm_name] = [];
      }

      history["private"][dm_name].push(message);
    }

    return history;
  }

  messageDidSend(message_data) {
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

  async websocketReceiveMessage(data) {
    let message_data = false;
    try {
      /**
       * Parse the JSON data
       * @type {{command: string, data: {from: string, to: string, message: string, type: string, timestamp: number}}|false}
       */
      message_data = JSON.parse(data);
    } catch {
      // In the unlikely event of packet drops .etc. ignore it
    }

    if (message_data !== false) {
      // commanded message
      if (message_data && typeof message_data === 'object' && message_data !== null && Object.hasOwn(message_data, 'command')) {
        // Contains history from before we were logged in...
        if (message_data.command === "history") {
          if (this.state.loginUser !== '') {this.userSignedIn(this.state.loginUser); this.setState({loginUser: ''})}

          // Create a clear History
          let history = {"group":{},"private":{}};

          // Loop through messages
          for (let i = 0; i < message_data.data.length; i++) {
            // Add message to history.
            history = this.handleMessage(history, await this.validateMessage(message_data.data[i]));
          }

          // Save history to state - updating all channels
          this.setState({'history': history});
        } else if (message_data.command === "message") {
            // Get current History
            let history_now = this.state.history;

            // Process message
            history_now = this.handleMessage(history_now, await this.validateMessage(message_data.data));

            // Save history to state - updating all channels
            this.setState({'history': history_now});
        }
        // Response to sending messages
      } else if (message_data && typeof message_data === 'object' && message_data !== null && Object.hasOwn(message_data, 'success')) {
        this.messageDidSend(message_data);
      }
    }
  }

  websocketSendMessage(msg) {
    this.chatWebSocket.sendMessage(msg);
  }

  onWebsocketConnect(user) {
    user = user || this.state.currentUser;

    this.setState({loginUser: user});

    if (user !== "") {
    let signed_challenge = JSON.stringify({
      "expires": Math.floor((new Date()).getTime() / 1000) + 120, // expires in 120 seconds (must be sent to server within 2 mins)
      "message": "Please sign me into dMessages",
    });
    try {
      window.hive_keychain.requestSignBuffer(user,signed_challenge,"Posting",(keychain_response) => {
        if (keychain_response.success) {
          let challenge_login = JSON.stringify({
            "name": user,
            "signature": keychain_response.result,
            "type": "login",
            "data": signed_challenge
          });

          this.chatWebSocket.sendMessage(challenge_login);
        } else {
          toast.error(keychain_response.message + ". Retrying in 5 seconds.");
          setTimeout(() => {
            this.onWebsocketConnect(user);
          }, 5000);
        }
      });
    } catch {
      this.setState((prevState) => {
        return {"wsConnectionAttempts": prevState.wsConnectionAttempts + 1};
      });
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
    // noinspection JSUnresolvedLibraryURL
    return (
      <div className="App">
        <ToastContainer />
        <main>
          <Websocket ref={Websocket => {this.chatWebSocket = Websocket;}} url="wss://chat.websocket.ws" onMessage={this.websocketReceiveMessage.bind(this)} onClose={() => {toast.error("Disconnected, retrying."); this.setState({"wsIsOpen": false});}} onOpen={() => {toast.success("Connected!"); this.setState({"wsIsOpen": true}); this.onWebsocketConnect();}} />
          {this.renderLoginPanel()}
          {this.renderAddChannelDialog()}
          {this.renderChannelList()}
          {this.renderChannel()}
        </main>
      </div>
    );
  }
}

export default DMessages;