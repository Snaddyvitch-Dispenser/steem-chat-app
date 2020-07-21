import React from "react";

function ChannelIcon(props) {
    let channel_name;
    let avatar_name;
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

export default ChannelIcon;