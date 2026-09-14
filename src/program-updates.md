---
title: program updates
permalink: /program-updates/
layout: base.njk
noindex: true
updatesForm: true
description: For Adelaide Design Week participants — submit a change to your event listing.
---

{#- Deliberately not in the nav and not indexed: the URL is given to
    participants directly. collections.nav filters on navOrder, which this
    page does not set. -#}

<article class="page prose" data-updates data-form-id="{{ site.updatesFormId }}">

# changes to your event

If anything about your Adelaide Design Week event has changed, please tell us
here. Changes are reviewed by the team and updated on the website within 24 to
48 hours.

What you enter goes directly onto the website, so please check it before you
submit. Each field replaces what is published now, so write the wording in full
rather than describing the change — anything you leave out will no longer
appear.

Multiple submissions for the same event can conflict, so please combine your
changes into one submission where you can.

We are not able to accept changes by email, due to the volume of submissions we
receive. Please use this form only.

Select your event below. You will see what the website currently has for it.

<p class="pu-field">
  <label for="pu-event">your event</label>
  <select id="pu-event">
    <option value="">— choose an event —</option>
    {%- for e in program2026.az %}
    <option value="{{ e.title }}">{{ e.title }}</option>
    {%- endfor %}
    <option value="My event is not listed">my event is not listed</option>
  </select>
</p>

<div class="pu-current" data-current></div>
<div class="pu-form" data-form></div>

<p class="pu-fallback">
  For anything this form does not cover, such as a press enquiry, email
  <a href="mailto:{{ site.contactEmail }}">{{ site.contactEmail }}</a>.
</p>

</article>

<script type="application/json" id="pu-data">
{
  "events": [
    {%- for e in program2026.az %}
    {
      "title": {{ e.title | dump | safe }},
      "venue": {{ e.venue | dump | safe }},
      "blurb": {{ e.blurb | dump | safe }},
      "ticketed": {{ "true" if e.ticketed else "false" }},
      "link": {{ e.link | dump | safe }},
      "socials": {{ (e.socials.handle if e.socials else "") | dump | safe }},
      "contributors": {{ e.contributors | dump | safe }},
      "sessions": {{ e.sessions | dump | safe }}
    }{% if not loop.last %},{% endif %}
    {%- endfor %}
  ]
}
</script>
