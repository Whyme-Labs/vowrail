const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
require('../loopback.cjs');

test('the private render process binds an explicit wildcard request to loopback', async () => {
  const server = http.createServer((_request,response)=>response.end('synthetic preview'));
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({port:0,host:'0.0.0.0'},resolve);});
    assert.equal(server.address().address,'127.0.0.1');
    const response=await fetch('http://127.0.0.1:'+server.address().port,{signal:AbortSignal.timeout(1000)});
    assert.equal(await response.text(),'synthetic preview');
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
});
