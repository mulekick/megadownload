# Megadownload

*[Browse the internet for content you like](https://raw.githubusercontent.com/mulekick/megadownload/master/platformslist) and save it to your local hard drive in minutes. Save bandwidth and free yourself of ads.*

## Contents
- [Prerequisites](#prerequisites)
- [How to install](#how-to-install)
    - [FFmpeg](#install-ffmpeg-first)
    - [megadownload](#install-the-program)
- [How to use](#how-to-use)
    - [Create a HTTP session file](#create-a-http-session-file)
    - [Run the program](#run-the-program)
    - [Download the content](#download-the-content)
- [Some advice](#some-advice)
    - [Using options](#using-options)
    - [Things you need to know](#things-you-need-to-know)
    - [Standard mode](#standard-mode)
    - [Extensive mode](#extensive-mode)
- [Notes](#notes)

## Prerequisites
   - Linux distro or WLS2 (debian 10.4.0 recommended)
   - GNU Bash shell (version 5.0.3 recommended)
   - node.js (version 14.17.4 recommended)
   - FFmpeg (version  4.1.6-1~deb10u1 recommended)
   - npm (version 7.20.3 recommended)
   - git (version 2.20.1 recommended)

## How to install

### Install FFmpeg first :
   - [FFmpeg provides officially supported packages for Debian, Ubuntu, Fedora and Red Hat](https://ffmpeg.org/download.html)
   - To install, type : `sudo apt update && sudo apt install ffmpeg`
   - Afterwards, ensure installation succeded : `ffmpeg -version`

### Install the program :
   - Navigate to your install directory and type :
   - `git clone https://github.com/mulekick/megadownload.git`
   - `cd megadownload`
   - `npm install`

## How to use

### Create a HTTP session file
   - Open your web browser and launch developer tools (F12).
   - Start recording your HTTP session (click 'Network' tab, then Ctrl+E to start/stop recording).
   - Go to [your favorite platforms](https://raw.githubusercontent.com/mulekick/megadownload/master/platformslist) and watch/listen to content.
   - Once done, save your HTTP session to a .har file ('Network' tab, 'All', right click any item then 'Save all as HAR with content').

### Run the program
   - Open your shell, navigate to your install directory and type :
```bash
./megadownload.js -i /path/to/your/http/session/file -o /path/to/your/download/directory
```

### Download the content
   - Review the duration/quality of the media probed from your HTTP session file and confirm.
   - Wait for the files to download.
   - Enjoy ad free, network latency free content !

*One major limitation of this program is that **_downloaded files are given random names_**. If you want to change the files names after download, navigate your browser's history and use durations to match downloaded files with viewed content.*

**The servers urls you access when viewing content _often expire after a few hours_. Don't wait too long before running the program on your recorded HTTP sessions.**

**Also, note that your PC going into power saving mode will _terminate your connections with the servers_, and thus make the downloads fail.**

## Some advice

### Using options
   - Type `./megadownload.js -h` to see all available options.
   - You can provide multiple http session files after the **-i** option. All will be processed.
   - Default minimal duration is 90 seconds (any media lasting less than 90 seconds will be discarded). You can adjust it with the **-d** option.
   - Download audio-only files with the **-a** option.
   - A small script is included that will convert any media to an *.mp3 file. Download music from platforms and make your own local playlists !
   - To run it, type `. mp3convert.sh /path/to/files/to/convert` (the mp3 files will be saved in the same directory as the source files).

### Things you need to know
   - All downloaded content will be of *the highest possible resolution/audio quality*. That sometimes means lenghty downloads.
   - Don't panic if you end up with exotic file formats like *.webm, *.opus, *.adts, etc... (web media players use such formats, so your local media player will play them as well).
   - I routinely use this program to download like 40-50 videos at the same time. Don't hesitate to feed it large 150-200 Mb .har files.
   - At the same time, don't go too much above the 50 simultaneous downloads mark or the progress bars may behave unexpectedly and mess up your terminal.
   - You can also use HTTP capture software like [Fiddler](https://www.telerik.com/fiddler) or [httpry](https://linux.die.net/man/1/httpry) to generate your .har files.

### Standard mode
   - When using standard mode (default), the algorithm will uniquely identify a media to download **by its duration in seconds only**.
   - It's the default mode for downloading lengthy videos like movies or series (which rarely have the exact same duration) or just scrap the platforms for random content you may want to keep.
   - The downside is that when your session contains multiple media with the same duration, the following may occur :
     - Some media are missing
     - Media undesirably contain only audio or video. 
     - Video from a media is muxed with the audio of another media.
     - Some high resolution videos are of a lesser quality compared to their platform-hosted counterparts (due to the source video stream having a lower bitrate).
   - Despite this, standard mode should be sufficient in 90% of the cases.

### Extensive mode
   - When using extensive mode (**-e**), the algorithm will extract **as much media as possible from your session**, so you'll often end up with :
     - duplicate media of the same or different resolution/quality.
     - audio-only or video-only irrelevant files.
   - It's the mode you want to use when standard mode fails to do the job, for example :
     - You want to download multiple videos of the same duration.
     - You want to farm top quality videos with the highest bitrate thus have to be sure that you download the largest files.
   - The downside is that you'll sometimes download a lot of garbage that you'll have to manually delete afterwards.

## Notes
- Dear Github user, [star FFmpeg](https://github.com/FFmpeg/FFmpeg) !
- [The HTTP Archive format](https://en.wikipedia.org/wiki/HAR_(file_format))
- My approach was to minimize transcoding operations in order to keep the system resources footprint as light as possible, thus the "exotic" file formats.
- This project is of course named after the late [megaupload.com](https://en.wikipedia.org/wiki/Megaupload). Shout out to everyone who was there to witness this glorious slice of internet history !
