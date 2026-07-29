# Artist Application form

Create a Google Form linked to the `Artists` tab or to a separate `Artist Applications`
tab. Use these exact question titles so the workflow mapping is predictable:

- Name
- Email
- Style
- Location
- Portfolio
- Bio
- Artist Statement

The supplied Agent 1 template uses an n8n Form Trigger because it is immediately
testable. If the gallery must use Google Forms, replace only the trigger with a
Google Sheets Trigger pointed at the linked response sheet; keep the normalized
field names above.

