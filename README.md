# Megadownload

*Browse the internet for content you like and save it to your local hard drive in an instant. Save bandwidth at the expense of diskspace. Free yourself of ads.*

#### See that youtube video that you keep going back to everyday for weeks on end because you enjoy it so much ? Why not saving it locally so you're one click away from playing it whenever you like, and furthermore without being bothered by ads ? Why not at the same time reduce bandwidth consumption and server load, thus saving energy ? Provided hereby are the means to achieve this very easily. Give it a try ! ####

## prerequisites
   - Linux distro or WLS2 (debian 10.4.0 recommended)
   - GNU Bash shell (version 5.0.3 recommended)
   - node.js (version 14.17.4 recommended)
   - Ffmpeg (version  4.1.6-1~deb10u1 recommended)
   - npm (version 7.20.3 recommended)
   - git (version 2.20.1 recommended)

## how to install
Install Ffmpeg first :
   - [Ffmpeg provides officially supported packages for Debian, Ubuntu, Fedora and Red Hat](https://ffmpeg.org/download.html)
   - To install them, type : sudo apt update && sudo apt install ffmpeg
   - Afterwards, ensure installation succeded by typing : ffmpeg -version

Navigate to your install directory and type :
   - git clone https://github.com/mulekick/megadownload.git
   - cd megadownload
   - npm install

*One major limitation of this utility is that downloaded files are given random names. To circumvent this you can keep your browser open until downloads are completed, and then navigate your history to see which media you've viewed (and thus downloaded), and copy/paste the media titles to the downloaded files. I use durations to match downloaded files with viewed pages.*

## How to run it

1. **Browse the internet and save your HTTP session**
   - Open your web browser and launch developer tools (F12 on Chrome).
   - Start recording your HTTP session (on Chrome : 'Network' tab, then Ctrl+E).
   - Go to your favorite platform, watch videos, listen to music ...
   - Once you're done, save your HTTP session to a file (on Chrome : 'Network' tab, 'All', right click any item then 'Save all as HAR with content').

2. **Run the program**
   - Open your shell, navigate to your install directory.
   - Type ./megadownload.js -i /path/to/your/http/session/file -o /path/to/your/download/directory.
   - Review the duration/quality of the media probed from your HTTP session file and confirm.
   - Wait for your files to download.
   - Enjoy ad free, network latency free content !

## Notes
- Type ./megadownload.js -h to see all available options.
- Has been extensively tested on [a number of platforms](./platformslist).
- I routinely use it to download like 40-50 videos at the same time. Don't hesitate to feed it large 150-200 Mb HAR files !
- All the successfully probed media from your HTTP session will be downloaded, which means that you'll often end up downloading ads/unwanted content.
- My approach has been to minimize transcoding operations as much as possible to keep the system resources footprint as light as possible. Don't panic if you end up downloading *.webm, *.opus or *.adts files, your media player WILL be able to play them.
- This project is of course named after the late [megaupload.com](https://en.wikipedia.org/wiki/Megaupload). Shout out to everyone who was there to witness this glorious slice of internet history !
