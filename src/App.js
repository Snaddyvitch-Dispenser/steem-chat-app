import React from 'react';
import ReactTooltip from 'react-tooltip'
import './App.scss';
const store = require('store/dist/store.modern');

// Entire App
class SteeMessages extends React.Component {
  constructor(props) {
    super(props);

    // State - for holding values from inputs and other HTML elements
    this.state = {'pmAddUsername': 'null', 'showAddChannels': false};

    // Check if channels are stored in browser
    if (store.get('channels')) {
      // Load channel list from browser
      this.channel_list = store.get('channels');

      // Remove any empty named private message channels (bug due to localstorage used to store channels)
      this.removeChannel("");
    } else {
      // Start new empty channel list
      this.channel_list = {"group": [], "private": []};
    }
  }

  // Toggle add channels box
  toggleAddChannels() {
    console.log("add channels toggled.");
    this.setState({'showAddChannels': !this.state.showAddChannels});
  }
  
  // Show remove channels overlay, allowing users to click to delete channels.
  toggleRemoveChannels() {

  }

  // Add a channel to a user's channel list
  addChannel(name, isPrivateMessage=true, avatar="") {
    if (isPrivateMessage) {
      if ((this.channel_list.private.indexOf(name) === -1)) {
        this.channel_list.private.push(name);
      }
    } else {
      if ((this.channel_list.group.filter(value=> value["name"] === name).length === 0)) {
        this.channel_list.group.push({"name": name, "avatar": avatar});
      }
    }
    store.set('channels', this.channel_list);
  }

  // Remove a channel from a user's channel list
  removeChannel(name, isPrivateMessage=true) {
    if (isPrivateMessage) {
      for( var i = 0; i < this.channel_list.private.length; i++){ if ( this.channel_list.private[i] === name) { this.channel_list.private.splice(i, 1); i--; }}
    } else {
      for( var z = 0; z < this.channel_list.group.length; z++){ if ( this.channel_list.group[z]["name"] === name) { this.channel_list.group.splice(z, 1); i--; }}
    }
    store.set('channels', this.channel_list);
  }

  // Pass required functions down to ChannelList, and return the result for use in the app
  renderChannelList() {
    return (
      <ChannelList add_channels={() => this.toggleAddChannels()} remove_channels={() => this.toggleRemoveChannels()} channels={this.channel_list} />
    );
  }


  // Render the entire app
  render() {
    return (
      <div className="App">
        <main>
          <div id="add-channels-overlay" className={"overlay" + (this.state.showAddChannels ? "" : " hidden")}>
            <div id="add-channels" className="sm-modal">
              <h4>Add Channel</h4>
              <div className="row">
                <div className="col col-offset-2">
                  <div>
                    <h5>Group Chat</h5>
                    <p>Start a chat in a public group.</p>
                  </div>
                </div>
                <div className="col col-offset-2">
                  <div>
                    <h5>Private Message</h5>
                    <p>Send a private message to another user.</p>
                    <div className="input-with-icon">
                      <div className="input-icon" id="person-avatar-dm" style={{backgroundImage: `url( "https://steemitimages.com/u/${this.state.pmAddUsername}/avatar")`}} alt="null"></div>
                      <input type="text" id="private_message_username" onChange={event => this.setState({pmAddUsername: event.target.value.toLowerCase()})} maxLength="16" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {this.renderChannelList()}
        </main>
        <ReactTooltip effect="solid" place="right" backgroundColor="#000" />
      </div>
    );
  }
}



// List of channels (sidebar) containing <ChannelIcon />s
function ChannelList(props) {
  let first_break = "";
  if (props.channels.private.length > 0) {
    first_break = <div className="hr"></div>;
  }
  let second_break = "";
  if (props.channels.group.length > 0) {
    second_break = <div className="hr"></div>;
  }

  return (
    <div id="channel-bar">
      {props.channels.private.map((item) => (<ChannelIcon key={item} user={item}/>))}
      {first_break}
      {props.channels.group.map((item) => (<ChannelIcon key={item.name} name={item.name} avatar={item.avatar}/>))}
      {second_break}
      <div className="channel-icon" onClick={props.add_channels} data-tip="Add">+</div>
      <div className="channel-icon" onClick={props.remove_channels} data-tip="Remove"><em className="fas fa-wrench"></em></div>
    </div>
  );
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
    <div className="channel-icon show-delete" style={{backgroundImage: `url( "https://steemitimages.com/u/${avatar_name}/avatar")`}} alt={channel_name} data-tip={channel_name}><div className="delete-channel">&times;</div></div>
  );
}

export default SteeMessages;