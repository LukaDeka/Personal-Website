+++
title = "Rescuing NixOS stuck on Stage 1 boot"
description = "This is how I recovered my NixOS host when it was getting stuck on Stage 1 boot on all generations."
date = 2025-10-27
updated = 2025-10-27

[extra]
long_description = "When my main server was refusing to boot past Stage 1 and all of my NixOS generations were indefinitely waiting for a kernel module, vfio_pci, to load, I had to rescue my system. So I live-booted on the machine and rescued it as I describe here."
static_thumbnail = "https://lukadeka.com/images/rescuing-nixos-stuck-on-stage-1-boot.png"
+++

## Introduction

One of the main selling points of NixOS is that it allows you to have many different binaries of the same program at the same time. Along with program isolation and dependency management, this enables the user to have many of the so-called NixOS generations at the same time.

How it works is simple: when applying any change to the system, like installing a program or changing an option declaratively, you have to rebuild the system. You can either switch to it immediately like so:

```bash, copy
sudo nixos-rebuild switch
```

or switch to it only when you reboot the machine:

```bash, copy
sudo nixos-rebuild boot
```

If the rebuild succeeds, it creates a new generation. The user is still able to switch to a previous generation though, and this comes in very handy when either a rebuild succeeds but the system is left unusable. Or if something hangs/breaks after a reboot, you are able to boot into a different generation.

## The issue

I have a service enabled that garbage-collects previous generations older than 2 weeks:
```nix, copy
nix.gc = {
  automatic = true;
  dates = "Fri *-*-* 04:00:00";
  options = "--delete-older-than 14d";
};
```

This means, if I were to make a change that broke the booting sequence of my system, and I only noticed it 2 weeks after, I'll be left with an unbootable system. While this might sound scary, it doesn't happen often. Unluckily for me, this is exactly what happened.

My issue was that the system was waiting indefinitely for the kernel module `vfio_pci` to load, which wasn't responding. After making sure there were no timeouts in place, I rebooted the system into a [NixOS minimal installation image](https://nixos.org/download/#:~:text=without%20a%20desktop.-,Minimal%20ISO%20image,-The%20minimal%20installation) and began diagnosing.

## Fixing the issue

I'm using `zfs` for my boot drive, so the first step was to mount it.

```bash, copy
# Escalate your privileges
sudo su

# Load the zfs kernel module
modprobe zfs

# List all available pools (that are not imported)
zpool import

# Show all available datasets
zfs list
```

Output:
```c
NAME                           USED  AVAIL  REFER  MOUNTPOINT
nvmepool                      51.3G   406G    96K  none
nvmepool/home                  156M   406G   156M  legacy
nvmepool/nix                  16.7G   406G  16.7G  legacy
nvmepool/root                 11.8M   406G  11.8M  legacy
nvmepool/var                  1.35G   406G  1.35G  legacy
```

Here, `nvmepool` is the name of my `zpool`.

Now create the directories to mount the datasets on:
```bash, copy
mkdir -p /mnt/home /mnt/nix /mnt/root /mnt/var
```

and mount them:
```bash, copy
mount -t zfs nvmepool/root /mnt
mount -t zfs nvmepool/home /mnt/home
mount -t zfs nvmepool/nix /mnt/nix
```

> Note: `nvmepool/root` refers to the `/` directory, also known as the root directory, and **not** to the `/root/` directory, which is the root user's home directory.

The boot directory also has to be mounted explicitly for NixOS to be able to build generations, so find out which is your boot partition:
```bash
$ lsblk --fs
NAME        FSTYPE     FSVER LABEL    UUID                FSAVAIL FSUSE% MOUNTPOINTS
nvme0n1
├─nvme0n1p1 vfat       FAT32 boot     6445-6413            906.6M    11% /boot
└─nvme0n1p2 zfs_member 5000  nvmepool 6733023062829592015
```

Here, look for `vfat`, or for the `EFI` or `ESP` label. The boot partition shouldn't be larger than a few gigabytes.

Afterward, mount it:
```bash, copy
mount /dev/nvme0n1p1 /mnt/boot
```

In my case, I also had to mount these directories:
```bash, copy
mount --rbind /dev /mnt/dev
mount --rbind /sys /mnt/sys
mount --rbind /proc /mnt/proc
```

Finally, enter the mounted system:
```bash, copy
nixos-enter --root /mnt
```

Make sure networking works (for cache.nixos.org):
```bash, copy
ping google.com
```

Then, navigate to your NixOS config directory, edit and revert the changes manually, and execute:
```bash, copy
nixos-rebuild boot
```

Or this, if you're using flakes:
```bash, copy
nixos-rebuild boot --flake .#
```

If that succeeds, exit the chrooted environment:
```bash, copy
exit
```

and export the `zpool` cleanly:
```bash, copy
zpool export nvmepool
```

> Note: the last step isn't really necessary if you don't have [this NixOS option](https://search.nixos.org/options?channel=unstable&show=boot.zfs.forceImportRoot) set:
> `boot.zfs.forceImportRoot = true;`

Finally reboot the system (and make sure not to boot into the live image). Afterward, you should be able to boot into your system normally.

