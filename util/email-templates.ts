/**
 * Email templates (same visual style as driverjobs-be account-activated-email).
 * Used for profile rejection emails sent from admin.
 */

const PROFILE_REJECTED_SUBJECT = "Your DriverJobz Profile Review Update";

export function getProfileRejectedEmailSubject(): string {
  return PROFILE_REJECTED_SUBJECT;
}

export interface ProfileRejectedEmailParams {
  firstName?: string;
  rejectionMessage?: string;
  profileType: "DRIVER" | "EMPLOYER";
}

/**
 * HTML body for profile rejected email (matches driverjobs-be email style).
 */
export function getProfileRejectedEmailHtml(params: ProfileRejectedEmailParams): string {
  const { firstName = "there", rejectionMessage, profileType } = params;
  const profileLabel = profileType === "DRIVER" ? "driver" : "employer";

  const reasonBlock = rejectionMessage
    ? `
    <p style="margin: 0 0 20px 0;">
      <strong style="color: #000000;">Reason:</strong><br />
      <span style="color: #555555;">${escapeHtml(rejectionMessage)}</span>
    </p>
    <p style="margin: 0 0 20px 0;">
      Please address the feedback above and resubmit your ${profileLabel} profile for review.
    </p>
    `
    : `
    <p style="margin: 0 0 20px 0;">
      Please review your ${profileLabel} profile and resubmit for approval. If you need assistance, contact our support team.
    </p>
    `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Profile Review Update</title>
</head>
<body style="margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; margin: 0 auto; padding: 20px; font-family: 'Inter', Arial, sans-serif; max-width: 600px; font-size: 14px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f2c500; height: 8px;">
          <tr><td height="8" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 30px 20px 20px 20px;">
                    <span style="font-size: 24px; font-weight: bold; color: #000000;">driver &gt;&gt;</span>
                    <span style="font-size: 24px; font-weight: bold; color: #000000;"> &lt;&lt; jobz</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 0 40px 0; font-size: 14px; line-height: 24px; color: #555555; border-top: 1px solid #e5e5e5; border-bottom: 1px solid #e5e5e5;">
                    <p style="margin: 0 0 20px 0;">Hello ${escapeHtml(firstName)},</p>
                    <p style="margin: 0 0 20px 0;">
                      Your ${profileLabel} profile has been reviewed by our team.
                    </p>
                    <p style="margin: 0 0 20px 0;">
                      <strong style="color: #000000;">Your profile was not approved at this time.</strong>
                    </p>
                    ${reasonBlock}
                    <p style="margin: 0 0 30px 0;">If you have questions, please contact our support team.</p>
                    <p style="margin: 0;">Thanks &amp; Regards</p>
                    <p style="margin: 0; color: #000000;"><strong>driverjobz</strong></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f2c500; height: 8px;">
          <tr><td height="8" style="font-size: 1px; line-height: 1px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
