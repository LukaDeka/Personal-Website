+++
title = "Building an app-unaware multi-app proxy: One domain, many backends"
description = "A blog about how I build a reverse-proxy that proxies many services with one domain without the services being aware of the proxy."
date = 2026-07-01
updated = 2026-07-01

[extra]
long_description = "A blog about how I built a custom reverse-proxy inside a Java Spring app that handles proxying the requests to the right service based on path variables while the services aren't aware they're being proxied."
static_thumbnail = "https://lukadeka.com/images/building-an-app-unaware-multi-app-proxy.png"
+++

## Preface
At my job we provide software, and install sensors for buses/trains/trams that count passengers. The software aggregates the data, allowing it to be analyzed. One of the web-apps communicates directly with all of the sensors of each vehicle of the organization, gathering status, logs, and miscellaneous data. These sensors all have webservers that can be accessed via an IP, e.g. in the browser.

We have different types of sensors, many of which aren't manufactured inhouse, so we don't have control of the web-apps. This appeared to be a nuisance when we wanted the customers to be able to access the sensor applications along with us.

## Proposed solutions
The obvious idea was to grant access to the sensors via a VPN. While being the simplest solution, this was unfortunately rejected because it required each customer to install a VPN client, our provided certificates, and would cause possible complexity for our IT, along with ever-updating ACLs.

The following idea to "just use a reverse-proxy" wouldn't work since the customers had way too many sensors to manually maintain one-by-one with a reverse-proxy like nginx. Even though we have many different kinds of sensors, *none* of them supported being proxied from a specific path. This means we'd need a (sub)domain for each sensor, with an authentication guard behind each of them. Managing this across teams would mean: for each modified vehicle/sensor or login identity, the customer would have to submit a ticket, we'd have to forward it to IT, and wait for them to manually update it. This system only scales well on opposite day.

The IT tried to make their proxy work, and hardcoded paths from the same domain to the sensors, but this broke the apps that weren't designed to be proxied from somewhere other than the root of the domain (`/`). The "authentication guard" I mentioned before was only done via *IP whitelisting*, which, given the dynamic nature of IP addresses, is insecure as well.

So, what other solution was there? Naturally, I did what any other reasonable engineer would do: I promised my team to write a custom reverse-proxy inside our Java Spring app that handles proxying the requests to the right sensor based on path variables while the apps aren't aware they're being proxied - so I did just that.

## Challenges
Let's assume the API path is:

`https://example.com/api/v1/proxy/123/`

Which proxies to the 123rd app, which is running at e.g. `http://10.0.0.0/`.

A request to:

`https://example.com/api/v1/proxy/123/index.html`

should land at:

`http://10.0.0.0/index.html`.

Since the apps aren't aware they're being proxied, they make assumptions that the website *is* running at the root. This causes unintended behavior:


1) Root-relative fetches in the HTML like `src="/style.css"` resolve to wrong paths like `https://example.com/style.css`
2) Elements like CSS can make network requests that land at the wrong API path
3) Digest authentication can't be proxied since it was designed to prevent Man-In-The-Middle (MITM) attacks
4) Javascript updates the DOM to inject elements that can make more requests
5) Javascript can redirect the user to a wrong location, e.g. if it detects the browser isn't on a specific path
6) Apps can use relative paths with a backwards traversal like `src="../image.jpeg"` even though they're running on root, and break the API path

Here's how I addressed those:

## Solutions in detail

Fixing these, and more, required iteration, and creative solutions.

> 1\. Root-relative fetches in the HTML like `src="/style.css"` resolve to wrong paths like `https://example.com/style.css`

> 2\. Elements like CSS can make network requests that land at the wrong API path

To start, traditional reverse-proxies like nginx already handle these cases - rewriting HTML is trivial. I decided to make all `src`/`href`/`action` attributes have absolute paths, e.g. `src="/api/v1/proxy/123/style.css"`, while making sure 3rd party domains or other paths like these aren't rewritten:

`javascript:`, `mailto:john@example.com`, `{{ ... }}` (Angular variable)

> 3\. Digest authentication can't be proxied since it was designed to prevent Man-In-The-Middle (MITM) attacks

Here's a TLDR on how Digest auth works:
* The server sends the client a realm (predetermined string) and a nonce (random number)
* The client generates an MD5 hash (response) using that nonce, the username, password, the request URI path, and other stuff
* The server knows all of these in advance and validates the hash

