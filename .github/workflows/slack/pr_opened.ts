import { IncomingWebhook } from "@slack/webhook";
import type { IncomingWebhookSendArguments } from "@slack/webhook";
import type { ActionsBlock, ContextBlock, SectionBlock } from "@slack/types";

const webhookUrl = process.env.SLACK_WEBHOOK_URL;
const prNumber = process.env.PR_NUMBER;
const prTitle = process.env.PR_TITLE;
const prUrl = process.env.PR_URL;
const prAction = process.env.PR_ACTION ?? "opened";
const prUser = process.env.PR_USER;
const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA?.slice(0, 7);

if (!webhookUrl) {
  console.error("SLACK_WEBHOOK_URL is required");
  process.exit(1);
}

const verb = prAction.charAt(0).toUpperCase() + prAction.slice(1);

const payload: IncomingWebhookSendArguments = {
  text: `PR #${prNumber} ${prAction} by @${prUser}: ${prTitle}`,
  blocks: [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*<${prUrl}|PR #${prNumber}: ${prTitle}>*\n${verb} by *@${prUser}* in \`${repo}\``,
      },
    } satisfies SectionBlock,
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: `Commit: \`${sha}\`` }],
    } satisfies ContextBlock,
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View PR", emoji: true },
          url: prUrl,
          style: "primary",
          action_id: "view_pr",
        },
      ],
    } satisfies ActionsBlock,
  ],
};

const webhook = new IncomingWebhook(webhookUrl);
await webhook.send(payload);
console.log("Slack notification sent");