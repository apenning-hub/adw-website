---
title: eois are closed
navLabel: eoi
navOrder: 2
permalink: /eoi/
layout: base.njk
description: Adelaide Design Week 2026 — expressions of interest across five streams (Project, Collaborate, Host, Team, or Sponsor). EOIs are now closed.
---

<article class="page prose">

# eois are closed

Thank you — Adelaide Design Week 2026 received an incredible number of entries. Selected applicants will be notified in mid July 2026.

In the meantime, keep your eyes peeled for the upcoming **Design Mixer** at Honeydripper — where new collaborations can be started over a drink or two. Tickets coming soon.

EOIs were invited under any of these streams:

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

<p class="program-link"><a href="{{ '/gallery/' | url }}">see the gallery →</a></p>

## what applicants confirmed

Applicants were asked to confirm the following before submitting:

<ul>
  <li>You, or a representative for you / your project, will be available and responsible pre, during and post event.</li>
  <li>You have your own insurance.</li>
  <li>You have read and understood the <a href="{{ '/terms/' | url }}">terms and conditions</a>.</li>
</ul>

</article>

<section class="program-section">

<details class="program-2025">
<summary>see what happened in 2025</summary>

<p>The 2025 program ran 20–24 August across 19 events — a snapshot of the kinds of work that fits ADW.</p>

<ul class="program-grid">
{% for e in program2025 %}
  <li class="program-card">
    <div class="program-poster"><img src="{{ ('/assets/images/program-2025/' + e.image) | url }}" alt="{{ e.title }} poster" loading="lazy"></div>
    <h4 class="program-title">{{ e.title }}</h4>
    <p class="program-meta">{{ e.meta | safe }}</p>
  </li>
{% endfor %}
</ul>

<p class="program-meta-source">See the full 2025 program: <a href="{{ '/everywhere-2025/' | url }}">every*where 2025 →</a></p>

</details>

</section>

<article class="page prose">

<aside class="disclaimer">
<strong>Disclaimer:</strong> Adelaide Design Week is an independently run and curated, city-wide program. Submitting an EOI does not guarantee inclusion, funding, or support.
</aside>

</article>
