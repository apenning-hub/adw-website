---
title: team
navLabel: team
navOrder: 3
permalink: /team/
layout: base.njk
description: The people behind Adelaide Design Week 2026.
---

<article class="page prose">

# team

Adelaide Design Week is run by a small, dedicated team — designers, coordinators and organisers working across the city.

<dl class="streams team">
  <dt>Hannah White</dt>
  <dd>event coordination</dd>

  <dt>Dre Fuzz</dt>
  <dd>exhibition coordination</dd>

  <dt>Lara Merrington</dt>
  <dd>exhibition coordination</dd>

  <dt>Bronwyn Marshall</dt>
  <dd>operations, partnership + sponsorship, communications</dd>
</dl>

## 2025 contributors

ADW exists because of the people who've helped shape it — past and present. Thanks to:

<ul class="contributors">
{% for c in contributors2025 %}
  <li>{{ c.name }} <a href="{{ c.url }}" target="_blank" rel="noopener noreferrer">{{ c.handle }}</a></li>
{% endfor %}
</ul>

## join the team

There are ongoing opportunities to volunteer and contribute to Adelaide Design Week on-the-ground support during the program. Submit your interest through the <a href="{{ '/eoi/' | url }}">EOI form</a> under the **Team** stream.

For anything else, see <a href="{{ '/contact/' | url }}">contact</a>.

</article>
