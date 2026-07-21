const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const github = JSON.parse(process.env.GITHUB_DATA ?? "{}")

if (!webhookUrl) {
  console.error("SLACK_WEBHOOK_URL is required");
  process.exit(1);
}



const payload = {
  "text": `PR #${ github.event.number } ${github.event.action} by ${ github.event.sender }: ${ github.event.pull_request.title }"`,
  "blocks": [
    {
      "type": "card",
      "slack_icon": {
        "type": "icon",
        "name": "lightbulb"
      },
      "title": {
        "type": "mrkdwn",
        "text": `#${ github.event.number } ${github.event.pull_request.title}`,
        "verbatim": false
      },
      "subtitle": {
        "type": "mrkdwn",
        "text": `${ github.event.pull_request.merged ? 'merged' : github.event.action } by ${ github.event.pull_request.user.login }`,
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