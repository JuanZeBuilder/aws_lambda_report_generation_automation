# aws_lambda_report_generation_automation

# First Time Set-Up
1. Install node first if u don't have it, if you have node installed, ```run npm install -g serverless``` in the console.
2. Download aws cli on the machine
3. Run aws configure and key in the AWS Access Key ID and Secret Access Key from any AWS IAM user role that has access to the s3 bucket and lambda. For the region name key-in: ap-southeast-1. leave the output format empty.
4. Run ```npm i``` to check if all the package is installed correctly
5. Finally, try to run the command: ```sls deploy``` to see if the aws configuration works and it will then deploy whatever updates you have in the folder to the intended aws lambda function 

#### Once the first time set-up is done, you can just run ```sls deploy``` in  to update any changes u made to the aws lambda function.


# File

#### handler.js: is the file where the function will run when an object gets uploaded to the S3 bucket called cv-therapist-json. Contains the function(generateHTML() & generateResult()) to create the html string at the bottom of the file.

#### serverless.yml: to configure the aws lambda settings

#### package.json: Contains all the neccessary package required. If got any update to the file run ```npm i``` to update the package.

# How the entire process works

1. Function will run once object gets uploaded to the specified S3 bucket. 
2. The function will then take the newly uploaded json file and get the data inside to process the data into the html string.
3. Which we will then run chromium-puppeteer to launch a headless browser to convert the html to pdf
4. After which the pdf will get stored into the bucket called cv-therapist-report.
5. The pdf will also get sent through aws SES service using a package called nodemailer.
