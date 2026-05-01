import http from 'http';

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/seeds?limit=1',
  method: 'GET'
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const seeds = JSON.parse(data).seeds;
    if (seeds && seeds.length > 0) {
      const seed = seeds[0];
      console.log('Testing seed:', seed.id);
      const postData = JSON.stringify({ seed_id: seed.id });
      const postReq = http.request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/pipeline/execute',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, postRes => {
        let resData = '';
        postRes.on('data', d => resData += d);
        postRes.on('end', () => {
          console.log('Response:', postRes.statusCode, resData.substring(0, 100));
        });
      });
      postReq.on('error', console.error);
      postReq.write(postData);
      postReq.end();
    }
  });
});
req.on('error', console.error);
req.end();
