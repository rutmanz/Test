import { MessageBuilder, reviewCommentsFromApi, reviewEventFromContext, reviewNotification, reviewSummary } from "./index";

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const github = JSON.parse(process.env.GITHUB_DATA ?? "{}")

if (!webhookUrl) {
    console.error("SLACK_WEBHOOK_URL is required");
    process.exit(1);
}

// Leaving a review with multiple comments causes the action to run for each comment;
// once with action "submitted", and the rest with "edited". Ignore edited and manually
// search for comments.
if (github.event.action === "edited") process.exit(0)

// States: changes_requested, approved, commented, dismissed, pending

const send = async () => {
    let comments;

    if (github.event.action !== "dismissed") {
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

        comments = await comments_res.json()
    }

    const event = reviewEventFromContext(github)
    const message = new MessageBuilder(reviewSummary(event))
        .add(...reviewNotification(event, reviewCommentsFromApi(comments ?? [])))
        .build()

    const slack_res = await fetch(webhookUrl, {
        method: 'POST',
        body: JSON.stringify(message),
        headers: {
            'Content-Type': 'application/json'
        }
    })

    console.log("Slack notification sent:", await slack_res.text())
}

send()
