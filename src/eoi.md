---
title: how to apply
navLabel: eoi
navOrder: 2
permalink: /eoi/
layout: base.njk
tallyPopup: true
lightbox: true
description: Apply to Adelaide Design Week 2026 across five streams — Project, Collaborate, Host, Team, or Sponsor.
---

<article class="page prose">

# how to apply

You can submit an Expression of Interest under any of these streams. The form takes around 10–15 minutes and you can submit more than one EOI — one per project, role or offer.

<dl class="streams">
  <dt>Project</dt>
  <dd>An exhibition, talk, installation, workshop, performance, open studio or other work with a defined outcome.</dd>

  <dt>Collaborate</dt>
  <dd>You're a designer or studio looking for collaborators, or to join an existing project.</dd>

  <dt>Host</dt>
  <dd>You have a venue and want to host an event, exhibition, talk or other ADW activity.</dd>

  <dt>Team</dt>
  <dd>You'd like to be part of the ADW team — volunteer, coordinator, or behind-the-scenes contributor.</dd>

  <dt>Sponsor</dt>
  <dd>You or your organisation want to support ADW financially or in kind.</dd>
</dl>

## what events look and feel like

ADW events are generous, grassroots, and open — celebrations of the profession and the people in it.

The events that worked best in 2025 brought people into a room together: an opening, something to eat or drink, a reason to stay and talk. You don't need a big production — just a moment that makes people feel welcome and design feel close at hand.

<ul class="vibe-grid">
{% for item in vibe %}
  <li><a href="{{ ('/assets/images/vibe/' + item.filename) | url }}" aria-label="View {{ item.alt }}"><img src="{{ ('/assets/images/vibe/' + item.filename) | url }}" alt="{{ item.alt }}, ADW 2025" loading="lazy"></a></li>
{% endfor %}
</ul>

<div class="cta-wrap">
  <a class="cta-tally" href="{{ site.tallyFormUrl }}" target="_blank" rel="noopener noreferrer">submit your eoi →</a>
  <p class="cta-meta">EOIs close {{ site.eoiDates.close }}.</p>
</div>

## before you apply

Please review the following before submitting:

<ul class="checklist">
  <li>You, or a representative for you / your project, will be available and responsible pre, during and post event.</li>
  <li>You have your own insurance.</li>
  <li>You have read and understood the terms and conditions.</li>
</ul>

<p class="program-link"><a href="{{ '/2025/' | url }}">see what happened in 2025 →</a></p>

</article>


<article class="page prose">

<aside class="disclaimer">
<strong>Disclaimer:</strong> Adelaide Design Week is an independently run and curated, city-wide program. Submitting an EOI does not guarantee inclusion, funding, or support.
</aside>

</article>
