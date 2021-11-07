const axios = require('axios').default;
const AWS = require('aws-sdk');
const fs = require('fs');
const BUCKETNAME = '';
let makeResponse = (statusCode, body) => {
  return {
    statusCode: statusCode,
    isBase64Encoded: false,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: body
  };
}

let downloadFile = async (url, localPath) => {
  return new Promise((resolve, reject) => {
    axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    }).then((response) => {
      let writer = fs.createWriteStream(localPath);
      console.log(response.headers['content-length'], ' bytes');
      response.data.pipe(writer);
      writer.on('finish', () => {
        resolve(makeResponse(200, JSON.stringify({
          message: 'OK',
          contentType: response.headers['content-type']
        })));
      });
      writer.on('error', (e) => {
        resolve(makeResponse(500, JSON.stringify(e)));
      })

    }).catch((e) => {
      console.error(e);
      resolve(makeResponse(500, JSON.stringify(e)));
    })
  })
}

let uploadFile = async (filename, localPath, contentType, randomFolder) => {
  let response;
  let newkey = 'files/input/' + randomFolder + '/' + filename;
  let s3 = new AWS.S3();
  console.log('Subiendo ' + filename + ' (' + contentType + ') desde ' + localPath + ' a bucket');
  await s3.putObject({
    Bucket: BUCKETNAME,
    Key: newkey,
    Body: fs.createReadStream(localPath),
    ContentType: contentType
  }).promise()
    .then((data) => {
      response = makeResponse(200, JSON.stringify({
        newkey: newkey
      }))
    }).catch((error) => {
      console.log(error);
      response = makeResponse(500, JSON.stringify(error));
    })
  return response;
}


let main = async (eventBody) => {
  let response;
  let urlSplit = eventBody.url.split('/');
  let filename = urlSplit[urlSplit.length - 1];
  let localPath = '/tmp/' + filename;
  
  let downloadFileResponse = await downloadFile(eventBody.url, localPath);
  if (downloadFileResponse.statusCode == 200) {
    let dfrBody = JSON.parse(downloadFileResponse.body);
    response = await uploadFile(filename, localPath, dfrBody.contentType, eventBody.randomFolder);
  } else {
    response = downloadFileResponse;
  }
  return response;
}


exports.handler = async (event) => {
  let eventBody = JSON.parse(event.body);
  return await main(eventBody);
}
