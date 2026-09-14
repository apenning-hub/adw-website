---
title: program updates
permalink: /program-updates/
layout: base.njk
noindex: true
updatesForm: true
description: For Adelaide Design Week participants — tell us about a change or an error in your event listing.
---

{#- Deliberately not in the nav and not indexed: the URL is given to
    participants directly. collections.nav filters on navOrder, which this
    page does not set. -#}

<article class="page prose" data-updates data-form-id="{{ site.updatesFormId }}">

# something to change?

If your listing on the program is wrong, or something about your event has
changed, tell us here rather than by email. Everything submitted on this page
lands in one place, in the same shape as the spreadsheet the program is built
from — which means it gets fixed quickly, and nothing is lost in a thread.

Please **choose your event first**. That way we know exactly which listing you
mean, and you can see what the website currently says about it.

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
  Something this form doesn't cover — a question, a withdrawal, a press
  enquiry? Email <a href="mailto:{{ site.contactEmail }}">{{ site.contactEmail }}</a>.
</p>

</article>

<script type="application/json" id="pu-data">
{
  "events": [
    {%- for e in program2026.az %}
    {
      "title": {{ e.title | dump | safe }},
      "venue": {{ e.venue | dump | safe }},
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
