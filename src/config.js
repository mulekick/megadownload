'use strict';

const
    config = {

        // min. media duration (seconds)
        MIN_MEDIA_DURATION: 600,

        // min number of streams by media
        MIN_NB_OF_STREAMS: 2,

        // media formats
        STREAM_FORMATS: [ `Apple HTTP Live Streaming`, `QuickTime / MOV` ],
        // STREAM_FORMATS = [ `Apple HTTP Live Streaming`, `QuickTime / MOV`, `MPEG-TS (MPEG-2 Transport Stream)` ],

        // default download dir
        DOWNLOAD_DIR: `/mnt/d`,

        // default log file
        LOG_FILE: `logs/${ new Date().getTime() }.media.grab.log`,

        // host isolation
        HOST_RGX: /^(?:http|https):\/\/(?<host>(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)(?::\d+)?\/[^ "]+$/u,

        // url isolation TO BE CONFIRMED
        ISOLATION_RGX: /(?:http|https):\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?\/[^ '"\s]*(?:videoplayback\?|h264|mp4|m3u8|\W\d{3,4}p\W)[^ '"\s]*/gu,

        // output codecs options
        CODEC_OPTIONS: {
            [`MPEG-TS (MPEG-2 Transport Stream)`]: [ `-bsf:a aac_adtstoasc`, `-c copy` ],
            [`Apple HTTP Live Streaming`]: [ `-c copy` ],
            [`QuickTime / MOV`]: [ `-c copy` ]
        }

    };

if (typeof module !== `undefined` && module.exports)
    module.exports = config;