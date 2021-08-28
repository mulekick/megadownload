'use strict';

const
    config = {

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
        ISOLATION_RGX: /(?:http|https):\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+(?::\d+)?\/[^ '"\s]*(?:videoplayback\?|h264|mp4|m3u8|\W\d{3,4}p\W)[^ '"\s]*/gu

    };

if (typeof module !== `undefined` && module.exports)
    module.exports = config;