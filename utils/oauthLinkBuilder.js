require("dotenv").config();
const crypto = require("crypto");

// Generate a code verifier and code challenge
function generateCodeChallenge() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url"); // Generate a secure random string (code verifier)

  // Generate the code challenge by hashing the code verifier with SHA-256
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url"); // Base64 URL-safe encoding

  return { codeVerifier, codeChallenge };
}
function buildZohoOAuthLink() {
  const params = new URLSearchParams({
    scope: "ZohoCRM.modules.ALL",
    client_id: process.env.ZH_CLIENT_ID,
    redirect_uri: process.env.ZH_REDIRECT_URI,
    response_type: "code",
    access_type: "offline"
  });

  return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
}

function buildSalesforceOAuthLink({ email, companyName }) {
  const { codeVerifier, codeChallenge } = generateCodeChallenge();
  const statePayload = Buffer.from(
    JSON.stringify({
      email,
      companyName,
      codeVerifier, // Include the code verifier in the state for later use
    })
  ).toString("base64");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SF_CLIENT_ID,
    redirect_uri: process.env.SF_REDIRECT_URI,
    state: statePayload,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://login.salesforce.com/services/oauth2/authorize?${params.toString()}`;
}

module.exports = {
  buildSalesforceOAuthLink,
  buildZohoOAuthLink,
};
