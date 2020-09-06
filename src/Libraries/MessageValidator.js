import crypto from "crypto";
import {Client, cryptoUtils, Signature} from "@hiveio/dhive/lib/index-browser";
import store from "store/dist/store.modern";

// Hive Blockchain Client for Getting Keys
let hiveClient = new Client(["https://api.hive.blog", "https://api.hivekings.com", "https://anyx.io", "https://api.openhive.network"]);
// Get cache or load default
let authorisedCache = store.get('authorisedCache') || {"messages": [], "keys": {}};

function testDataValidity(message, message_data) {
    let [msg_successful_match, msg_failure_reason] = message_data;
    try {
        // Try to parse the data that was included
        let parsed_signed_data = JSON.parse(message.signed_data);

        // If the "to" field is not equal
        (parsed_signed_data.to !== message.to) && ([msg_successful_match, msg_failure_reason] = [false, "Message to field is not the same as the signed message."]);

        // Content doesn't match
        (parsed_signed_data.content !== message.content) && ([msg_successful_match, msg_failure_reason] = [false, "Message content doesn't match what was signed."]);

        // Expired
        (parsed_signed_data.expires < message.timestamp) && ([msg_successful_match, msg_failure_reason] = [false, "This signature has expired before the server received it."])
    } catch {
        [msg_successful_match, msg_failure_reason] = [false, "This message is missing required fields and has an invalid signature"];
    }

    return [msg_successful_match, msg_failure_reason];
}

function updateMessage(message, message_data) {
    let [msg_successful_match, msg_failure_reason, message_hash, posting_key] = message_data;
    if (msg_successful_match) {
        message.checked = "signed";
        // Add hash to hashes list, to save time in future runs
        authorisedCache.messages.push(message_hash);
        if (posting_key !== "") {authorisedCache.keys[message.from] = posting_key;}
        store.set('authorisedCache', authorisedCache);
        message.checked = "signed";
        message.checked_message = "This message was signed with a valid key and all fields match.";
        return message;
    } else {
        message.checked = "fake";
        message.checked_message = msg_failure_reason;
        return message;
    }
}

async function verifyByHive(message, message_data) {
    let [msg_successful_match, msg_failure_reason, posting_key] = message_data;
    try {
        // Get from the blockchain
        const [account] = await hiveClient.database.getAccounts([message.from]);

        posting_key = account.posting.key_auths[0][0] || "";

        // Recover public key from message
        let recovered_public_key = Signature.fromString(message.signature).recover(cryptoUtils.sha256(message.signed_data));

        // Check they match
        msg_successful_match = (posting_key === recovered_public_key.toString());
    } catch {
        msg_failure_reason = "This message was not signed or was signed with a bad signature!";
    }

    return [msg_successful_match, msg_failure_reason, posting_key];
}

async function validateMessage(message) {
    let msg_successful_match = false;
    let msg_failure_reason = "", posting_key = "";
    let message_hash = crypto.createHash('sha256').update(JSON.stringify(message)).digest("hex");

    // Check if we've already verified it
    if (authorisedCache.messages.includes(message_hash)) {
        msg_successful_match = true;
    } else {
        // Try and recover the key (catch in case the signature isn't a real signature)
        try {
            // If the recovered key equals the key the user has
            msg_successful_match = (authorisedCache.keys[message.from] || "") === (Signature.fromString(message.signature).recover(cryptoUtils.sha256(message.signed_data))).toString();
        } catch {/* Silent fail, could be an old key */}


        // Go to Hive to check for updated keys
        (!msg_successful_match) && ([msg_successful_match, msg_failure_reason, posting_key] = await verifyByHive(message, [msg_successful_match, msg_failure_reason, posting_key]));

        [msg_successful_match, msg_failure_reason] = testDataValidity(message, [msg_successful_match, msg_failure_reason]);
    }

    // Update message
    return updateMessage(message,[msg_successful_match, msg_failure_reason, message_hash, posting_key]);
}

export default validateMessage;