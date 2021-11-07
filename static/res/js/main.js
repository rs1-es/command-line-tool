const API_URL = 'https://1111111111.execute-api.eu-west-1.amazonaws.com';
const WEB_URL = 'https://cltool.rs1.es/';
let randomFolder = parseInt(Math.random() * 100000, 10).toString();

let sendCommand = async (command) => {
  let response;
  AWS.config.region = 'eu-west-1';
  AWS.config.credentials = new AWS.Credentials({
    accessKeyId: '',
    secretAccessKey: ''
  });

  AWS.config.update({
    maxRetries: 0,
    httpOptions: {
      timeout: 120000,
      connectTimeout: 5000
    }
  });

  let lambda = new AWS.Lambda();

  let lambdaResponse = await lambda.invoke({
    FunctionName: 'command-line-tool-prod-sendcommand',
    Payload: JSON.stringify({
      body: JSON.stringify({
        command: command,
        type: 'command',
        randomFolder: randomFolder
      })
    })
  })
    .promise();

  let payload = JSON.parse(lambdaResponse.Payload);
  if (payload.errorMessage) {
    response = payload.errorMessage;
  } else {
    let payloadBody = JSON.parse(payload.body);
    response = payloadBody.message;
  }


  return response;
}

let uploadFiles = async (params) => {
  for (let file of params.inputData.files) {
    await fetch(API_URL + '/uploadpcs3', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        filetype: file.type,
        filesize: file.size,
        randomFolder: randomFolder
      })
    }).then(async (res) => {
      if (res.ok) {
        await res.json().then(async (data) => {
          let form = new FormData();
          Object.keys(data.fields).forEach(key => {
            form.append(key, data.fields[key]);
          });
          form.append('file', file);
          await fetch(data.url, {
            method: 'POST',
            body: form
          }).then(async (resUpload) => {
            if (resUpload.ok) {
              await downloadFileToTool(data.fields.key);
            }
          }).catch((e) => {
            console.error(e);
          })
        })
      } else {
        res.json().then((err) => {

        })
      }
    })
  }
}

let downloadFileToTool = async (key) => {
  let response;
  await fetch(API_URL + '/sendcommand', {
    method: 'POST',
    body: JSON.stringify({
      type: 'upload',
      key: key,
      randomFolder: randomFolder
    })
  }).then(async (res) => {
    if (res.ok) {
      await res.json().then(async (data) => {
        response = data;
      })
    }
  });
  return response;
}

let downloadFile = async (path, mimeType) => {
  let response;
  await fetch(API_URL + '/sendcommand', {
    method: 'POST',
    body: JSON.stringify({
      type: 'download',
      key: path,
      mimetype: mimeType,
      randomFolder: randomFolder
    })
  }).then(async (res) => {
    if (res.ok) {
      await res.json().then(async (data) => {
        response = data;
      })
    }
  });
  return response;
}

let uploadNetS3 = async (url) => {
  await fetch(API_URL + '/uploadnets3', {
    method: 'POST',
    body: JSON.stringify({
      url: url,
      randomFolder: randomFolder
    })
  }).then(async (res) => {
    if (res.ok) {
      await res.json().then(async (data) => {
        await downloadFileToTool(data.newkey);
      })
    }
  })
}

let drawDownloadFileWindow = (commandResponse) => {
  let externalWindowBg = document.querySelector('.externalWindowBg');
  externalWindowBg.innerHTML = '';
  let externalWindow = document.createElement('div');
  externalWindow.classList.add('externalWindow');
  let listFilesBox = document.createElement('div');
  listFilesBox.classList.add('listFilesBox');
  let listFilesHeader = document.createElement('div');
  listFilesHeader.classList.add('listFilesHeader');
  let closeBtn = document.createElement('div');
  closeBtn.classList.add('closeBtn');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    externalWindowBg.innerHTML = '';
    externalWindowBg.style.display = 'none';
  });
  let listFilesTitleBox = document.createElement('div');
  listFilesTitleBox.classList.add('windowTitleBox')
  let listFilesTitle = document.createElement('span');
  listFilesTitle.innerText = 'Select file:';
  listFilesTitleBox.appendChild(listFilesTitle);

  listFilesHeader.appendChild(listFilesTitleBox);
  listFilesHeader.appendChild(closeBtn);
  let commandResponseSplit = commandResponse.split('\n');
  for (let i = 0; i < commandResponseSplit.length - 1; i++) {
    let link = document.createElement('button');
    link.innerText = commandResponseSplit[i];
    listFilesBox.appendChild(link);
  }
  externalWindow.appendChild(listFilesHeader);
  externalWindow.appendChild(listFilesBox);
  externalWindowBg.appendChild(externalWindow);
  externalWindowBg.style.display = 'grid';

  document.querySelectorAll('.listFilesBox button').forEach((button) => {
    button.addEventListener('click', async () => {
      drawLoadingLine('Download file, please wait...');
      let path = button.innerText;
      let fileResponse = await sendCommand('file -i ' + path);

      let cleanFileResponse = fileResponse.replace('\n', '');
      let fileResponseSplit = cleanFileResponse.split(' ');
      fileResponseSplit.shift();
      let mimeType = fileResponseSplit.join('');

      let s3URL = await downloadFile(path, mimeType);
      removeLoadingLine();
      //console.log(s3URL);
      let downloadLink = document.createElement('a');
      downloadLink.href = WEB_URL + s3URL.newkey;
      downloadLink.target = '_blank';
      downloadLink.click();

    })
  })
}

