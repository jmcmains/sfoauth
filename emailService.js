// emailService.js
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");

const transporter = nodemailer.createTransport({
  service: "gmail", // or use your provider (e.g. SendGrid, SMTP host, etc)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendAuthEmail = async ({ to, company, authUrl }) => {
  // Load HTML file
  const templatePath = path.join(__dirname, "views", "email.ejs");

  // Render HTML using EJS
  const html = await ejs.renderFile(templatePath, {
    company,
    authUrl,
  });
  const mailOptions = {
    from: `"Your Company Name" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Salesforce Authorization for ${company}`,
    html,
  };

  return transporter.sendMail(mailOptions);
};

const sendNotificationEmail = async ({ company, email }) => {
  // Load HTML file
  const notifyOptions = {
    from: `"Your App Notifier" <${process.env.EMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL, // e.g., your email address
    subject: `✅ ${company} authorized Salesforce`,
    text: `${company} has completed Salesforce authorization.\nEmail: ${email}`,
  };

  return transporter.sendMail(notifyOptions);
};

module.exports = { sendAuthEmail, sendNotificationEmail };
