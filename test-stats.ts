import http from 'http';

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/stats',
  method: 'GET'
}, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Stats Response:', res.statusCode, data);
  });
});
req.on('error', console.error);
req.end();