let outputWindow = document.querySelector('.outputWindow');

let drawOutputLine = (text, isInput) => {
  let outputLine = document.createElement('div');
  outputLine.classList.add('outputLine');
  let span = document.createElement('span');
  if (isInput) {
    outputLine.classList.add('commandInputLine');
    span.innerHTML = '&gt; ' + text;
  } else {
    span.innerText = text;
  }
  outputLine.appendChild(span);
  outputWindow.appendChild(outputLine);
}

let drawLoadingLine = (text) => {
  let loadingLine = document.createElement('div');
  loadingLine.classList.add('loadingLine');
  let span = document.createElement('span');
  span.innerText = text;
  loadingLine.appendChild(span);
  outputWindow.appendChild(loadingLine);
}

let removeLoadingLine = () => {
  if (document.querySelector('.loadingLine')) {
    document.querySelector('.loadingLine').remove();
  }
}

let clearScreen = () => {
  outputWindow.innerHTML = '';
}

let drawEditFileWindow = (fileContent, path) => {
  let externalWindowBg = document.querySelector('.externalWindowBg');
  externalWindowBg.innerHTML = '';
  let externalWindow = document.createElement('div');
  externalWindow.classList.add('externalWindowEditFile');
  let editFileBox = document.createElement('div');
  editFileBox.classList.add('editFileBox');
  let editFileHeader = document.createElement('div');
  editFileHeader.classList.add('editFileHeader');
  let closeBtn = document.createElement('div');
  closeBtn.classList.add('closeBtn');
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', () => {
    externalWindowBg.innerHTML = '';
    externalWindowBg.style.display = 'none';
  });
  let editFileTitleBox = document.createElement('div');
  editFileTitleBox.classList.add('windowTitleBox')
  let editFileTitle = document.createElement('span');
  editFileTitle.innerText = 'Edit file:';
  editFileTitleBox.appendChild(editFileTitle);

  editFileHeader.appendChild(editFileTitleBox);
  editFileHeader.appendChild(closeBtn);

  let editFileContentBox = document.createElement('div');
  editFileContentBox.classList.add('editFileContentBox');
  let editFileContent = document.createElement('textarea');
  editFileContent.setAttribute('rows', '15');
  editFileContent.value = fileContent;

  editFileContentBox.appendChild(editFileContent);
  editFileBox.appendChild(editFileContentBox);

  let saveButtonBox = document.createElement('div');
  saveButtonBox.classList.add('saveButtonBox');
  let saveButton = document.createElement('button');
  saveButton.setAttribute('id', 'saveBtn');
  saveButton.innerText = 'Save';
  saveButton.addEventListener('click', async () => {
    let editedFileContent = editFileContent.value;
    await sendCommand('echo \'' + editedFileContent + '\' > ' + path);
    closeBtn.click();
    //console.log(editedFileContent);
  })
  saveButtonBox.appendChild(saveButton);

  externalWindow.appendChild(editFileHeader);
  externalWindow.appendChild(editFileBox);
  externalWindow.appendChild(saveButtonBox);
  externalWindowBg.appendChild(externalWindow);
  externalWindowBg.style.display = 'grid';
}

let commandList = [];

let currentComandListIndex = 0;

let commandInput = document.getElementById('command');

