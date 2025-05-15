const { google } = require("googleapis");
const path = require("path");
const credentials = require("./service-account.json");
require("dotenv").config();

const SPREADSHEET_ID = "1qjlx1kuJL3rWVQvkYKBhzEB_w0waab2TiL_PZNtD6kc"; // from the URL
const SHEET_NAME = "oauth_credentials";

const auth = new google.auth.GoogleAuth({
  credentials:JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
async function upsertOAuthCredential(data) {
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  const {
    company_name,
    email,
    salesforce_url,
    access_token,
    refresh_token,
    issued_at,
  } = data;

  const now = new Date().toISOString();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:I`,
  });

  const rows = res.data.values || [];

  // Find existing row by salesforce_url
  const existingIndex = rows.findIndex((row) => row[3] === salesforce_url);

  if (existingIndex !== -1) {
    // Update existing
    const existingRow = rows[existingIndex];
    const id = existingRow[0];
    const created_at = existingRow[6] || now; // Preserve created_at if exists
    const rowNumber = existingIndex + 2;

    const updatedRow = [
      id,
      company_name || "",
      email || "",
      salesforce_url,
      access_token,
      refresh_token,
      issued_at,
      created_at,
      now, // updated_at
    ];

    const range = `${SHEET_NAME}!A${rowNumber}:I${rowNumber}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [updatedRow],
      },
    });

    console.log("✅ Updated existing row.");
  } else {
    // Insert new
    const maxId = rows.reduce((max, row) => {
      const id = parseInt(row[0]);
      return isNaN(id) ? max : Math.max(max, id);
    }, 0);

    const newId = maxId + 1;

    const newRow = [
      newId,
      company_name || "",
      email || "",
      salesforce_url,
      access_token,
      refresh_token,
      issued_at,
      now, // created_at
      now, // updated_at
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:I`,
      valueInputOption: "RAW",
      requestBody: {
        values: [newRow],
      },
    });

    console.log("✅ Inserted new row with ID:", newId);
  }
}

module.exports = { upsertOAuthCredential };
