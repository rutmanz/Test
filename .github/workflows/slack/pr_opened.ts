const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const github = JSON.parse(process.env.GITHUB_DATA ?? "{}")
// const github =

if (!webhookUrl) {
  console.error("SLACK_WEBHOOK_URL is required");
  process.exit(1);
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log(JSON.stringify(github))


const payload = {
  "text": `PR #${ github.event.number } ${github.event.action} by ${ github.event.sender }: ${ github.event.pull_request.title }"`,
  "blocks": [
    {
      "type": "container",
      "icon": {
        "type": "image",
        "image_url": github.event.sender.avatar_url,
        "alt_text": "Profile Picture"
      },
      "title": {
        "type": "mrkdwn",
        "text": `**#${ github.event.number }** ${github.event.pull_request.title}`,
        "verbatim": false
      },
      "subtitle": {
        "type": "mrkdwn",
        "text": `${ capitalize(github.event.pull_request.merged ? 'merged' : github.event.action) } by ${ github.event.pull_request.user.login }`,
        "verbatim": false
      },
      "body": {
        "type": "mrkdwn",
        "text": `${ github.event.pull_request.body }`,
        "verbatim": false
      },
      "actions": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Open",
            "emoji": true
          },
          "url": github.event.pull_request.url
        }
      ]
    }
  ]
}

fetch(webhookUrl, {
  method: 'POST',
  body: JSON.stringify(payload),
  headers: {
    'Content-Type': 'application/json'
  }
}).then((res) => console.log("Slack notification sent", res))