import nodemailer from "nodemailer";
import { config } from "./config.js";

let transporter;

const cleanHeader = (value) =>
  String(value || "").replace(/[\r\n]+/g, " ").trim();

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const validReplyTo = (value) => {
  const email = String(value || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ? email : undefined;
};

const transport = () => {
  if (!transporter) {
    const auth = config.feedback.smtpUser && config.feedback.smtpPassword
      ? { user: config.feedback.smtpUser, pass: config.feedback.smtpPassword }
      : undefined;

    transporter = nodemailer.createTransport({
      host: config.feedback.smtpHost,
      port: config.feedback.smtpPort,
      secure: config.feedback.smtpSecure,
      requireTLS: config.feedback.smtpRequireTls,
      auth,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      tls: { minVersion: "TLSv1.2" },
    });
  }
  return transporter;
};

const feedbackRows = (feedback) => [
  ["Reference", feedback.id],
  ["Name", feedback.name],
  ["Email", feedback.email],
  ["Phone", feedback.phone],
  ["Address", feedback.address],
  ["Country", feedback.country],
  ["State", feedback.state],
  ["District", feedback.district],
  ["Website language", feedback.language === "hi" ? "Hindi" : "English"],
  ["Submitted", feedback.created_at?.toISOString?.() || feedback.created_at || new Date().toISOString()],
];

export const feedbackMailConfigured = () => config.feedback.enabled;

export const sendFeedbackNotification = async (feedback) => {
  if (!config.feedback.enabled) {
    return { status: "disabled", error: "SMTP delivery is not configured." };
  }

  const rows = feedbackRows(feedback);
  const text = [
    "New RSAC-UP website feedback",
    "",
    ...rows.map(([label, value]) => `${label}: ${String(value || "-")}`),
    "",
    "Comments / suggestion:",
    String(feedback.comments || ""),
    "",
    "This is public-submitted content. Treat links and attachments as untrusted.",
  ].join("\n");
  const htmlRows = rows
    .map(([label, value]) => `<tr><th align="left" style="padding:6px 12px 6px 0">${escapeHtml(label)}</th><td style="padding:6px 0">${escapeHtml(value || "-")}</td></tr>`)
    .join("");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#17384b;line-height:1.5">
      <h2 style="color:#0f6f42">New RSAC-UP website feedback</h2>
      <table style="border-collapse:collapse">${htmlRows}</table>
      <h3>Comments / suggestion</h3>
      <div style="white-space:pre-wrap;border-left:4px solid #f28c28;padding:12px;background:#f7fafb">${escapeHtml(feedback.comments)}</div>
      <p style="font-size:12px;color:#647784">Public-submitted content: treat links and attachments as untrusted.</p>
    </div>`;

  await transport().sendMail({
    from: {
      name: config.feedback.fromName,
      address: config.feedback.fromEmail,
    },
    to: config.feedback.recipients,
    replyTo: validReplyTo(feedback.email),
    subject: cleanHeader(`RSAC-UP website feedback: ${feedback.name}`),
    text,
    html,
  });

  return { status: "sent", error: "" };
};
