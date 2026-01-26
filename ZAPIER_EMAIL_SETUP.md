# Zapier Email Setup Guide

This guide will walk you through setting up email sending via Zapier for quote generation.

## Overview

When a customer generates a quote:
1. The application sends a webhook to Zapier with all quote data
2. Zapier sends a beautifully formatted email with the quote PDF attached
3. Zapier can also sync the customer to Klaviyo (optional)

## Step 1: Set Up Environment Variables

Add this to your `.env` file (or your hosting platform's environment variables):

```bash
# Zapier Webhook URL (get this from Step 2)
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID

# Company Information (optional, defaults provided)
COMPANY_NAME=Saunamo, Arbor Eco LDA
QUOTE_PORTAL_URL=https://saunamo.co.uk/quote
```

## Step 2: Create Zapier Webhook

1. Go to https://zapier.com and sign in
2. Click **"Create Zap"**
3. **Trigger**: Search for "Webhooks by Zapier"
4. **Event**: Select **"Catch Hook"**
5. Click **"Continue"**
6. Copy the **Webhook URL** (looks like: `https://hooks.zapier.com/hooks/catch/123456/abcdef`)
7. Add it to your `.env` file as `ZAPIER_WEBHOOK_URL`
8. Click **"Test trigger"** - this will show you a sample webhook payload
9. Click **"Continue"**

## Step 3: Add Code Step to Decode PDF (Optional but Recommended)

If you want to attach the PDF to the email, you'll need to decode it from base64:

1. Click **"+"** to add a new action
2. Search for **"Code by Zapier"**
3. Select **"Run JavaScript"**
4. In the code editor, paste this:

```javascript
// Decode PDF from base64
const pdfBase64 = inputData.pdfBase64;
const pdfFilename = inputData.pdfFilename || 'quote.pdf';

if (pdfBase64) {
  // Convert base64 to buffer
  const buffer = Buffer.from(pdfBase64, 'base64');
  
  return {
    pdfBuffer: buffer.toString('base64'), // Keep as base64 for email attachment
    pdfFilename: pdfFilename,
    hasPdf: true
  };
} else {
  return {
    hasPdf: false
  };
}
```

5. Map the input:
   - `pdfBase64` → from webhook: `pdfBase64`
   - `pdfFilename` → from webhook: `pdfFilename`
6. Click **"Continue"** and test

## Step 4: Configure Email Action

1. Click **"+"** to add another action
2. Search for your email provider:
   - **Gmail** (if using Gmail)
   - **Outlook** (if using Outlook)
   - **Email by Zapier** (generic SMTP)
3. Select **"Send Email"** or **"Send Outbound Email"**
4. Configure the email:

### Email Configuration:

**To:**
```
{{customerEmail}}
```

**Subject:**
```
Your {{productName}} Quote - {{quoteId}}
```

**Body (HTML):**
Copy the HTML template from the section below, or use this simplified version:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Questrial', Arial, sans-serif; background-color: #F3F0ED; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #F3F0ED; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #F3F0ED; border-collapse: collapse;">
          <!-- Logo Section -->
          <tr>
            <td style="padding: 30px 20px; text-align: center; background-color: #F3F0ED;">
              <div style="color: #303337; font-size: 32px; font-weight: bold; letter-spacing: 2px;">
                {{companyName}}
              </div>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 20px 20px 10px 20px; background-color: #F3F0ED;">
              <h2 style="margin: 0; color: #303337; font-size: 24px; font-weight: normal;">
                Hi {{customerName}},
              </h2>
            </td>
          </tr>
          
          <!-- Product Image -->
          {{#if productImageUrl}}
          <tr>
            <td style="padding: 20px; background-color: #F3F0ED;">
              <img src="{{productImageUrl}}" alt="{{productName}}" style="width: 100%; max-width: 600px; height: auto; border-radius: 8px; display: block;" />
            </td>
          </tr>
          {{/if}}
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px; background-color: #F3F0ED;">
              <p style="margin: 0 0 30px 0; color: #303337; font-size: 16px; line-height: 1.6;">
                Thank you for requesting a quote for a <span style="color: #D4A574;">{{productName}}</span> from {{companyName}}! View the quote easily in our quote portal through this link:
              </p>
              
              <!-- View Quote Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="{{quotePortalUrl}}" style="display: inline-block; padding: 15px 40px; background-color: #303337; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; text-align: center;">
                      View quote
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Quote Summary -->
              <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h3 style="margin: 0 0 15px 0; color: #303337; font-size: 18px; font-weight: bold;">Quote Summary</h3>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Quote ID:</strong> {{quoteId}}</p>
                <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Total:</strong> £{{total}}</p>
              </div>
              
              <p style="margin: 30px 0 0 0; color: #303337; font-size: 16px;">
                If you have any questions about this quote, please don't hesitate to contact us.
              </p>
              
              <p style="margin: 20px 0 0 0; color: #303337; font-size: 16px;">
                Best regards,<br>
                <strong>The {{companyName}} Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #F3F0ED;">
              <p style="margin: 0; color: #908F8D; font-size: 12px;">
                This is an automated email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Note:** Zapier uses Handlebars templating. Replace `{{variableName}}` with actual Zapier field mappings from your webhook.

### Attach PDF (if using Code step):

If you added the Code step to decode the PDF:
- **Attachments**: Add attachment
  - **File**: Map from Code step output: `pdfBuffer` (as base64)
  - **Filename**: Map from Code step output: `pdfFilename`

**OR** if your email provider supports direct base64:
- **Attachments**: Add attachment
  - **File**: Map from webhook: `pdfBase64` (as base64)
  - **Filename**: Map from webhook: `pdfFilename`

5. Click **"Continue"** and test the email

## Step 5: Test Your Zap

1. **Turn on your Zap** (toggle in top right)
2. Generate a test quote in your configurator
3. Check:
   - Zapier dashboard → **Task History** - should show successful webhook
   - Your email inbox - should receive the quote email
   - Email should have PDF attached (if configured)

## Step 6: Add Klaviyo Integration (Optional)

1. Click **"+"** to add another action
2. Search for **"Klaviyo"**
3. Select **"Create or Update Profile"** or **"Add Profile to List"**
4. Map fields:
   - **Email**: `{{customerEmail}}`
   - **First Name**: `{{customerName}}` (you may need to split this)
   - **Phone**: `{{customerPhone}}`
   - **Custom Properties**:
     - `quote_id`: `{{quoteId}}`
     - `product_name`: `{{productName}}`
     - `quote_total`: `{{total}}`
     - `quote_date`: `{{createdAt}}`

## Troubleshooting

### Webhook not received
- Check `ZAPIER_WEBHOOK_URL` is correct in your `.env`
- Verify the Zap is turned ON
- Check Zapier Task History for errors
- Test the webhook URL manually with a POST request

### Email not sending
- Check email action configuration in Zapier
- Verify email provider credentials are correct
- Check Zapier Task History for error messages
- Test the email action manually in Zapier

### PDF not attaching
- Verify `pdfBase64` is being sent in webhook (check Task History)
- Make sure Code step is decoding correctly
- Check email provider supports base64 attachments
- Some providers require the attachment in a specific format

### Variables not populating
- Make sure you're using Zapier's field picker (click the field icon)
- Variables should be in format: `{{fieldName}}`
- Check webhook payload structure matches what you're mapping

## Webhook Payload Reference

The webhook sends this data structure:

```json
{
  "quoteId": "quote-1234567890-abc123",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerPhone": "+44 123 456 7890",
  "productName": "Outdoor Sauna Cube 125",
  "productId": "cube-125",
  "productImageUrl": "https://...",
  "total": 15000.00,
  "subtotal": 12500.00,
  "tax": 2500.00,
  "items": [
    {
      "stepName": "Sauna",
      "optionTitle": "Outdoor Sauna Cube 125",
      "price": 10000.00,
      "quantity": 1,
      "total": 10000.00
    },
    {
      "stepName": "Heater",
      "optionTitle": "Kajo 6.6kW (80kg)",
      "price": 875.00,
      "quantity": 1,
      "total": 875.00
    }
  ],
  "createdAt": "2026-01-26T12:00:00.000Z",
  "expiresAt": "2026-02-25T12:00:00.000Z",
  "notes": "Customer notes here",
  "quotePortalUrl": "https://saunamo.co.uk/quote/quote-1234567890-abc123",
  "companyName": "Saunamo, Arbor Eco LDA",
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMy...",
  "pdfFilename": "quote-quote-1234567890-abc123.pdf"
}
```

## Next Steps

1. Customize the email template to match your brand
2. Add more personalization based on product type
3. Set up email tracking/analytics
4. Configure Klaviyo flows based on quote data
5. Add A/B testing for email content
