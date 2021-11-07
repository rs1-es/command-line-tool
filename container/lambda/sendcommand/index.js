const AWS = require('aws-sdk');
const BUCKETNAME = 'bucketname';
let fs = require('fs');

let s3 = new AWS.S3({
  region: 'eu-west-1',
  s3ForcePathStyle: true
});

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

let helpText = () => {
  let response = '---USER GUIDE---\n' +
    '\n' +
    '- This system doesn\'t have Internet access, but you can upload and download files.\n' +
    '- You can upload files up to 1GB in size.\n' +
    '- Please, take into account that this is a shared and non-persistent storage system.\n' +
    '- For your security, DON\'T WRITE any kind of non-temporary credentials.\n' +
    '- Every command you type needs to finish by itself. If it shows a prompt, it won\'t work (for example, typing "-y" in some commands will automatically answer "yes" to prompts).\n' +
    '- Commands cannot last more than 60 seconds.\n' +
    '- If you want to do a "cd", you have to do this: "cd /some_folder/ && some_command".\n' +
    '\n' +
    '- LIST AVAILABLE COMMANDS -\n' +
    '- List system commands with "ls /bin".\n' +
    '- List more installed commands with "ls /opt/bin".\n' +
    '\n' +
    '- FILE EDITOR -\n' +
    '- Edit any text file with "edit": "edit test.txt".\n' +
    '\n' +
    '- DOWNLOAD FROM INTERNET -\n' +
    '- Download any file from Internet with "get" (max. 500MB): get https://example.com/file.txt\n' +
    '\n' +
    '- EXAMPLES -\n' +
    '· (GraphicsMagick) gm convert input.jpg -quality 50 output.jpg\n' +
    '· (GhostScript) gs -dNOPAUSE -dQUIET -dBATCH -sDEVICE=pdfwrite -dPDFSETTINGS=/printer -dColorImageResolution=150 -sOutputFile="output.pdf" "input.pdf"\n' +
    '· (Python) python3.8 file.py\n' +
    '· (ffmpeg) ffmpeg -i input.mkv -codec copy output.mp4\n' +
    '· (LibreOffice) export HOME=/mnt/efs/<<YOUR FOLDER>> && soffice --headless --norestore --invisible --nodefault --nofirststartwizard --nolockcheck --nologo --convert-to "pdf:writer_pdf_Export" --outdir /mnt/efs/<<YOUR FOLDER>> "input.txt"\n' +
    '· (Node) /var/lang/bin/node index.js\n' +
    '· (Java) The default Java version is 8, but you can use Java 11 by using this path: /usr/lib/jvm/java-11-amazon-corretto.x86_64/bin\n';

  let bodyResponse = {
    message: response
  }

  return bodyResponse;
}

let getFile = async (key) => {
  let response;

  await s3.getObject({
    Key: key,
    Bucket: BUCKETNAME
  }).promise()
    .then((data) => {
      response = data;
    }).catch((error) => {
      console.log(error);
    })
  console.log(response);
  return response;
}

let downloadToTemp = async (inputPath, fileContent) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(inputPath, fileContent.Body, (fserr) => {
      if (fserr) {
        console.log(fserr);
        reject(fserr)
      } else {
        resolve();
      }
    })
  });
}

let deleteS3File = async (key) => {
  let response;

  await s3.deleteObject({
    Key: key,
    Bucket: BUCKETNAME
  }).promise()
    .then((data) => {
      response = data;
    }).catch((error) => {
      console.log(error);
    })

  return response;
}

let uploadFile = async (filename, outputPath, contentType, randomFolder) => {
  let response;
  let newkey = 'files/' + randomFolder + '/' + filename;
  await s3.putObject({
    Bucket: BUCKETNAME,
    Key: newkey,
    Body: fs.createReadStream(outputPath),
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

let execCommand = async (program, args) => {
  let commandResponse = '';
  console.log(program, args);
  return new Promise((resolve, reject) => {
    let spawn = require('child_process').spawn;

    let proc = spawn(program, args);
    
    proc.stderr.on('data', (data) => {
      commandResponse += data;
    });

    proc.stdout.on('data', (data) => {
      commandResponse += data;
    });

    proc.on('close', (code) => {
      let bodyResponse = {
        message: commandResponse
      }
      if (code != 0) {
        resolve(makeResponse(500, JSON.stringify(bodyResponse)));
      }
      resolve(makeResponse(200, JSON.stringify(bodyResponse)));
    });
  });
}

let main = async (eventBody) => {
  let program;
  let args = [];
  let regexAllowedCommands = new RegExp(/(^(env|set|printenv|AWS|su|sudo|bash)$)|(^(env|set|printenv|AWS|su|sudo)(\s|\>|\|)+)|((\/)(env|set|printenv|AWS|su|sudo)$)|((\/)(env|set|printenv|AWS|su|sudo)(\s|\>|\|)+)/g);

  if (eventBody.type == 'command') {
    if (eventBody.command == 'help') {
      return makeResponse(200, JSON.stringify(helpText()));
    }
    let regexFeedback = new RegExp(/^(feedback)(\s)+/);
    if (regexFeedback.test(eventBody.command)) {
      console.log(eventBody.command);
      return makeResponse(200, JSON.stringify({
        message: 'Feedback sent OK'
      }));
    }
    if (regexAllowedCommands.test(eventBody.command)) {
      console.log('Command not allowed');
      return makeResponse(200, JSON.stringify({
        message: ''
      }));
    }

    program = 'sh';
    args.push('-c');
    if (eventBody.randomFolder) {
      args.push('mkdir -p /mnt/efs/' + eventBody.randomFolder + ' && cd /mnt/efs/' + eventBody.randomFolder + ' && ' + eventBody.command);
    } else {
      args.push(eventBody.command);
    }

    console.log('Executing command...')
    return await execCommand(program, args);
  }

  if (eventBody.type == 'upload') {
    console.log('Getting ' + eventBody.key + ' from S3...');
    let fileContent = await getFile(eventBody.key);
    let key_split = eventBody.key.split('/');
    let filename = key_split[key_split.length - 1];
    let inputPath = '/mnt/efs/' + eventBody.randomFolder + '/' + filename;
    program = 'sh';
    args.push('-c');
    args.push('mkdir -p /mnt/efs/' + eventBody.randomFolder);
    console.log('Checking if folder exists...')
    await execCommand(program, args);
    console.log('Copying file to EFS');
    await downloadToTemp(inputPath, fileContent);
    console.log('Deleting S3 file...')
    await deleteS3File(eventBody.key);

    return makeResponse(200, JSON.stringify({
      message: 'OK'
    }))
  }

  if (eventBody.type == 'download') {
    let key = eventBody.key;
    let keySplit = key.split('/');
    let filename = keySplit[keySplit.length - 1];

    console.log('Uploading file to S3...');
    let response = await uploadFile(filename, key, eventBody.mimetype, eventBody.randomFolder);
    return response;
  }

  return makeResponse(500, JSON.stringify({
    message: 'Generic error'
  }))


}

module.exports.handler = async (event) => {
  let eventBody = JSON.parse(event.body);
  return await main(eventBody);
}
