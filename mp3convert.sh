#!/bin/bash

# find source files (shell wildcards)
# output list with null separator
# pipe to xargs (null terminates input items)
# run up to 10 parallel processes, redirect stderr to /dev/null
# force ffmpeg output bitrate to 320Kbps

find "$@" -type f -print0 | xargs -t0 -I '%1' -P 10 ffmpeg -i %1 -b:a 320k -c:a:0 libmp3lame -f mp3 %1.mp3 2>/dev/null && echo -e "All files converted to mp3."