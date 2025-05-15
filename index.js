// index.js
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const buildSalesforceOAuthLink = require("./utils/oauthLinkBuilder");
const { upsertOAuthCredential } = require("./utils/sheetService");
const app = express();
const path = require("path");
const { sendAuthEmail, sendNotificationEmail } = require("./emailService"); // make sure path is correct
const passport = require("passport");
require("./auth"); // or wherever your strategy lives
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: "your-secret", 
  resave: false, 
  saveUninitialized: false,
  cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/form", (req, res) => {
  if (!req.isAuthenticated()) return res.redirect("/auth/google");
  res.render("form"); // if you're using EJS and put the file in views/form.ejs
});

// Auth Routes
app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/form");
  });

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/"); // or redirect to login or home page
  });
});

app.post("/send-auth-email", async (req, res) => {
  const { companyName, email } = req.body;

  // TODO: store in DB or pass into your PKCE+link builder logic
  // TODO: generate Salesforce OAuth link and send email
  const oauthLink = buildSalesforceOAuthLink({
    email,
    companyName,
  });
  console.log(oauthLink);
  try {
    await sendAuthEmail({
      to: email,
      company: companyName,
      authUrl: oauthLink,
    });
    res.send(
      `<p>Email sent to ${email}. They will need to click the link and authorize the app.</p>`
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send email");
  }
});

// OAuth callback route
app.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query;
  const decodedState = JSON.parse(
    Buffer.from(state, "base64").toString("utf-8")
  );

  if (!code) {
    return res.status(400).send("Missing OAuth code from Salesforce.");
  }
  let tokenResponse;
  try {
    // Exchange code for tokens
    tokenResponse = await axios.post(
      `https://login.salesforce.com/services/oauth2/token`,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.SF_CLIENT_ID,
        client_secret: process.env.SF_CLIENT_SECRET,
        redirect_uri: process.env.SF_REDIRECT_URI,
        code: code,
        code_verifier: decodedState?.codeVerifier,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
  } catch (error) {
    console.error("OAuth Error:", error?.response?.data || error.message);
    res.status(500).send("Something went wrong during authentication.");
  }
  try {
    const { access_token, refresh_token, instance_url, issued_at } =
      tokenResponse.data;
    // Save into DB
    await pool.query(
      `INSERT INTO oauth_credentials (company_name, email, salesforce_url, access_token, refresh_token, issued_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (salesforce_url)
       DO UPDATE SET
        company_name = EXCLUDED.company_name,
        email = EXCLUDED.email,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        issued_at = EXCLUDED.issued_at,
        updated_at = CURRENT_TIMESTAMP`,
      [
        decodedState?.companyName || null, // You'll want to pass company name via state param (or store earlier)
        decodedState?.email || null, // Same with email
        instance_url,
        access_token,
        refresh_token,
        issued_at,
      ]
    );

    await upsertOAuthCredential({
         company_name: decodedState?.companyName || null, // You'll want to pass company name via state param (or store earlier)
        emial: decodedState?.email || null, // Same with email
        salesforce_url: instance_url,
        access_token,
        refresh_token,
        issued_at,
  });
    // Show success message
    res.send(
      `<h2>Thanks! Your Salesforce integration is complete. We'll begin syncing soon.</h2>`
    );
    // Send notification to you
    await sendNotificationEmail({
      company: decodedState?.companyName,
      email: decodedState?.email,
    });
  } catch (error) {
    console.error(JSON.stringify(error));
    res.status(500).send("Something went wrong during import.");
  }
});

app.post("/generate-oauth-link", (req, res) => {
  const { email, companyName } = req.body;

  if (!email || !companyName) {
    return res
      .status(400)
      .json({ error: "Email and Company Name are required." });
  }

  const oauthLink = buildSalesforceOAuthLink({
    email,
    companyName,
  });

  // You can either:
  // - Return it as a response
  // - Or pass it into your email sender function
  res.json({ oauthLink });
});

app.get("/", (req, res) => {
  res.render("login"); // This renders login.ejs
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
