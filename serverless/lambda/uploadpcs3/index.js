const AWS = require('aws-sdk');
const BUCKETNAME = '';

let s3 = new AWS.S3();

let makeResponse = (statusCode, body) => {
  const response = {
    statusCode: statusCode,
    isBase64Encoded: false,
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    body: body
  };
  return response;
}

let getUploadForm = async (params) => {
  let response = '';

  let paramsPresign;

  let maxsize = 1024 * 1024 * 1024;  //1GB

  if (params.size > maxsize) {
    let body = {
      message: 'File is too big'
    };
    let response = makeResponse(501, JSON.stringify(body));
    return response;
  }

  if (params.type == 'text/plain') {
    paramsPresign = {
      Bucket: params.bucket,
      Fields: {
        key: params.key,
        'content-type': params.type + ';charset=utf-8'
      }
    };
  } else if (params.type != '') {
    paramsPresign = {
      Bucket: params.bucket,
      Fields: {
        key: params.key,
        'content-type': params.type
      }
    };
  } else {
    paramsPresign = {
      Bucket: params.bucket,
      Fields: {
        key: params.key
      }
    };
  }

  paramsPresign.Conditions = [
    ["content-length-range", 0, maxsize]
  ]

  response = s3.createPresignedPost(paramsPresign);

  return response;
}

let main = async (params) => {
  let response = '';
  let getSignedPostParams = {};
  getSignedPostParams.bucket = BUCKETNAME;
  getSignedPostParams.key = 'files/input/' + params.randomFolder + '/' + params.filename;
  getSignedPostParams.type = params.filetype;
  getSignedPostParams.size = parseInt(params.filesize, 10);
  let form = await getUploadForm(getSignedPostParams);
  response = makeResponse(200, JSON.stringify(form));

  return response;
}

exports.handler = async (event) => {
  let eventBody = JSON.parse(event.body);
  return await main(eventBody);
}
