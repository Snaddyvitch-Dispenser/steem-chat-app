import React from "react";
import ReactTooltip from "react-tooltip";
import ChannelIcon from "./ChannelIcon";

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

export default ChannelList;