"use strict";
const slack = require("slack");
const token = "dummytoken";
const database = require("./firebase.js").database;

exports.seeMember = (req, res) => {
  const action = req.body.result.action;
  const visitee = req.body.result.parameters.visitee;
  const visitor = req.body.result.parameters.visitor;
  const reason = req.body.result.parameters.reason;
  const sessionId = req.body.sessionId;

  const channelId = "C8CJ1CZGU";

  logSession();
  if (action === "input.checkForSlackUser") {
    checkForSlackUser(visitee, visitor);
  }

  if (action === "input.selectCorrectPerson") {
    selectCorrectPerson();
  }

  function checkForSlackUser(visitee, visitor) {
    const responseToVisitor = `Okay ${visitor}, i'll let ${visitee} know you're here. Got time for a joke while you wait?`;

    slack.users.list({ token }).then(obj => {
      const results = obj.members.filter(
        user => user.profile["first_name"] === visitee
      );

      if (results.length === 1) {
        let user, messageToVisitee;
        messageToVisitee = messageCreator(
          reason,
          `<@${results[0].id}>`,
          visitor
        );

        messageSlackUser(token, messageToVisitee, responseToVisitor);
      } else if (results.length > 1) {
        let fullNamesSentence, response;

        fullNamesSentence = results
          .map(result => visitee.concat(" ", result.profile["last_name"]))
          .join(" or ");
        response = `Were you after ${fullNamesSentence}?`;

        res.setHeader("Content-Type", "application/json");
        res.send(JSON.stringify({ speech: response, displayText: response }));
      } else {
        let messageToVisitee = messageCreator(reason, visitee, visitor, false);
        messageSlackUser(token, messageToVisitee, responseToVisitor);
      }
    });
  }

  function selectCorrectPerson() {
    let user, messageToVisitee, responseToVisitor, results;
    let lastName = req.body.result.parameters["last-name"];
    let givenName = req.body.result.parameters["given-name"];
    let fullName = `${givenName} ${lastName}`;

    responseToVisitor = `Okay ${visitor}, i'll let ${fullName}
    know you're here. Got time for a joke while you wait?`;

    slack.users.list({ token }).then(obj => {
      results = obj.members.filter(
        user => user.profile["real_name"] === fullName
      );

      if (results.length === 0) {
        messageToVisitee = messageCreator(reason, fullName, visitor, false);
        messageSlackUser(token, messageToVisitee, responseToVisitor);
      } else {
        messageToVisitee = messageCreator(
          reason,
          `<@${results[0].id}>`,
          visitor
        );
        messageSlackUser(token, messageToVisitee, responseToVisitor);
      }
    });
  }

  function messageSlackUser(token, text, response) {
    slack.chat
      .postMessage({ token, channel: channelId, text })
      .then(dmSent => {
        res.setHeader("Content-Type", "application/json");
        res.send(
          JSON.stringify({
            speech: response,
            displayText: response
          })
        );
        logSession("messaged user on Slack");
      })
      .catch(err => console.log(err));
  }

  function messageCreator(reason, visitee, visitor, foundUser = true) {
    let message = "";
    if (foundUser) {
      switch (reason.toLowerCase()) {
        case "delivery":
          message = `Hi ${visitee}, there is a delivery for you at reception, left by ${visitor}.`;
          break;
        case "lunch":
          message = `Got room for a bite? ${visitee} ${visitor} is at reception to have lunch with you.`;
          break;
        case "meeting":
          message = `Hello ${visitee}, ${visitor} is at reception ready for the meeting.`;
          break;
        default:
          message = `Hi ${visitee}, ${visitor} is at reception to see you`;
      }
    } else {
      switch (reason.toLowerCase()) {
        case "delivery":
          message = `Hi <!channel>, there is a delivery for ${visitee} at reception, left by ${visitor}.`;
          break;
        case "lunch":
          message = `Hi <!channel>, ${visitor} is at reception awaiting lunch with ${visitee}`;
          break;
        case "meeting":
          message = `Hello <!channel>, ${visitor}, is at reception for a meeting with ${visitee}`;
          break;
        default:
          message = `Hi <!channel>, ${visitor} is at reception to see ${visitee}`;
      }
    }
    return message;
  }
};
