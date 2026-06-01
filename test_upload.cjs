const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Create a minimal CSV matching the college format
const csvLines = [
  'AdmissionID,GR No.,FIRST_NAME,MIDDLE_NAME,LAST_NAME,GENDER,DATE_OF_BIRTH,STANDARD,DIVISION,MOBILE_NO1',
  '1,,TestFirst,,TestLast,,,,,9876543210'
];
const csvContent = csvLines.join('\n');
const tmpFile = path.join(__dirname, 'tmp_test.csv');
fs.writeFileSync(tmpFile, csvContent);

// Build multipart body manually
const boundary = '----FormBoundary' + Date.now();
const fileData = fs.readFileSync(tmpFile);

const body = Buffer.concat([
  Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="tmp_test.csv"\r\nContent-Type: text/csv\r\n\r\n`),
  fileData,
  Buffer.from(`\r\n--${boundary}--\r\n`)
]);

const options = {
  hostname: 'localhost',
  port: 3333,
  path: '/api/v1/students/bulk-upload/33/171',
  method: 'POST',
  headers: {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    'Content-Length': body.length,
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('RESPONSE:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('RAW RESPONSE:', data.slice(0, 2000));
    }
  });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.write(body);
req.end();
