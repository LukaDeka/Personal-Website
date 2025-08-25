+++
title = "Setting up Seafile on NixOS"
description = "After I decided I wanted to set up Seafile, a file server, I found little documentation for NixOS. After experimenting with the options, and asking the maintainer for help, I finally got a working configuration, and decided to write a wiki entry as well to help future NixOS newcomers."
date = 2024-12-03
+++

# Preface
After I decided I wanted to set up Seafile, a file server, I found little
documentation for NixOS.

After experimenting with the options, and asking the maintainer for help, I
finally got a working configuration, and decided to write a wiki entry as well
to help future NixOS newcomers.

This entry is also available on
[wiki.nixos.org](https://wiki.nixos.org/wiki/Seafile) and
[nixos.wiki](https://nixos.wiki/wiki/Seafile).

# Introduction

```
thing
```
```
thing
```

[Seafile](https://www.seafile.com/) is a file-hosting software
system with a simple web interface and client applications for file
access. Seafile's functionality is similar to file-hosting services
such as Dropbox and Google Drive.

As opposed to [Nextcloud](https://nextcloud.com/), Seafile offers simpler
user administration and better file-server performance.

# Setup
Minimal configuration of Seafile:
```nix, copy
  services.seafile = {
    enable = true;

    adminEmail = "admin@example.com";
    initialAdminPassword = "change this later!";

    ccnetSettings.General.SERVICE_URL = "https://seafile.example.com";

    seafileSettings = {
      fileserver = {
        host = "unix:/run/seafile/server.sock";
      };
    };
  };
```

Use nginx to serve Seafile from a unix socket:
```nix, copy
  services.nginx.virtualHosts."seafile.example.com" = {
    forceSSL = true;
    enableACME = true;
    locations = {
      "/" = {
        proxyPass = "http://unix:/run/seahub/gunicorn.sock";
        extraConfig = ''
          proxy_set_header   Host $host;
          proxy_set_header   X-Real-IP $remote_addr;
          proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header   X-Forwarded-Host $server_name;
          proxy_read_timeout  1200s;
          client_max_body_size 0;
        '';
      };
      "/seafhttp" = {
        proxyPass = "http://unix:/run/seafile/server.sock";
        extraConfig = ''
          rewrite ^/seafhttp(.*)$ $1 break;
          client_max_body_size 0;
          proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_connect_timeout  36000s;
          proxy_read_timeout  36000s;
          proxy_send_timeout  36000s;
          send_timeout  36000s;
        '';
      };
    };
  };
```

# Additional configuration
```nix, copy
  services.seafile = {
    # ...
    seafileSettings = {
      quota.default = "50"; # Amount of GB allotted to users
      history.keep_days = "14"; # Remove deleted files after 14 days

      fileserver = {
        host = "unix:/run/seafile/server.sock";
        web_token_expire_time = 18000; # Expire the token in 5h to allow longer uploads
      };
    };

    # Enable weekly collection of freed blocks
    gc = {
      enable = true;
      dates = [ "Sun 03:00:00" ];
    };
  };
```

To change the directory of the database, create the directory with the
appropriate permissions, `chown -R seafile:seafile` it and set:
```nix, copy
  services.seafile = {
    # ...
    dataDir = "/path/seafile/data";
  };
```

# Troubleshooting
The `initialAdminPassword` is set only once when the server is first
initialized. Any changes to it afterward will have no effect on it. If
you cannot log in for the first time, delete `/var/lib/seafile/data`,
remove the Seafile configuration from your config, rebuild, re-add it,
and the password will be set in the next rebuild.

Logs for Seafile and SeaHub (Seafile's web interface) are stored
in `/var/log/seafile/server.log` and `/var/log/seafile/seahub.log` respectively.

For additional options, refer to the [Seafile Admin
Manual](https://manual.seafile.com/13.0/config/).

