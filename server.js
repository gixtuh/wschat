/*

  WSChat OFFICIAL Server code v1.8.2
  Required files:
    bannedips.json
    ch.json
    chatlogs.json
    rh.json

*/


const WebSocket = new require("ws");
const fs = new require("fs");
const crypto = new require("crypto");
const ws = new WebSocket.Server({ host: "0.0.0.0", port: 8080 });
const bannednames = [];
let bannedips = [];
var usercount = 0;
var users = [];
var lastMessageTime = {};
let connectionhistory = [];
let reporthistory = [];
let chatlogs = [];

function writech() {
  fs.writeFile(
    "ch.json",
    JSON.stringify(connectionhistory, null, 2),
    "utf8",
    (e) => {
      if (e) {
        console.error(`Failure writing connection history(ch.json): ${e}`);
      } else {
        fs.readFile("ch.json", "utf8", (e, d) => {
          if (e) {
            console.error(`Error reading file: ${e}`);
          }
        });
      }
    }
  );
}
function writerh() {
  fs.writeFile(
    "rh.json",
    JSON.stringify(reporthistory, null, 2),
    "utf8",
    (e) => {
      if (e) {
        console.error(`Failure writing report history(rh.json): ${e}`);
      } else {
        fs.readFile("rh.json", "utf8", (e, d) => {
          if (e) {
            console.error(`Error reading file: ${e}`);
          }
        });
      }
    }
  );
}
function writecl() {
  fs.writeFile(
    "chatlogs.json",
    JSON.stringify(chatlogs, null, 2),
    "utf8",
    (e) => {
      if (e) {
        console.error(`Failure writing chatlogs(chatlogs.json): ${e}`);
      } else {
        fs.readFile("chatlogs.json", "utf8", (e, d) => {
          if (e) {
            console.error(`Error reading file: ${e}`);
          }
        });
      }
    }
  );
}
writech();
writerh();
writecl();

