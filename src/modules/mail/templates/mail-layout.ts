interface MailLayoutOptions {
  previewText: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}

const LOGO_URL =
  'https://cdn.hstatic.net/themes/200000065946/1001470406/14/logo.png?v=166';

const PRIMARY_COLOR = '#326881';

const FONT_STACK =
  "'Be Vietnam Pro',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function mailLayout({
  previewText,
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}: MailLayoutOptions): string {
  return `
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${heading}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${FONT_STACK};">
    <!-- Preview text (ẩn, hiện trong inbox preview) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${previewText}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="padding:36px 44px 0 44px;">
                <img
                  src="${LOGO_URL}"
                  alt="MOHO"
                  width="128"
                  style="display:block;height:auto;border:0;outline:none;text-decoration:none;"
                />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:28px 44px 8px 44px;font-family:${FONT_STACK};">
                <h1 style="margin:0 0 16px 0;font-size:20px;line-height:28px;font-weight:600;color:#111111;font-family:${FONT_STACK};">
                  ${heading}
                </h1>
                <div style="font-size:14px;line-height:22px;color:#52525b;font-family:${FONT_STACK};">
                  ${bodyHtml}
                </div>
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td style="padding:24px 44px;font-family:${FONT_STACK};">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="border-radius:8px;background-color:${PRIMARY_COLOR};">
                      <a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:10px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:${FONT_STACK};">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding:0 44px;">
                <div style="border-top:1px solid #e4e4e7;"></div>
              </td>
            </tr>

            <!-- Footer note -->
            <tr>
              <td style="padding:20px 44px;background-color:#fafafa;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#a1a1aa;text-align:center;font-family:${FONT_STACK};">
                  ${footerNote}
                </p>
              </td>
            </tr>
          </table>

          <!-- Outer footer -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin-top:24px;">
            <tr>
              <td align="center">
                <p style="margin:0;font-size:12px;line-height:18px;color:#a1a1aa;text-align:center;font-family:${FONT_STACK};">
                  © ${new Date().getFullYear()} MOHO. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
