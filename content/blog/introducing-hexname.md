+++
title = "Introducing HexName - a free DNS service"
description = "Here I talk about how I developed the entirety of HexName, the free service for domain registration with DNS/DDNS management."
date = 2026-02-04
updated = 2026-02-04

[extra]
long_description = "When learning about homelabbing and DNS, I tested out many free DDNS services - none of which I'd recommend nowadays. Because of the lack of better alternatives, and for learning purposes, I decided to build a reliable, forever-free alternative I can confidently recommend to others. After 4.5 months, I finally finished the backend, frontend, and deployed my app to the public."
static_thumbnail = "https://lukadeka.com/images/introducing-hexname.png"
+++

## Introduction
After 4.5 months of work, I'm proud to finally announce the launch of my project <a target="_blank" rel="noopener noreferrer dofollow" href="https://hexname.com">HexName</a>, the backend/frontend/infrastructure of which I built on my own.

<div class="center">
  <img style="margin: auto;" width=700 src="/images/hexname-homepage.webp"/>
</div>

## The motivation
When I first started out with homelabbing, I eventually wanted to make my services available to the public via port-forwarding.
To not have to remember my dynamic IP every time it updated, I used [No-IP](https://noip.com), a Dynamic DNS (DDNS) service that lets you periodically update a DNS record to point to dynamic IP, like `example.hopto.org`.

The problem with No-IP was that you had to log in and confirm your domain *every 30 days*, otherwise it would be deactivated. I found this really annoying.

I then discovered [DuckDNS](https://duckdns.org), a similar service that lets you register up to 5 subdomains like `example.duckdns.org`.

After having used their services for quite a while, I can say that their service is slow and unreliable. The DNS resolution frequently times out, and you end up having to retry until it eventually resolves, or access your server via an IP (which defeats the whole purpose of DDNS).

Additionally, both providers only allow you to publish a single DNS record per domain, disallowing any fun/advanced DNS configurations.

There's also <a href="https://freedns.afraid.org/">afraid.org</a> which has been operated since 2001 and serves multiple thousand DNS queries per second. They also offer DDNS with subdomain registration up to 5 subdomains for free, but with an added twist - people can "submit" their domains to let other people register subdomains off of it.

There is an obvious problem with this though, as addressed in the [FAQ](https://freedns.afraid.org/faq/):
> Q: How can I protect myself from using a domain that may disappear from `freedns.afraid.org` and/or become "broken"?

> A: "... If you wish to use a shared domain in the system for any sort of long term use (like email/web services) then it is recommended you use one of the domains owned by me personally ..."

This kind of defeats the whole purpose of the idea.

Additionally, a couple of things stood out to me that I didn't like about the service:
* The password length is limited to 4-16 characters (4 characters in 2026, really? We're still doing that?). I usually generate much longer passwords with my password manager
* The registration form didn't include the correct attributes in the HTML for my browser/password manager to save/autofill the login credentials automatically
* Every action (registering a subdomain/domain) required a captcha that I didn't find particularly easy to solve
* There was no possibility to register subdomains off of the subdomain, e.g. `mail.example.mooo.com`

This inspired me to provide a better DNS service where users had freedom to do anything they wanted with their domain - run a mailserver, host various services - even change the nameservers, and all that without annoying the user, for free, forever.

## Development cycle
Since I'm currently studying computer science full time at a university, as well as working a part-time job, I didn't have much time to work on the project. Nevertheless I decided to try and dedicate my free time to the project.

### Backend

I started working on the backend for the project in the middle of October. I decided this was a great opportunity to learn a programming language I had heard great things about - Rust. I have to say, I absolutely loved the experience and the community behind it, providing great support and packages.

While developing the backend, I had to integrate it with [PowerDNS's authoritative nameserver](https://doc.powerdns.com/authoritative/index.html), the DNS server I settled on to run. The API wasn't straightforward, forcing me to write helper functions to interact with it properly, but eventually I got it working.

After many iterations, refactors, and switching the routing framework, I finished working on the backend two months after starting, afterward only implementing after-thought features and bugfixes.

### Frontend
Since I had no previous experience with frontend development (except building this stunning portfolio website), I did a lot of research beforehand, comparing different technologies I could use.

I settled on [SvelteKit](https://svelte.dev/docs/kit/introduction) for routing/reactivity, along with [TailwindCSS](https://tailwindcss.com/), and a component library for it called <a target="_blank" rel="noopener noreferrer dofollow" href="https://daisyui.com/">DaisyUI</a>.

DaisyUI significantly helped with the initial design of the website, thanks to which I didn't get stuck for hours trying to tweak login forms and buttons.

After three months, I finished the frontend as well. I decided to make the source-code publically available at [my personal Git repo](https://git.lukadeka.com/LukaDeka/HexName-Frontend).

Since it's my first real experience with frontend development, there are glaring issues with the website, but overall I'm proud of how it turned out. You can check out a live demo at <a target="_blank" rel="noopener noreferrer dofollow" href="https://hexname.com">hexname.com</a>.

### Deployment
Being familiar with homelabbing and hosting my services with NixOS, the deployment was a breeze. I got another VPS from Hetzner Cloud and installed NixOS on it.

After playing around with oci-containers and making sure the services can reliably interact with each other, I set up logical replication with Postgres so that every change would also be reflected on the second nameserver in real-time, which I'm running on my personal Hetzner instance (the one serving this blog).

Other than that, I set up incremental backups of the database to be executed every 10 minutes to ensure no data is lost. Because I'm running/backing up the data between two VPSes in different regions, *technically* I'm running multi-region.

Additionally, to send/receive emails for my project, I set up another mailserver in two days, which gets a 10/10 score on [Mail-Tester](https://www.mail-tester.com/).

For monitoring, I use Uptime-Kuma to make sure the services stay up-and-running.

The NixOS configuration for the entire deployment is also available at [my Git repo](https://git.lukadeka.com/LukaDeka/HexName-NixOS).

## The product

<div class="center">
  <img style="margin: auto;" width=700 src="/images/hexname-dashboard.webp"/>
</div>

As of now, <a target="_blank" rel="noopener noreferrer dofollow" href="https://hexname.com">HexName</a> offers the registration of 20 total subdomains off of the following domains:
* hexname.com
* loves-beer.com
* dickdns.org (you can tell why I went with this last one)

As well as 200 DNS records per subdomain from the supported record types:
* A
* AAAA
* CNAME
* TXT
* MX
* NS
* SRV

Additionally, HexName offer a DDNS service for `A` records, allowing users to update the IP periodically, just like the DDNS providers mentioned before.

Practically, all of this means that users can register domains like `george.loves-beer.com`, use them to host their services (like game servers), blogs, and even receive emails with them (e.g. `contact@george.loves-beer.com`).

## Credits
While learning Rust for the backend, and Svelte, I had a lot of questions about language syntax, semantics, as well as general programming concepts. Fortunately, I'm in a very helpful online community where they were able to assist me along the journey.

Doesn't matter what you're learning, being around experienced people is a significant help.

## Moving forward
Since I don't expect to make any money off this project, I made it solely for the sake of wanting to offer a better free service, as well as a learning opportunity.

I plan to support/maintain the project for a long time as well as update the programs/system periodically. I don't expect this to take too much time since I'm familiar with the technologies used for deployment and I went with a minimalistic approach.

Currently, the yearly costs of the project are:
* €49.8 for the VPS (ns1.hexname.com)
* $14.98 for the domain hexname.com
* $14.98 for the domain loves-beer.com
* $12.98 for the domain dickdns.org

So `101.0$/year` or `8.5$/month` in total.

If you'd like to support the project, feel free to <a target="_blank" rel="noopener noreferrer dofollow" href="https://hexname.com/#contact">contact me here</a>.