Here's a sample processed `Authorization` header by the browser sent to the server:
```
Digest
username="secret_agent_007",
realm="example.com",
nonce="k6a95db6b55k5lrw5yezq3p2lu4l6k2m",
uri="/",
response="g0s8qt3n5kf588fm0efib2f4o4g0x2yv"
```

If Digest auth were to be proxied, the browser would compute an incorrect hash because of the API path in the `uri` field.

While I could've gone for Basic auth, and computed the hashes inside the proxy, I decided against that approach. This would've added more complexity, and would've made this part of the proxy stateful.

Instead, I utilized the app's database, which already stores the credentials for the sensors. So now, if a `401 UNAUTHORIZED` is received for any request to the sensor, it's retried using the credentials from the DB using Digest auth.

Since Digest auth acts as a "session token" of sorts, I put that token in a cookie `DIGEST_AUTH` that I set in the browser. This way, if the proxy receives a request with that cookie, it assumes the user is authenticated and constructs the correct `Authorization` header.

This comes with a drawback - if the credentials are ever changed, the proxy will stop working until the credentials in the database are manually updated. In our case this can be done simply, and the tradeoff is definitely worth it.


> 4\. Javascript updates the DOM to inject elements that can make more requests

Handling this was a bit tricky. Since Angular does this aggressively, ignoring or hardcoding this wouldn't work. The only approach that worked was monkeypatching JavaScript by inlining a script tag in the initial HTML. The Javascript listens to updates, and makes sure the paths are generated correctly.

> 5\. Javascript can redirect the user to a wrong location, e.g. if it detects the browser isn't on a specific path

Inside the same `<script>` tag, I inlined a class `window.__PROXY_LOCATION__`, a mock of `window.location`, along with its methods. Afterward, I added a Regex inside the proxy that replaces `window.location`, `document.location`, `location` etc. safely with my mock class in the Javascript. This is necessary because the proxy doesn't run any Javascript and can't intervene during execution-time. The mock class makes sure that redirects, so `href`, `pathname`, `assign`, `replace`, and so on are handled with consideration of the proxy prefix (`/api/v1/proxy/{SENSOR_ID}/`).

> 6\. Apps can use relative paths with a backwards traversal like `src="../image.jpeg"` even though they're running on root, and break the API path

While regular relative imports get handled correctly, ones that try a backwards traversal (`../`) while still being on root break the API path, e.g. `http://10.0.0.0/image.jpeg`. The backwards traversal here has no good reason to exist, since `../image.jpeg` and `./image.jpeg` mean the same thing on the root.

To handle network requests that might've slipped through the Javascript patching, or paths with backwards traversal, I added a Service Worker which is fetched for each page.

The Service Worker intercepts all network requests, and double-checks that requests to the API path have the correct path. E.g. if a resource `../image.jpeg` was resolved to

`https://example.com/api/v1/proxy/image.jpeg`

instead of the correct

`https://example.com/api/v1/proxy/123/image.jpeg`,

the Service Worker would try to fix the path by doing a greedy find-and-replace of the API path.

While this isn't a perfect solution, and it doesn't work for backwards-relative paths with too many `../`s, there weren't many options to handle apps that put `../` at the root for the fun of it.

## Other challenges
While there were other challenges as well, the aforementioned ones were the most interesting. I felt like I wasn't going to overcome some of them, and there wasn't going to be an elegant (or even acceptable) solution that didn't include hardcoding. Nevertheless I didn't give up and managed to get the unorthodox proxy working piece-by-piece.

Other challenges included:
* Proxying WebSockets (stateful)
* Handling `multipart/x-mixed-replace` streams in a non-blocking way
* Cookie path rewriting
* Injecting a `<base>` tag in the HTML, and dealing with apps that also inject one
* Upgrading 3rd party HTTP requests to HTTPS implicitly
* Maintaining browser interactivity
* Testing that one change didn't break other sensors

## Conclusion
While the app isn't perfect, it's still incredible that it works, and is more-or-less generalizable for every application type. It was a really interesting challenge, and I learnt a lot about network protocols, proxies, browsers, frontend/backend interactions, SSL, and many more.

Special thanks to my online friend who works at Netflix for helping me with the design and my roadblocks in the Java implementation.
