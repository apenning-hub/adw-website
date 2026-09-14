# Email signature — every\*one 2026

The banner is hosted on the website, so the image loads from a URL rather than
travelling as an attachment. Attached images get stripped by some clients, flagged
by others, and bloat every message you send.

**Image:** <https://adelaidedesignweek.com.au/assets/email/signature-2026.png>

---

## Fastmail

**Settings → Compose → Signatures → edit your signature**, click the **`< >`**
(source) button in the toolbar, and paste this in:

```html
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:0 0 10px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;color:#333333;">
      <strong>Andrew Lymn-Penning</strong><br>
      Adelaide Design Week<br>
      <a href="mailto:contact@adelaidedesignweek.com.au" style="color:#333333;">contact@adelaidedesignweek.com.au</a>
    </td>
  </tr>
  <tr>
    <td style="padding:0;">
      <a href="https://everyone.adelaidedesignweek.com.au" style="text-decoration:none;">
        <img src="https://adelaidedesignweek.com.au/assets/email/signature-2026.png"
             alt="every*one — Adelaide Design Week, 14.10 – 18.10.26"
             width="800" style="display:block;width:800px;max-width:100%;height:auto;border:0;">
      </a>
    </td>
  </tr>
</table>
```

Change the name and email in the top block. If you don't want a text block at
all, delete that first `<tr>`.

### Why it is built this way

- **`<table>` not `<div>`** — Outlook still ignores modern CSS layout. Tables are
  the only thing every client agrees on.
- **Inline styles only** — most clients strip `<style>` blocks.
- **`width="800"` on a 1600px image** — it renders at half size, so it stays sharp
  on retina screens. `max-width:100%` stops it overflowing on a phone.
- **`display:block`** — removes the gap some clients add under an image.
- **Real `alt` text** — it is the whole signature if images are blocked, which is
  the default in many corporate clients.

### Apple Mail / Outlook

Same HTML. Apple Mail has no source view, so: save the snippet as a `.html` file,
open it in a browser, select all, copy, and paste into the signature box.

---

## Updating the banner

Replace `src/assets/email/signature-2026.png`, publish, and every signature
already sent updates too — they all point at the same URL.

Keep the **same filename**. A new name means every signature in the team has to
be re-pasted.
