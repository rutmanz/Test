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

let image_url = "https://github.com/synthesis-adsk/github-icons/blob/main/icons/comment-gray.png?raw=true";

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

const getPayload = (comments: any[]) => {
    let blocks: any[] = [
        {
            "type": "container",
            "width": "full",
            "title": {
                "type": "plain_text",
                "text": `#${github.event.pull_request.number} (${github.event.pull_request.user.login}) - ${github.event.review.state}`
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
                        "text": github.event.review.body,
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

    if (comments.length > 0) {
        blocks.push(
            {
                "type": "container",
                "title": {
                    "type": "plain_text",
                    "text": `Comments (${comments.length})`
                },
                "width": "full",
                "is_collapsible": true,
                "default_collapsed": false,
                "child_blocks": comments.map(comment => ({
                    "type": "callout",
                    "background_color": "gray",
                    "child_blocks": [
                        {
                            "type": "section",
                            "text": {
                                "type": "mrkdwn",
                                "text": `*File: _${comment.path}_*\n\n${comment.body}`
                            },
                            "accessory": {
                                "type": "button",
                                "text": {
                                    "type": "plain_text",
                                    "text": "View",
                                    "emoji": true
                                },
                                "url": comment.url
                            }
                        }
                    ]
                }))
            })
    }
    blocks.push({
        "type": "context",
        "elements": [
            {
                "type": "image",
                "image_url": `https://avatars.githubusercontent.com/u/${github.actor_id}`,
                "alt_text": "images"
            },
            {
                "type": "mrkdwn",
                "text": `*${github.actor}*`
            }
        ]
    })

    return {
        blocks
    }
}

const send = async () => {
    // get comments
    const repo_owner = github.repository_owner
    const repo_name = github.event.repository.name
    const pr_number = github.event.pull_request.number
    const review_id = github.event.review.id

    const url = `https://api.github.com/repos/${repo_owner}/${repo_name}/pulls/${pr_number}/reviews/${review_id}/comments?per_page=100`
    const comments_res = await fetch(
        url,
        {
            headers: {
                Authorization: `Bearer ${github.token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2026-03-10"
            }
        }
    )

    const comments = await comments_res.json()
    console.log("COMMENTS", JSON.stringify(comments))

    const payload = getPayload(comments)

    const slack_res = await fetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json'
        }
    })

    console.log("Slack notification sent", await slack_res.text())

}

send()
