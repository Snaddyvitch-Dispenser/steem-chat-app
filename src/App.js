import React from 'react';
import ReactTooltip from 'react-tooltip'
import './App.scss';
const firefox_logo = require('./firefox.svg');
const chrome_logo = require('./chrome.svg');
const store = require('store/dist/store.modern');
const axios = require("axios");

// Allow requests to api.dmessages.app to set cookies.
axios.defaults.withCredentials = true;

// Entire App
class SteeMessages extends React.Component {
  constructor(props) {
    super(props);

    // State - for holding values from inputs and other HTML elements
    this.state = {'pmAddUsername': '', 'showAddChannels': false, 'channelAddName': '', 'showRemoveChannels': false, 'channelList': {"group": [], "private": []}};

    // Check if channels are stored in browser
    if (store.get('channels')) {
      // Load channel list from browser
      this.state.channelList = store.get('channels');
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

  // Pass required functions down to ChannelList, and return the result for use in the app
  renderChannelList() {
    return (
      <ChannelList showRemoveIcon={this.state.showRemoveChannels} addChannelsDialog={() => this.toggleAddChannels()} removeChannelsDialog={() => this.toggleRemoveChannels()} removeChannel={(name, isPrivateMessage) => this.removeChannel(name, isPrivateMessage)} channels={this.state.channelList} />
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
                    <div className="input-icon" id="person-avatar-dm" style={{backgroundImage: `url( "https://steemitimages.com/u/${this.state.pmAddUsername}/avatar")`}} alt="null"></div>
                    <input type="text" value={this.state.pmAddUsername} id="private_message_username" onChange={event => this.setState({pmAddUsername: event.target.value.toLowerCase()})} maxLength="16" />
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

  // Render the entire app
  render() {
    return (
      <div className="App">
        <main>
          <LoginPanel signedInAs="" />
          {this.renderAddChannelDialog()}
          {this.renderChannelList()}
          <Channel />
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
          <p><em className="fas fa-at"></em> CADawg</p>
        </div>
        <div className="channel-content">

        </div>
        <div className="channel-send">
          <input type="text" className="message-text" />
          <button className="message-send-button"><em className="far fa-paper-plane"></em></button>
        </div>
      </div>
    );
  }
}

class LoginPanel extends React.Component {
  constructor(props) {
    super(props);

    // State - for holding values from inputs and other HTML elements
    this.state = {'loginAs': ''};
  }
  
  startLoginChallenge(){
    // If user text not blank
    if (this.state.loginAs !== "") {
      // Get challenge
      axios.get("https://api.dmessages.app/challenge.php", { params: { user: this.state.loginAs }}).then((response) => {
        if (response.data.success) {
          console.log(response.data);
          window.hive_keychain.requestVerifyKey(response.data.user, response.data.challenge, "Memo", (data) => {
	console.log(data);
});
        } else {
          console.log(response.data.error_message);
        }
      });
    } else {

    }
  }

  getLoginFormContent() {
    if (window.hive_keychain !== null || window.hive_keychain !== undefined) {
      return (
        <span className="login-info">
          <h5>Enter your username to login</h5>
          <input onChange={event => this.setState({loginAs: event.target.value.toLowerCase()})}  type="text" id="username" />
          <button onClick={event => this.startLoginChallenge()}>Login!</button>
        </span>
      );
    } else {
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
          <p class="copyright-text">The Firefox logo is a trademark of the Mozilla Foundation in the U.S. and other countries. Google Chrome is a trademark of Google LLC</p>
          <p></p>
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
        {this.props.channels.private.map((item) => (<ChannelIcon key={item} showRemoveIcon={this.props.showRemoveIcon} removeChannel={()=>this.props.removeChannel(item)} user={item}/>))}
        {first_break}
        {this.props.channels.group.map((item) => (<ChannelIcon key={item.name} name={item.name} removeChannel={()=>this.props.removeChannel(item.name, false)} showRemoveIcon={this.props.showRemoveIcon} avatar={item.avatar}/>))}
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
    <div className={"channel-icon" + (props.showRemoveIcon ? " show-delete" : "")}
    style={{backgroundImage: `url( "https://images.hive.blog/u/${avatar_name}/avatar")`}} alt={channel_name} data-tip={channel_name}><div onClick={props.removeChannel} className="delete-channel">&times;</div></div>
  );
}

export default SteeMessages;