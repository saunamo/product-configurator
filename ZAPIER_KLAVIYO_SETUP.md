# Zapier & Klaviyo Integration Setup Guide

This guide explains how to set up the automatic quote email sending and Klaviyo integration using Zapier.

## Overview

When a quote is generated:
1. A webhook is sent to Zapier with all quote data (including PDF as base64)
2. Zapier sends the email to the customer with the quote PDF attached
3. Zapier automatically adds the quote/customer to Klaviyo

**Note:** Email sending is handled entirely through Zapier. The application does not send emails directly.

## Step 1: Configure Environment Variables

Add these to your `.env` file (or your hosting platform's environment variables):

```bash
# Company Information
COMPANY_NAME=Saunamo, Arbor Eco LDA

# Quote Portal URL (where users can view their quote)
QUOTE_PORTAL_URL=https://saunamo.co.uk/quote

# Zapier Webhook URL (get this from Zapier)
ZAPIER_WEBHOOK_URL=https://hooks.zapier.com/hooks/catch/your-webhook-id-here
```

## Step 2: Set Up Zapier Webhook

1. Go to https://zapier.com and create a new Zap
2. Choose "Webhooks by Zapier" as the trigger
3. Select "Catch Hook" as the event
4. Copy the webhook URL provided by Zapier
5. Add it to `ZAPIER_WEBHOOK_URL` in your environment variables

## Step 3: Configure Email Action in Zapier

1. In your Zap, add an **Email** action (e.g., Gmail, Outlook, or Email by Zapier)
2. Configure the email:
   - **To**: `customerEmail` (from webhook)
   - **Subject**: `Your ${productName} Quote - ${quoteId}`
   - **Body**: Use HTML template with the webhook data
   - **Attachments**: Use `pdfBase64` field (decode from base64) with filename `pdfFilename`
3. **Email Template Variables Available**:
   - `customerName`, `customerEmail`, `customerPhone`
   - `productName`, `productImageUrl` (automatically included - product main image)
   - `total`, `subtotal`, `tax`
   - `quoteId`, `quotePortalUrl` (link to view quote online)
   - `companyName`
   - `createdAt`, `expiresAt`, `notes`
   - `items` (array of quote items)
   
   **Note:** The `productImageUrl` is automatically included in the webhook payload. The email template (`zapier-welvaere-email-template.html`) already includes logic to display the product image if available. Make sure your Zapier email action uses the `productImageUrl` field in the email body.

## Step 4: Configure Klaviyo Action in Zapier

1. In your Zap, add Klaviyo as the action
2. Choose "Create or Update Profile" or "Add Profile to List"
3. Map the fields from the webhook payload:
   - **Email**: `customerEmail`
   - **First Name**: `customerName` (split if needed)
   - **Phone**: `customerPhone`
   - **Custom Properties**:
     - `quote_id`: `quoteId`
     - `product_name`: `productName`
     - `quote_total`: `total`
     - `quote_date`: `createdAt`

## Step 5: Test the Integration

1. Generate a test quote in the configurator
2. Check that:
   - Zapier receives the webhook (check Zapier dashboard → Task History)
   - Email is sent via Zapier (check your email app/account)
   - Email includes the PDF attachment
   - Email has the correct styling and "View quote" button
   - Klaviyo profile is created/updated

## Webhook Payload Structure

The webhook sends the following data to Zapier:

```json
{
  "quoteId": "quote-123",
  "customerEmail": "customer@example.com",
  "customerName": "John Doe",
  "customerPhone": "+1234567890",
  "productName": "Outdoor Sauna Cube 125",
  "productId": "cube-125",
  "productImageUrl": "https://...",
  "total": 15000.00,
  "subtotal": 12500.00,
  "tax": 2500.00,
  "items": [
    {
      "stepName": "Heater",
      "optionTitle": "Kajo 6.6kW (80kg)",
      "price": 875.00,
      "quantity": 1,
      "total": 875.00
    }
  ],
  "createdAt": "2026-01-23T00:00:00.000Z",
  "expiresAt": "2026-02-22T00:00:00.000Z",
  "notes": "Customer notes here",
  "quotePortalUrl": "https://saunamo.co.uk/quote/quote-123",
  "companyName": "Saunamo, Arbor Eco LDA",
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMy...", // Base64 encoded PDF (if available)
  "pdfFilename": "quote-quote-123.pdf"
}
```

**Note:** The `pdfBase64` field contains the PDF as a base64-encoded string. In Zapier, you'll need to:
1. Use a "Code by Zapier" step to decode it: `Buffer.from(pdfBase64, 'base64')`
2. Or use Zapier's built-in attachment handling if your email app supports it

## Email Template Features

The email template includes:
- Company logo/name at the top
- Personalized greeting
- **Product image** (automatically included from `productImageUrl` in webhook)
- "View quote" button linking to quote portal (`quotePortalUrl`)
- Quote summary with ID, date, and total
- Professional styling matching your brand colors

**Product Image:** The product's main image is automatically included in the webhook payload as `productImageUrl`. The email template (`zapier-welvaere-email-template.html`) uses `{{#if productImageUrl}}` to conditionally display the image. Make sure your Zapier email action includes this field in the email body HTML.

## Troubleshooting

### Email not sending
- Verify your Zapier Zap is turned on
- Check that the Email action in Zapier is correctly configured
- Test the Zap manually in Zapier to see error messages
- Verify `customerEmail` is being passed correctly from the webhook
- Check Zapier task history for failed email sends

### Webhook not working
- Verify `ZAPIER_WEBHOOK_URL` is correct
- Test the webhook URL manually with a POST request
- Check Zapier dashboard for received webhooks

### Klaviyo not updating
- Verify Klaviyo action is correctly configured in Zapier
- Check field mappings in Zapier
- Test the Zap manually in Zapier

## Next Steps

1. Set up a quote portal page at `/quote/[quoteId]` to display quotes
2. Customize the email template further if needed
3. Add more Klaviyo custom properties as needed
4. Set up email tracking and analytics
