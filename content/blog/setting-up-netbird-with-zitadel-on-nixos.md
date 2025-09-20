+++
title = "Setting up Netbird with Zitadel on NixOS"
description = "Here I explain in detail how to set up Netbird's management server with NixOS declaratively. This blog post is provided as a manual."
date = 2025-08-28
updated = 2025-09-20

[extra]
long_description = "Deploying Netbird's management server on NixOS proved particularly difficult since no step-by-step guide was provided for NixOS. I had to go off reading documentation at many different places, including source code, and experimenting. Eventually, I was able to get a working setup after some trial and error, and debugging."
static_thumbnail = "https://lukadeka.com/images/setting-up-netbird-with-zitadel-on-nixos.png"
+++


## Preface

Deploying Netbird's management server on NixOS proved particularly difficult since no step-by-step guide was provided for NixOS. I had to piece things together by reading documentation from many different documentation sources, including source code, and experimenting.

Since the options at [search.nixos.org](<https://search.nixos.org/options?channel=unstable&>) were well documented, I was able to get a working setup after some trial and error, and debugging.

## Introduction

[NetBird](https://netbird.io/) is an open-source VPN management platform built on top of WireGuard making it easy to create secure private networks for your organization or home.

## Setup

Netbird requires an Identity Provider for authentication/authorization. The supported self-hosted options are:

- Zitadel
- Keycloak
- Authentik

### Zitadel

#### Configuration

Here's an example config for Zitadel, along with its database:

```nix, copy
let
  domain = "example.com";
in
{
  services.zitadel = {
    enable = true;
    openFirewall = true;

    masterKeyFile = "/path/to/zitadel/master_key";
    extraStepsPaths = [ "/path/to/zitadel/admin_steps" ];
    extraSettingsPaths = [ "/path/to/zitadel/settings" ];

    tlsMode = "external";
    settings = {
      Port = 39995;
      ExternalPort = 443;
      ExternalDomain = "auth.${domain}";
      Database = {
        postgres = {
          Host = "127.0.0.1";
          Port = 5432;
          Database = "zitadel";
          MaxOpenConns = 15;
          MaxIdleConns = 10;
          MaxConnLifetime = "1h";
          MaxConnIdleTime = "5m";
        };
      };
    };
  };

  # Postgres database for Zitadel
  virtualisation.oci-containers.containers.zitadel-db = {
    image = "postgres:17";
    ports = [ "5432:5432" ];
    environmentFiles = [
      "/path/to/zitadel/postgres_env"
    ];
    volumes = [
      "/var/lib/zitadel-db:/var/lib/postgresql/data"
    ];
  };

  networking.firewall.allowedTCPPorts = [ 80 443 ];

  # Ensure the mounted directory for the database exists
  system.activationScripts.makeZitadelDir = lib.stringAfter [ "var" ] ''
    mkdir -p /var/lib/zitadel-db
  '';

  # Proxy the SSO provider
  services.nginx.enable = true;
  services.nginx.virtualHosts."auth.${domain}" = {
    forceSSL = true;
    enableACME = true;
    locations."/" = {
      proxyPass = "http://127.0.0.1:39995";
      proxyWebsockets = true;
      extraConfig = ''
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
      '';
    };
  };

  security.acme = {
    acceptTerms = true;
    defaults.email = "you@example.com";
  };
}
```

#### Environment variables

Generate the `master_key` with:

```sh, copy
tr -dc A-Za-z0-9 </dev/urandom | head -c 32
```

Create and populate the `admin_steps` file:

```yaml, copy
FirstInstance:
  InstanceName: Zitadel
  Org:
    Human:
      UserName: John
      FirstName: John
      LastName: Lackland
      DisplayName: John
      Password: make-sure-this-is-secure
      PasswordChangeRequired: false
      Email:
        Address: you@example.com
        Verified: true
```

Create and populate the `settings` file:

```yaml, copy
Database:
  postgres:
    User:
      Username: zitadel
      Password: make-sure-this-is-secure
      SSL:
        Mode: disable
    Admin:
      Username: postgres
      Password: make-sure-this-is-secure
      SSL:
        Mode: disable
```

> The `postgres` user is used as a oneshot to initialize the `zitadel` user after the initial database creation.

Create and populate the `postgres_env` file:

```toml
POSTGRES_USER=postgres
POSTGRES_PASSWORD=set-the-same-password-as-in-settings
POSTGRES_DB=postgres
```

#### Registration

Afterward, log in with your `Admin` account at `auth.example.com`, and follow Netbird's documentation on [how to configure Zitadel](<https://docs.netbird.io/selfhosted/identity-providers#zitadel>).

> Make sure to put `netbird.example.com` as the domain in the **Redirect Settings** and not `auth.example.com`.

Put the `ClientSecret` from Zitadel in the `client_secret` file, and hold on to the `Client ID`.

> The `Client ID` is *not* a secret so it's okay to hardcode it in the NixOS configuration.

### Netbird

Afterward, set up Netbird:

```nix, copy
{ config, lib, ... }:

let
  domain = "example.com";
  netbirdDomain = "netbird.${domain}";
  clientId = "<YOUR_CLIENT_ID_FROM_ZITADEL>";
in
{
  imports = [ ./zitadel.nix ];

  services.netbird.server = {
    enable = true;
    enableNginx = true;
    domain = netbirdDomain;

    coturn = {
      enable = true;
      domain = netbirdDomain;
      passwordFile = "/path/to/netbird/turn_password";
    };

    signal = {
      enable = true;
      enableNginx = true;
      domain = netbirdDomain;
    };

    dashboard = {
      enable = true;
      enableNginx = true;
      domain = netbirdDomain;
      settings = {
        AUTH_AUTHORITY = "https://auth.${domain}";
        AUTH_CLIENT_ID = clientId;
        AUTH_AUDIENCE = clientId;
      };
    };

    management = {
      enable = true;
      enableNginx = true;
      domain = netbirdDomain;
      turnDomain = netbirdDomain;
      singleAccountModeDomain = netbirdDomain;
      oidcConfigEndpoint = "https://auth.${domain}/.well-known/openid-configuration";

      settings = {
        Signal.URI = "${netbirdDomain}:443";

        HttpConfig.AuthAudience = clientId;
        IdpManagerConfig.ClientConfig.ClientID = clientId;
        DeviceAuthorizationFlow.ProviderConfig = {
          Audience = clientId;
          ClientID = clientId;
        };
        PKCEAuthorizationFlow.ProviderConfig = {
          Audience = clientId;
          ClientID = clientId;
        };

        TURNConfig = {
          Secret._secret = "/path/to/netbird/turn_password";
          CredentialsTTL = "12h";
          TimeBasedCredentials = false;
          Turns = [
            {
              Password._secret = "/path/to/netbird/turn_password";
              Proto = "udp";
              URI = "turn:${netbirdDomain}:3478";
              Username = "netbird";
            }
          ];
        };
        Relay = {
          Addresses = [ "rels://${netbirdDomain}:33080" ];
          CredentialsTTL = "24h";
          Secret._secret = "/path/to/netbird/relay_secret";
        };
        DataStoreEncryptionKey._secret = "/path/to/netbird/data_store_encryption_key";
      };
    };
  };

  # Make the env available to the systemd service
  systemd.services.netbird-management.serviceConfig = {
    EnvironmentFile = "/path/to/netbird/setup.env";
  };

  # Override ACME settings to get a cert
  services.nginx.virtualHosts = lib.mkMerge [
    {
      "${netbirdDomain}" = {
        enableACME = true;
        forceSSL = true;
      };
    }
  ];

  # Run the Netbird relay with TLS to allow relaying over TCP
  virtualisation.oci-containers.containers.netbird-relay = {
    image = "netbirdio/relay:latest";
    ports = [
      "33080:33080"
    ];
    volumes = [
      "/var/lib/acme/${netbirdDomain}/:/certs:ro"
    ];
    environment = {
      NB_LOG_LEVEL = "info";
      NB_LISTEN_ADDRESS = ":33080";
      NB_EXPOSED_ADDRESS = "rels://${netbirdDomain}:33080";
      NB_TLS_CERT_FILE = "/certs/fullchain.pem";
      NB_TLS_KEY_FILE = "/certs/key.pem";
    };
    environmentFiles = [
      "/path/to/netbird/relay_secret_container"
    ];
  };

  networking.firewall.allowedTCPPorts = [ 80 443 3478 10000 33080 ];
  networking.firewall.allowedUDPPorts = [ 3478 5349 33080 ];
  networking.firewall.allowedUDPPortRanges = [{
    from = 40000;
    to = 40050;
  }]; # TURN ports
}
```

#### Environment files

Generate the `turn_password` and `data_store_encryption_key` with:

```sh, copy
openssl rand -base64 32
```

Generate the `relay_secret` with:

```sh, copy
openssl rand -base64 32 | sed 's/=//g'
```

And also put it in the `relay_secret_container` file for the Podman container:

```toml, copy
NB_AUTH_SECRET=the-same-secret-as-in-relay-secret
```

Create and populate the `setup.env` file:

```toml, copy
NETBIRD_AUTH_OIDC_CONFIGURATION_ENDPOINT="https://auth.example.com/.well-known/openid-configuration"
NETBIRD_USE_AUTH0=false # Since we're using Zitadel
NETBIRD_AUTH_CLIENT_ID="<YOUR_CLIENT_ID_FROM_ZITADEL>"
NETBIRD_AUTH_SUPPORTED_SCOPES="openid profile email offline_access api"
NETBIRD_AUTH_AUDIENCE="<YOUR_CLIENT_ID_FROM_ZITADEL>"
NETBIRD_AUTH_REDIRECT_URI="/auth"
NETBIRD_AUTH_SILENT_REDIRECT_URI="/silent-auth"

NETBIRD_AUTH_DEVICE_AUTH_PROVIDER="hosted"
NETBIRD_AUTH_DEVICE_AUTH_CLIENT_ID="<YOUR_CLIENT_ID_FROM_ZITADEL>"

NETBIRD_MGMT_IDP="zitadel"
NETBIRD_IDP_MGMT_CLIENT_ID="netbird"
NETBIRD_IDP_MGMT_CLIENT_SECRET="<YOUR_CLIENT_SECRET_FROM_ZITADEL>"
NETBIRD_IDP_MGMT_EXTRA_MANAGEMENT_ENDPOINT="https://netbird.example.com/management/v1"
NETBIRD_MGMT_IDP_SIGNKEY_REFRESH=true

NETBIRD_DOMAIN="netbird.example.com"
NETBIRD_DISABLE_LETSENCRYPT=true # Since Netbird is behind nginx
NETBIRD_MGMT_API_PORT=443
NETBIRD_SIGNAL_PORT=443
TURN_MIN_PORT=40000
TURN_MAX_PORT=40050
```

#### Cloud providers

Many cloud providers like Hetzner Cloud use stateless firewalls (since they're cheaper to run than SPI firewalls). These can interfere with Netbird's operation.

If your VPS provider uses a stateless firewall, you have to open up the required dynamic ports that Netbird uses in the cloud provider's UI.

To see which ports you need to open, run:

```sh, copy
sudo cat /proc/sys/net/ipv4/ip_local_port_range
```

See [additional configurations for cloud providers](https://docs.netbird.io/selfhosted/selfhosted-guide#advanced-additional-configurations-for-cloud-providers).

## Additional configuration

To enable the Netbird client, set:

```nix, copy
  services.netbird.enable = true;
```

## Troubleshooting

### Setup issues

The generated configuration for the management interface is stored in `/var/lib/netbird-mgmt/management.json`. Verify this file if you suspect the environment variables aren't being applied properly, or to check if you're correctly overriding [the defaults](<https://search.nixos.org/options?channel=unstable&show=services.netbird.server.management.settings&query=services.netbird.server.management.settings>) with `services.netbird.server.management.settings`.

You can check if the TURN/STUN and Relay servers are working properly with the online tester [Trickle ICE](<https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/>). A [simple guide for troubleshooting](https://docs.netbird.io/selfhosted/troubleshooting) is provided here by Netbird.

### Client issues

Run `netbird status -d` to check the details of the client as well as available relays. This also shows the connection status with other peers.

A more detailed description of diagnosing client issues can be found in [Netbird's documentation](<https://docs.netbird.io/how-to/troubleshooting-client>).

