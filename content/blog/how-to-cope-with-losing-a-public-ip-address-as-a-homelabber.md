+++
title = "How to cope with losing a public IP address as a homelabber"
description = "What happens to your services when your residential IP address gets put behind a CGNAT? What is NAT and how does it work? Here I answer these questions, and talk about how I designed my network."
date = 2025-08-24
+++

# Preface

This post explains how IP routing, NATs and CGNATs (or double-NATs) work, discusses different strategies for homelabbers to bypass CGNAT restrictions, and focuses on Netbird as a solution.

This post is mainly intended for homelabbers, beginner network engineers, or curious system or DevOps administrators.

# Introduction

I used to have my own residential IP address before June 2025, and exposing services to the internet was trivial. I only needed to punch holes through my router (i.e., port forwarding), and the services were accessible from anywhere.

> Note that port forwarding is a potential attack surface, and should not be done carelessly. I heeded this warning and ensured I followed proper security practices (like zero-trust approaches, IP blocklisting, etc.).

In June 2025 my ISP (Internet Service Provider) decided to install their routers for everyone in the building. Given the guaranteed downtime, they decided to kill two birds with one stone and rob everyone of their public IP addresses, including me. We were put behind a CGNAT (Carrier Grade Network Address Translation).

A CGNAT functions like a NAT we all know and love: the router. It hands out private IP addresses that are unroutable from the WAN (Wide Area Network) to its hosts. When a host wants to access a website, the router changes the source IP address of the host (i.e., the private one) to the WAN IP address the router has received. This address is commonly a public-facing one. The router keeps track of which port (from its ephemeral port range) was used to send out the request, and returns the resources back to the correct host.

Since IPv4 addresses started running out and getting more expensive, NATs were introduced to allow multiple hosts to share the same IPv4 address.

I mentioned before that a router's WAN IP address doesn't have to be public. This is exactly where a CGNAT comes in: it hands out private IP addresses to the hosts (so routers), and translates them to public ones, just like a run-of-the-mill router would. This is why a network behind a CGNAT is commonly called a double-NAT.

So like hosts on the LAN can share a public IP address, different LANs on different routers behind a CGNAT can share one as well. Commonly a pool of public IP addresses is used.

Since I couldn't forward ports on the CGNAT to point to my router, which would then point to my home-server, I needed a different approach than port forwarding.

# Solution?

Since I was already using [WireGuard](https://www.wireguard.com/) to self-host VPNs to my home-servers, I decided to buy a cheap VPS, and "just use WireGuard", as many people recommended in forums, to expose my services.

I set up a WireGuard server on the VPS and a WireGuard client on my home-server that would always keep a connection with the server. This way, the home-server was reachable from only the VPS.

Once I made another subnet for the VPN, and forwarded the ports I wanted (so ports 80 and 443 for HTTP and HTTPS) from the VPS to the home-server, the setup worked great, and was reliable.

Only after I wanted to access the server from outside my home network did I encounter weird issues: SSH didn't work after forwarding the SSH port for my home-server. After debugging for a long time, and failing to find a solution online, I gave up.

Had the SSH connection worked, I still wouldn't've been satisfied. Every time I wanted to forward a port, using that port on the VPS would've been impossible. This was especially problematic for the HTTPS port (443) since it meant I could only serve websites from one machine.

While not sounding like a huge deal, I didn't want a suboptimal setup when I had heard of better alternatives, so I started investigating.

# Considerations

Before I could consider my options to continue exposing services to the internet, I needed to write down my requirements for the software/service:

 1. Ability to connect to my home network from anywhere
 2. Ability to act like an exit node (common VPN functionality)
 3. Allow me to expose any service I want on any port
 4. Integrate well with other servers I have
 5. Uncomplicated networking
 6. Allow me to only expose what I need to (zero-trust)
 7. Free and open-source software only, ideally self-hostable
 8. As few external third-party dependencies as possible
 9. Good documentation
10. Simple and reliable

I considered [Cloudflare tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/configure-warp/route-traffic/split-tunnels/), which allow you to expose anything you want using their proxies. I ultimately decided against it since it violates 7. and 8., and privacy reasons, even though it's free.

I then considered [Tailscale](https://tailscale.com/), which is a mesh VPN based on WireGuard. While a popular choice for connecting many hosts on different networks together, and having a free tier, their control-server is closed-source, and not self-hostable. This is not a huge privacy deal though since the control server only connects hosts to each other, and optionally acts as a relay for end-to-end encrypted data when the connection can't be established. I also didn't really like the mobile app.

[Headscale](https://headscale.net/stable/) is an alternative free and open-source self-hostable Tailscale-compatible control server (that was a lot of words), whose integral contributor also works at Tailscale. I briefly tried it out, but ultimately decided against using it since they don't support exit nodes, and don't plan on adding the functionality anytime soon. The documentation also wasn't comprehensive and I had trouble getting it to run properly on NixOS, my server operating system of choice.

My second to final consideration was [Zrok](https://zrok.io/) which is based on [OpenZiti](https://openziti.io/). I believe this would have been a solid choice, but I couldn't figure out how my network architecture would look like, and it ended up being too complicated to run on NixOS.

This is where I came across Netbird.

# Introducing Netbird

Similar to Tailscale, [Netbird](https://netbird.io/) is a mesh VPN based on WireGuard that allows devices to connect to each other peer-to-peer or fall back to a relay if NAT traversal fails.

To answer all my requirements, Netbird allows you to:

 1. Connect to a network with at least one Netbird peer (with support for high-availability with redundant peers)
 2. Use any peer as an exit node
 3. Proxy services very easily using private Netbird IPs
 4. Support for Linux, Android, Windows, Mac, iOS, and even OpenWRT routers
 5. Subnets are well supported, as well as DNS management, and different client profiles
 6. Supports zero-trust principles using groups, ACLs (Access Control Lists) with posture checks (minimum client requirements, IP filtering, etc.)
 7. Self-hostable, free and open-source software. They also offer a managed free tier
 8. The easy-to-comprehend management interface shows which peer is online/offline, and no critical feature seems to be lacking
 9. Great documentation at [docs.netbird.io](https://docs.netbird.io/), along with an active, friendly and helpful community of developers, and administrators
10. The management interface is easy to comprehend, and doesn't confuse the user with unnecessary options

That being said, I bought a cheap VPS, and deployed the management server there. From that point on, all I had to do was install the Netbird client on all my devices. Thankfully this is as easy as copy pasting a simple install script:
```bash, copy
curl -fsSL https://pkgs.netbird.io/install.sh | sh
```
and for NixOS, adding one line to my declarative config: 
```nix
services.netbird.enable = true;
```

The main benefit of Netbird was the hugely simplified management of peers, how easy ACLs were to set up, how straightforward the setup was, and how it allows me to have a clear overview of the status of the peers. Also compared to the setup with WireGuard I had before, peer-to-peer connections are now possible instead of always relaying everything. Not to mention, I really like the design of the management interface (if you couldn't tell (and haven't seen how it looks like)).

# Conclusion

Deploying Netbird on NixOS took some time since I couldn't find a guide for NixOS specifically, and had to go off reading documentation at many different places, reading source code, and experimenting. Eventually I managed to get it up and running, and decided to write [a guide for NixOS](https://lukadeka.com/blog/TODO) to spare potential headaches.

Netbird has been working great ever since the initial deployment.

Since the VPS has a publicly routable IP (how else would you access it?), all that's needed is to proxy the desired traffic to the home-server via the Netbird IP and that's all she wrote.

