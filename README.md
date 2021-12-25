# Command Line Tool
Made with AWS and Serverless Framework.

## Website

You can go to <https://cltool.rs1.es> and play with the tool. You can embed it on your website (with a simple `<iframe>`). This is an example:
```
<div class="iframe-cltool">
  <div class="iframe-cltool-title">
    <span>Test with this online terminal:</span>
  </div>
  <iframe height="500" src="https://cltool.rs1.es" style="width: 100%;"></iframe>
</div>
```

## Build Steps
### Container Image
1. Create an Elastic Container Repository:
```
aws ecr create-repository --repository-name command-line-tool --image-scanning-configuration scanOnPush=true
```
2. Build the image (inside /container):
```
docker build -t command-line-tool .
```
3. Tag the image and link to ECR:
```
docker tag command-line-tool:latest <<YOUR_AWS_ACCOUNT_ID>>.dkr.ecr.<<REGION>>.amazonaws.com/command-line-tool:latest
```
4. Push the image:
```
docker push <<YOUR_AWS_ACCOUNT_ID>>.dkr.ecr.<<REGION>>.amazonaws.com/command-line-tool:latest
```
5. Copy sha256 info.

### Create a new VPC and subnet
### Create an EFS volume (One Zone) and access point
- Use the VPC and subnet created earlier
- Access point:
  - POSIX user and group ID: 0
  - Root directory creation permissions:
    - User and group ID: 0
    - Permissions: 777

### You need 'axios' npm package as a Lambda layer 
### Edit /serverless/serverless.yml and change it according to your info
