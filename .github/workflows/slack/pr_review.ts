const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const github = JSON.parse(process.env.GITHUB_DATA ?? "{}")

if (!webhookUrl) {
    console.error("SLACK_WEBHOOK_URL is required");
    process.exit(1);
}

function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log(JSON.stringify(github))

// Leaving a review with multiple comments causes the action to run for each comment;
// once with action "submitted", and the rest with "edited". Ignore edited and manually
// search for comments.
if (github.event.action === "edited") process.exit(0)

// States: changes_requested, approved, commented, dismissed, pending

let image_url;
switch (github.event.review.state) {
    case "approved":
        image_url = "https://github.com/synthesis-adsk/github-icons/blob/main/icons/check-green.png?raw=true"
        break
    case "changes_requested":
        image_url = "https://github.com/synthesis-adsk/github-icons/blob/main/icons/file-diff-red.png?raw=true"
        break
    case "commented":
    default:
        image_url = "https://github.com/synthesis-adsk/github-icons/blob/main/icons/comment-gray.png?raw=true"
        break
}

const payload = {
    "blocks": [
        {
            "type": "container",
            "width": "full",
            "title": {
                "type": "plain_text",
                "text": `#${github.event.pull_request.number} - ${github.event.review.state}`
            },
            "subtitle": {
                "type": "plain_text",
                "text": `${capitalize(github.event.review.state)} by ${github.actor}`
            },
            "icon": {
                "type": "image",
                "image_url": image_url,
                "alt_text": `Review ${github.event.review.state}`
            },
            "child_blocks": [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": `${github.event.review.body}`
                    },
                    "accessory": {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Visit",
                            "emoji": true
                        },
                        "url": github.event.review.html_url
                    }
                }
            ]
        }
    ]
}

const send = async () => {
    const res = await fetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json'
        }
    })

    console.log("Slack notification sent", await res.json())

    // get comments
    const repo_owner = github.repository_owner
    const repo_name = github.event.repository.name
    const pr_number = github.event.pull_request.number
    const review_id = github.event.review.id

    const url = `https://api.github.com/repos/${repo_owner}/${repo_name}/pulls/${pr_number}/reviews/${review_id}/comments?per_page=100`
    const res2 = await fetch(
        url,
        {
            headers: {
                Authorization: `Bearer ${github.token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2026-03-10"
            }
        }
    )

    console.log(JSON.stringify(await res2.json()))
}

send()
