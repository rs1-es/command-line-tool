FROM public.ecr.aws/lambda/nodejs:12
# Alternatively, you can pull the base image from Docker Hub: amazon/aws-lambda-nodejs:12

RUN yum update -y && yum install -y amazon-linux-extras gzip which zip tar ghostscript file man-db git p7zip make cmake3 automake cpp gcc sqlite procps-ng

RUN amazon-linux-extras install -y python3.8 java-openjdk11 libreoffice GraphicsMagick1.3 R4

RUN pip3.8 install numpy pillow matplotlib

COPY lambda/sendcommand/index.js ${LAMBDA_TASK_ROOT}

COPY utils/ /opt/

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "index.handler" ]
