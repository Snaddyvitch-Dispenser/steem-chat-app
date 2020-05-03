import React from 'react';
import ReactTooltip from 'react-tooltip'
import './App.scss';
import { ToastContainer, toast } from 'react-toastify'
import firefox_logo from './firefox.svg'
import chrome_logo from './chrome.svg'
import 'react-toastify/dist/ReactToastify.css';
import Websocket from 'react-websocket';
const store = require('store/dist/store.modern');
const axios = require("axios");

// Allow requests to api.dmessages.app to set cookies.
axios.defaults.withCredentials = true;

// Entire App
class SteeMessages extends React.Component {
  constructor(props) {
    super(props);

    // State - for holding values from inputs and other HTML elements
    this.state = {'pmAddUsername': '', 'showAddChannels': false, 'channelAddName': '', 'showRemoveChannels': false, 'channelList': {"group": [], "private": []}, 'currentUser': '', "currentChannel": {"name": "", "isPrivateMessage": true}};

    // Check if channels are stored in browser
    if (store.get('channels')) {
      // Load channel list from browser
      this.state.channelList = store.get('channels');
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
    var channels = this.state.channelList;
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
    store.set('channels', this.state.channelList);
  }

  onChannelClick(channel, isPrivateMessage=true){
    this.setState({currentChannel: {"name": channel, "isPrivateMessage": isPrivateMessage}});
    store.set('currentChannel', this.state.currentChannel);
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
            <button className="close-button" onClick={event => this.setState({showAddChannels: false})}>&times;</button>
            <h4>Add Channel</h4>
            <div className="row">
              <div className="col col-offset-2">
                <div>
                  <h5>Group Chat</h5>
                  <p>Start a chat in a public group.</p>
                  <div className="input-with-icon">
                    <div className="input-icon" id="person-avatar-dm" style={{backgroundImage: `url( "https://steemitimages.com/u/dmessages/avatar")`}} alt="null"></div>
                    <input type="text" id="private_message_username" value={this.state.channelAddName} onChange={event => this.setState({channelAddName: event.target.value.toLowerCase()})} maxLength="16" />
                    <button className="input-action" onClick={event => {if(this.state.channelAddName !== "") {this.addChannel(this.state.channelAddName,false,"dmessages"); this.setState({showAddChannels: false, channelAddName: ""})}}}>+</button>
                  </div>
                </div>
              </div>
              <div className="col col-offset-2">
                <div>
                  <h5>Private Message</h5>
                  <p>Send a private message to another user.</p>
                  <div className="input-with-icon">
                    <div maxLength="100" className="input-icon" id="person-avatar-dm" style={{backgroundImage: `url( "https://steemitimages.com/u/${this.state.pmAddUsername}/avatar")`}} alt="null"></div>
                    <input type="text" value={this.state.pmAddUsername} id="private_message_username" onChange={event => this.setState({pmAddUsername: event.target.value.toLowerCase()})} maxLength="32" />
                    <button className="input-action" onClick={event => {if(this.state.pmAddUsername !== "" && this.state.pmAddUsername !== "null") {this.addChannel(this.state.pmAddUsername); this.setState({showAddChannels: false, pmAddUsername: ""})}}}>+</button>
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
    return (<LoginPanel signedInAs={this.state.currentUser} onSignIn={(user) => {this.userSignedIn(user)}} />);
  }

  renderChannel() {
    return (<Channel userSignedIn={this.state.currentUser} currentChannel={this.state.currentChannel} />);
  }

  websocketRecieveMessage(data) {

  }

  // Render the entire app
  render() {
    return (
      <div className="App">
        <ToastContainer />
        <main>
          <Websocket url="ws://localhost" onMessage={this.websocketRecieveMessage.bind(this)} onClose={() => toast.error("Disconnected, retrying.")} onOpen={() => toast.success("Connected!")} />
          {this.renderLoginPanel()}
          {this.renderAddChannelDialog()}
          {this.renderChannelList()}
          {this.renderChannel()}
        </main>
        <script src="https://kit.fontawesome.com/e169a3044d.js" crossorigin="anonymous"></script>
      </div>
    );
  }
}

class Channel extends React.Component {
  render() {
    return (
      <div className="channel">
        <div className="channel-info">
          <p><em className={"fas fa-" + (this.props.currentChannel.isPrivateMessage ? "at" : "hashtag")}></em> {this.props.currentChannel.name}</p>
        </div>
        <div className="channel-content">

        </div>
        <div className="channel-send row">
          <input type="text" className="message-text col-sm-11" />
          <div className="channel-buttons col-sm-1">
            <button className="message-button message-send-button btn"><em className="far fa-paper-plane"></em></button>
            <button className="message-button message-add-button btn">+</button>
            <button className="message-button message-user-button btn" style={{backgroundImage: `url( "https://images.hive.blog/u/${this.props.userSignedIn}/avatar")`}}></button>
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
                  toast.success("You're signed in!")
                  this.props.onSignIn(response.data.user);
                } else {
                  if (response.data.user === undefined) {
                    toast.error(response.data.error_message);
                  } else {
                    toast.success("You're signed in!")
                    this.props.onSignIn(response.data.user);
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
          <p></p>
        </span>
      );
    } else {
      return (
        <span className="login-info">
          <h5>Enter your username to login with Hive Keychain</h5>
          <div className="form-row">
            <input className="form-control col-sm-9" onChange={event => this.setState({loginAs: event.target.value.toLowerCase()})}  type="text" id="username" />
            <div className="col-sm-1"></div>
            <button className="btn btn-primary col-sm-2" onClick={event => this.startLoginChallenge()}>Login!</button>
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
      first_break = <div className="hr"></div>;
    }
    let second_break = "";
    if (this.props.channels.group.length > 0) {
      second_break = <div className="hr"></div>;
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
    style={{backgroundImage: `url( "https://images.hive.blog/u/${avatar_name}/avatar")`}} alt={channel_name} data-tip={channel_name}><div onClick={props.removeChannel} className="delete-channel">&times;</div></div>
  );
}

export default SteeMessages;