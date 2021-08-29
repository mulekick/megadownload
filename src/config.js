'use strict';

const
    config = {

        // default user agent (quote when using command line options because of ffmpeg wrapper parsing behavior)
        // USER_AGENT: `Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1`,
        USER_AGENT: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36`,

        // min. media duration (seconds)
        MIN_MEDIA_DURATION: 600,

        // min number of streams by media
        MIN_NB_OF_STREAMS: 1,

        // media formats
        STREAM_FORMATS: [ `Apple HTTP Live Streaming`, `QuickTime / MOV`, `Matroska / WebM` ],

        // saved files format
        FILE_FORMATS: {
            [`Apple HTTP Live Streaming`]: `mp4`,
            [`QuickTime / MOV`]: `mp4`,
            [`Matroska / WebM`]: `webm`
        },

        // default download dir
        DOWNLOAD_DIR: `/mnt/d`,

        // default log file
        LOG_FILE: `logs/${ new Date().getTime() }.media.grab.log`,

        // host isolation
        HOST_RGX: /^(?:http|https):\/\/(?<host>(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+)(?::\d+)?\/[^ "]+$/u,

        // url isolation TO BE CONFIRMED
        ISOLATION_RGX: /(?:http|https):\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?\/[^ '"\s]*(?:videoplayback\?|h264|mp4|m3u8|bytes=|\W\d{3,4}p\W)[^ '"\s]*/gu

    };

if (typeof module !== `undefined` && module.exports)
    module.exports = config;