document.getElementById('commandForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  let command = commandInput.value;
  commandList.push(command);

  if (commandList.length > 0 && currentComandListIndex != commandList.length - 1) {
    currentComandListIndex = commandList.length;
  } else {
    currentComandListIndex++;
  }
  let regexEditFile = new RegExp(/^(edit)/);
  let regexUploadNet = new RegExp(/^(get)/);
  if (command == 'clear') {
    clearScreen();
    commandInput.value = '';
  } else if (regexEditFile.test(command)) {
    let commandSplit = command.split(' ');
    commandInput.blur();
    drawLoadingLine('Executing command, please wait...');
    let fileContent = await sendCommand('cat ' + commandSplit[1]);
    removeLoadingLine();
    drawEditFileWindow(fileContent, commandSplit[1]);
    drawOutputLine(command, true);
    commandInput.value = '';
    outputWindow.scrollTo(0, outputWindow.scrollHeight);
  } else if (regexUploadNet.test(command)) {
    let commandSplit = command.split(' ');
    drawLoadingLine('Downloading file, please wait...');
    await uploadNetS3(commandSplit[1]);
    removeLoadingLine();
    drawOutputLine(command, true);
    commandInput.value = '';
    outputWindow.scrollTo(0, outputWindow.scrollHeight);
  } else if ((/^(feedback)$/).test(command)) {
    drawOutputLine(command, true);
    let commandResponse = 'Type: feedback YOUR_SUGGESTION';
    drawOutputLine(commandResponse, false);
  } else {
    commandInput.value = '';
    drawLoadingLine('Executing command, please wait...');
    let commandResponse = await sendCommand(command);
    removeLoadingLine();
    drawOutputLine(command, true);
    drawOutputLine(commandResponse, false);
    outputWindow.scrollTo(0, outputWindow.scrollHeight);
  }

});

let goPreviousCommand = () => {
  if (commandList.length > 0) {
    if (currentComandListIndex > 0) {
      currentComandListIndex--;
      commandInput.value = commandList[currentComandListIndex];
    }
  }
}

let goNextCommand = () => {
  if (currentComandListIndex < commandList.length - 1) {
    currentComandListIndex++;
    commandInput.value = commandList[currentComandListIndex];

  } else if (currentComandListIndex = commandList.length - 1) {
    commandInput.value = '';
    currentComandListIndex++;
  }
}

document.getElementById('command').addEventListener('keydown', (e) => {
  if (e.key == 'ArrowUp') {
    goPreviousCommand();
  } else if (e.key == 'ArrowDown') {
    goNextCommand();
  }
});

document.getElementById('arrowUpBtn').addEventListener('click', () => {
  goPreviousCommand();
});

document.getElementById('arrowDownBtn').addEventListener('click', () => {
  goNextCommand();
});

let eventAdded = false;

let selectFileBtn = document.getElementById('uploadBtn');

selectFileBtn.addEventListener('click', () => {
  let selectInput = document.createElement('input');
  selectInput.setAttribute('type', 'file');
  selectInput.setAttribute('multiple', 'true');
  selectInput.click();
  if (!eventAdded) {
    selectInput.addEventListener('change', async () => {
      drawLoadingLine('Uploading file, please wait...');
      await uploadFiles({
        inputData: selectInput
      });
      removeLoadingLine();
    });
  }
})

let downloadFileBtn = document.getElementById('downloadBtn');
downloadFileBtn.addEventListener('click', async () => {
  let commandResponse = await sendCommand('ls -dp $PWD/* | grep -vE "(\/$)"');
  drawDownloadFileWindow(commandResponse);
});

let init = async () => {
  let initText = 'Welcome to the Command Line Tool!\n' +
    '\n' +
    'UPDATED: 2021-09-17\n' +
    '\n' +
    '- System info -\n' +
    'CPU: Intel(R) Xeon(R) Processor @ 2.50GHz (6 cores)\n' +
    'RAM: 10496 MB (Total)\n' +
    '\n' +
    'Type "help" to show the User Guide.\n' +
    '\n' +
    'Type "feedback" and your suggestion for future software install or anything you want to say: feedback install X program\n';
  drawOutputLine(initText, false);
  outputWindow.scrollTo(0, outputWindow.scrollHeight);

  drawLoadingLine('Starting service, please wait...')
  console.log(await sendCommand('pwd'));
  removeLoadingLine();

};


init();
