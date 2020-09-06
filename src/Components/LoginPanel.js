import React from "react";
import {toast} from "react-toastify";
import firefox_logo from "../firefox.svg";
import chrome_logo from "../chrome.svg";

class LoginPanel extends React.Component {
    constructor(props) {
        super(props);

        // State - for holding values from inputs and other HTML elements
        this.state = {'loginAs': '', 'keychain': true};
    }

    startLoginChallenge(){
        // If user text not blank
        if (this.state.loginAs !== "") {
            this.props.websocketGetHistory(this.state.loginAs);
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
            return "";
        }
    }
}

export default LoginPanel;