function broadcast(message) {
  ws.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function turntojson(room, message) {
  return `{"room":"${room}","message":"${message}"}`;
}

ws.on("connection", (client, request) => {
  const ip = crypto
    .createHash("sha256")
    .update(
      request.headers["x-forwarded-for"].split(", ")[0] ||
        request.connection.remoteAddress
    )
    .digest("hex");
  broadcast(
    turntojson("logging terminal", `clientConnectionOpen: ${client.protocol}`)
  );
  console.log(`Client ${client.protocol} joined. IP Hash: ${ip}`);
  usercount++;
  console.log(`Usercount: ${usercount}`);

  if (bannedips.some((bannedip) => bannedip.ip.includes(ip))) {
    const reason = bannedips.find((bannedip) => bannedip.ip.includes(ip)).reason
    client.close(
      1000,
      `You were banned.\n${reason}\nGo to tinyurl.com/wschatappeal to appeal.`
    );
    users.push(client.protocol);
    connectionhistory.push({ id: ip, protocol: client.protocol, banned: true});
    writech();
  } else if (client.protocol === "undefined" || client.protocol === "null") {
    client.close(1008, "Kicked out.\nYour username is empty.");
  } else if (bannednames.includes(client.protocol)) {
    client.close(
      1008,
      "Kicked out.\nYou're using a banned username.\nPlease select a different username."
    );
  } else if (
    users.some((user) => user.includes(client.protocol)) &&
    client.protocol !== ""
  ) {
    client.close(
      1008,
      "Kicked out.\nYour username has already been taken!\nPlease select a different username."
    );
  } else {
    client.send(turntojson("", "WSChat v1.8"));
    client.send(turntojson("", "$$>help for help"));
    client.send(
      turntojson("", "Recent update: v1.8 | Added the $$>id command.")
    );
    client.send(
      turntojson(
        "",
        'Previous update: v1.7 | Added reporting and scary ip bans'
      )
    );
    client.send(
      turntojson("", `Currently ${usercount} users active in all rooms`)
    );
    client.send(
      turntojson("", "----------------------------------------------")
    );
    if (client.protocol !== "") {
      users.push(client.protocol);
      connectionhistory.push({ id: ip, protocol: client.protocol, banned: false});
      writech();
    } else {
      console.log("guest joined");
      client.send(
        turntojson(
          "",
          "You are a guest. Go to https://gixtuh.vercel.app/wschat to use your username. and to use client-sided commands"
        )
      );
    }
    console.log(JSON.stringify(users));
  }

  client.on("message", (message) => {
    try {
      var parsed = JSON.parse(message.toString());
      const currentTime = Date.now();

      if (parsed.room !== "logging terminal") {
        if (parsed.message.includes("$$>userlist")) {
          client.send(turntojson(parsed.room, `${usercount} users active.`));
          client.send(turntojson(parsed.room, users.join(", ")));
        } else if (parsed.message.includes("$$>whoami")) {
          client.send(
            turntojson(parsed.room, parsed.message.split(":")[0].trim())
          );
          console.log(JSON.stringify(parsed.message.split(":")[0].trim()));
        } else if (parsed.message.includes("$$>id")) {
          client.send(
            turntojson(parsed.room, ip)
          );
        } else if (parsed.message.includes("$$>help")) {
          client.send(
            turntojson(parsed.room, `$$>userlist - Get the userlist`)
          );
          client.send(
            turntojson(parsed.room, `$$>whoami - Get the sender's username`)
          );
          client.send(
            turntojson(parsed.room, "$$>clear - Clear the chat (CLIENT SIDED)")
          );
          client.send(
            turntojson(parsed.room, `$$>id - Get your ID.`)
          )
        } else if (parsed.report === "user") {
          console.warn(
            `Client ${client.protocol} reported ${parsed.usertoreport}`
          );
          reporthistory.push({ protocol: client.protocol, type: "user", reporteduser: parsed.usertoreport});
          writerh();
        } else if (parsed.report === "livestream") {
          console.warn(
            `Client ${client.protocol} reported inappropriate activity in LIVESTREAM${parsed.roomtoreport}`
          );
          reporthistory.push({ protocol: client.protocol, type: "livestream", reportedroom: `LIVESTREAM${parsed.roomtoreport}`});
          writerh();
        } else {
          if (parsed.message !== "") {
            if (!bannedips.some((bannedip) => bannedip.ip.includes(ip))) {
              broadcast(message.toString());
            } else {
              client.close(1000, "You got banned. Refresh for more info.");
            }
            if (
              !lastMessageTime[client.protocol] ||
              currentTime - lastMessageTime[client.protocol] >= 200
            ) {
              if (parsed.message.length < 800) {
                console.log(
                  `message from ${client.protocol} in room ${parsed.room}\n${parsed.message}`
                );
                chatlogs.push({ id: ip, protocol: client.protocol, message: parsed.message, room: parsed.room });
                writecl();
                lastMessageTime[client.protocol] = currentTime;
              } else {
                console.log(
                  `message from ${client.protocol} in room ${parsed.room}\nMessage too long; kicking for spam`
                );
                client.close(1001, "Kicked out.\nYou are spamming.\nPlease refrain from spamming.\nLive streaming is deprecated.")
                lastMessageTime[client.protocol] = currentTime;
              }
            } else {
              client.close(1001, "Kicked out.\nYou are spamming.\nPlease refrain from spamming.\nLive streaming is deprecated.")
            }
          }
        }

        broadcast(
          turntojson(
            "logging terminal",
            `clientMessageSuccess: ${parsed.room} | ${parsed.message}`
          )
        );
      } else {
        broadcast(turntojson("logging terminal", "clientMessageFail"));
      }
    } catch (error) {
      broadcast(turntojson("logging terminal", "clientMessageFail"));
      console.log(`i wont let ${client.protocol} crash the server`);
      console.log(`predicted error: ${error}`);
      console.log(message.toString());
    }
  });

  client.on("close", (code, reason) => {
    broadcast(
      turntojson(
        "logging terminal",
        `clientConnectionClose: ${client.protocol}`
      )
    );
    usercount -= 1;
    console.log(`Client ${client.protocol} left | ${code}, ${reason}`);
    if (code !== 1008) {
      if (client.protocol !== "") {
        users = users.filter((user) => user !== client.protocol);
      } else {
        console.log(
          "not changing the userlist because the user was a GUEST!!11"
        );
      }
    } else {
      console.log(
        "not changing the userlist because it was POLICY VIOLATION!!11 aka the code 1008"
      );
    }
    console.log(JSON.stringify(users));
    console.log(`Usercount: ${usercount}`);
  });
});

// non websocket stuff

setInterval(() => {
  fs.readFile("bannedips.json", "utf8", (e, d) => {
    if (e) {
      console.log("Failed to read bannedips.json. Not syncing.");
    } else {
      bannedips = JSON.parse(d);
    }
  });
}, 2000);

console.log("Hosting");
