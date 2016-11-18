const cheerio = require('cheerio');
const request = require('superagent');
const throttle = require('promise-parallel-throttle');

/* Fetch this from you browser session */
const cookie = '';

/* Yeahh... well, just run it a couple time or extend this list or submit a PR */
const links = [
    'http://www.mobypicture.com/my/stream/1',
    'http://www.mobypicture.com/my/stream/2',
    'http://www.mobypicture.com/my/stream/3',
    'http://www.mobypicture.com/my/stream/4',
    'http://www.mobypicture.com/my/stream/5',
];

const photos = [];

const extractPhotoLInks = function (res) {
    const page = cheerio.load(res.text);
    const items = page('.layout_stream_grid_singleuser').find('.list_item a');

    for (let i = 0; i < items.length; i++) {
        photos.push(items.eq(i).attr('href'));
    }
};

Promise.all(links.map(link => {
    return new Promise(resolve => {
        request.get(link)
            .set('Cookie', cookie)
            .end(function (err, res) {
                if (err) {
                    console.error('Error', err);
                    return;
                }

                extractPhotoLInks(res);
                resolve();
            })
    })
})).then(() => {
    const tasks = photos.map(photo => {
        return () => {
            return new Promise(resolve => {
                const match = photo.match('.*\/([0-9]+)');
                console.log('Deleting', photo);
                request.post('http://www.mobypicture.com/ajax')
                    .send({
                        action: 'delete_post',
                        post_id: match[1]
                    })
                    .set('X-MobyServer-ID', null)
                    .set('Content-Type', 'application/x-www-form-urlencoded')
                    .set('Cookie', cookie)
                    .end(function (err, res) {
                        if (err) {
                            console.error('Error', err);
                            return;
                        }

                        console.log('Deleted', photo);
                        resolve();
                    })
            });
        }
    });
    throttle.all(tasks)
});

