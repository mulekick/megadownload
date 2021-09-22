# Megadownload

*Browse the internet for content you like and save it to your local hard drive in minutes. Save bandwidth at the expense of diskspace. Free yourself of ads.*

#### See that youtube/twitch/dailymotion/whatever video that you keep going back to every day for weeks on end because you enjoy it so much ? Why not saving it locally so you're one click away from playing it whenever you like without being bothered by ads ? Why not reduce bandwidth consumption and server load, thus saving energy ? Provided hereby are the means to achieve this easily. Give it a try ! ####

## Contents
- [Prerequisites](#prerequisites)
- [How to install](#how-to-install)
- [How to use](#how-to-use)
    - [Create a HTTP session file](#browse-the-internet-and-save-your-HTTP-session-to-a-file)
    - [Execute the program](#execute-the-program)
- [Some advice](#some-advice)
- [Things you need to know](#things-you-need-to-know)
- [Notes](#notes)

## Prerequisites
   - Linux distro or WLS2 (debian 10.4.0 recommended)
   - GNU Bash shell (version 5.0.3 recommended)
   - node.js (version 14.17.4 recommended)
   - FFmpeg (version  4.1.6-1~deb10u1 recommended)
   - npm (version 7.20.3 recommended)
   - git (version 2.20.1 recommended)

## How to install
Install FFmpeg first :
   - [FFmpeg provides officially supported packages for Debian, Ubuntu, Fedora and Red Hat](https://ffmpeg.org/download.html)
   - To install them, type : `sudo apt update && sudo apt install ffmpeg`
   - Afterwards, ensure installation succeded by typing : `ffmpeg -version`

Then, navigate to your install directory and type :
   - `git clone https://github.com/mulekick/megadownload.git`
   - `cd megadownload`
   - `npm install`

*One major limitation of this program is that **_downloaded files are given random names_**. Once downloads are completed, navigate your history to see which media you've viewed, then copy/paste media titles to the downloaded files. Use durations to match downloaded files with viewed media.*

## How to use

1. **Browse the internet and save your HTTP session to a file**
   - Open your web browser and launch developer tools (F12 on Chrome/Edge).
   - Start recording your HTTP session (on Chrome/Edge : 'Network' tab, then Ctrl+E to start/stop recording).
   - Go to your favorite platform, watch videos, listen to music ...
   - Once you're done, save your HTTP session to a .har file (on Chrome/Edge : 'Network' tab, 'All', right click any item then 'Save all as HAR with content').

2. **Execute the program**
   - Open your shell, navigate to your install directory and type :
```./megadownload.js -i /path/to/your/http/session/file -o /path/to/your/download/directory```
   - Review the duration/quality of the media probed from your HTTP session file and confirm.
   - Wait for your files to download.
   - Enjoy ad free, network latency free content !

## Some advice
   - You can provide multiple http session files after the **-i** option. All will be processed.
   - Type `./megadownload.js -h` to see all available options.
   - The default minimal media duration is 90 seconds, which means that all media lasting less than 90 seconds will be discarded. You can adjust it with the **-d** option.
   - If you want to download audio-only files, use the **-a** option.
   - As a bonus, a small script is included that will convert any media to an *.mp3 file. Download music from the platforms and make your own local playlists !
   - To run it, type `. mp3convert.sh /path/to/files/to/convert` (the mp3 files will be saved in the same directory as the source files).

## Things you need to know
   - All the successfully probed media from your HTTP session will be downloaded *in the highest possible resolution/audio quality*. That sometimes means lenghty downloads, but the result is enjoyable 😁.
   - Don't panic if you end up with exotic file formats like *.webm, *.opus, *.adts, etc... (web media players use such formats, so your locally installed player should be able to play them as well).
   - The algorithm will seek to extract as much media as possible from your session, so you'll sometimes end up downloading unwanted content like :
     - ads
     - duplicate media (of the same or different resolution/quality)
     - mute thumbnails previews
   - Save the content you want to keep and delete the rest (setting up the -d option to the approximate length of what interests you will discard most of the garbage).
   - I routinely use it to download like 40-50 videos at the same time. Don't hesitate to feed it large 150-200 Mb .har files !
   - At the same time, don't go too much above the 50 simultaneous downloads mark or the progress bars may behave unexpectedly and mess up your terminal. Experiment until you find the volume of HAR data you're comfortable using.
   - **If you try to download multiple media with the exact same duration from the same platform, you may sometimes (but rarely) end up with video from a media muxed with the audio of another media.**
   - To counter this, you can always save a .har file after you've opened an URL to a media, then immediately run the program on it.

## Notes
- Dear Github user, [star FFmpeg](https://github.com/FFmpeg/FFmpeg) !
- [The HTTP Archive format](https://en.wikipedia.org/wiki/HAR_(file_format))
- This was extensively tested on [a number of platforms](./platformslist). Though the list of supported platforms may expand in the future, your favorite platforms probably are already supported 😏. 
- My approach was to minimize transcoding operations in order to keep the system resources footprint as light as possible, thus the "exotic" file formats.
- This project is of course named after the late [megaupload.com](https://en.wikipedia.org/wiki/Megaupload). Shout out to everyone who was there to witness this glorious slice of internet history !
