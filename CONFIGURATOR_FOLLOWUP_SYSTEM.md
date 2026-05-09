# Configurator Follow-Up System

## Goal

Turn configurator quotes into a proper sales lifecycle instead of a one-off automatic quote email.

## Trigger

Every saved configurator quote emits the Klaviyo event:

`Configurator Quote Requested`

The event includes quote ID, product, total, quote URL, Pipedrive deal URL, selected items, attribution, phone, SMS consent, and WhatsApp consent.

## Klaviyo Flow

Use one metric-triggered flow from `Configurator Quote Requested`.

Flow filters:

- Exit if profile has event `Order Placed` after starting flow.
- Exit if profile property `saunamo_deal_status` is `won` or `lost` when that sync exists.
- Suppress anyone already in the same quote flow for the same `quote_id`.

Recommended sequence:

1. Immediate: Quote delivery email
   Subject: `Your {{ event.product_name }} quote`
   Purpose: deliver quote, make reply easy, invite a quick check of space/heater/delivery.

2. +4 hours: SMS if consented
   Purpose: short reminder that the quote is ready and help is available.

3. +1 day: Human-fit email
   Purpose: "Before you decide, check these 3 things": heater sizing, base/prep, delivery/access.

4. +2 days: WhatsApp or sales alert
   If `whatsapp_consent=true`, send customer WhatsApp through TimelinesAI.
   Otherwise send internal WhatsApp alert to the sales team.

5. +4 days: Proof email
   Purpose: customer installs, product photos, reassurance about quality and delivery.

6. +7 days: Objection email
   Purpose: handle price, installation, electrical, lead time, and what is included/not included.

7. +10 days: Personal help email
   Purpose: "Want us to simplify the quote?" Offer to remove options or compare models.

8. +14 days: Final useful nudge
   Purpose: quote validity, price/stock caveat, book a call.

## SMS Copy

Keep SMS under 320 characters.

Example:

`Hi {{ first_name|default:'there' }}, your Saunamo sauna quote is ready: {{ event.quote_url }}. Reply to this email or book a quick check if you want us to confirm heater, delivery and installation details.`

## WhatsApp Rules

Customer WhatsApp is only sent when `whatsappConsent` is true in the quote request.

If consent is missing, the system sends an internal WhatsApp alert to `SAUNAMO_SALES_WHATSAPP_PHONE`, so a salesperson can decide the right compliant next step.

## Environment Variables

```bash
KLAVIYO_PRIVATE_API_KEY=
TIMELINES_AI_API_TOKEN=
TIMELINES_AI_WHATSAPP_ACCOUNT_ID= # optional
SAUNAMO_SALES_WHATSAPP_PHONE=     # internal alerts, international format
```

## Form Changes Needed

Add explicit consent checkboxes near the quote form:

- `smsConsent`: "I agree to receive SMS updates about my quote."
- `whatsappConsent`: "I agree to receive WhatsApp messages about my quote."

Do not pre-check either box.
