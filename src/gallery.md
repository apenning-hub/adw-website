---
title: gallery
permalink: /gallery/
layout: base.njk
lightbox: true
description: A look at Adelaide Design Week — openings, talks, exhibitions, and the people who showed up.
---

<article class="page prose">

# gallery

A look at Adelaide Design Week — openings, talks, exhibitions, and the people who showed up.

</article>

<ul class="bento-grid" data-lightbox-grid>
{% for item in vibe %}
  <li class="bento-item"><a href="{{ ('/assets/images/vibe/' + item.filename) | url }}" aria-label="View {{ item.alt }}"><img src="{{ ('/assets/images/vibe/' + item.filename) | url }}" alt="{{ item.alt }}, ADW 2025" loading="lazy"></a></li>
{% endfor %}
</ul>

<article class="page prose">

<p class="back-link"><a href="{{ '/eoi/' | url }}">← back to how to apply</a></p>

</article>
