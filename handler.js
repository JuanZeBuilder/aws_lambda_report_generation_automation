'use strict';
var aws = require('aws-sdk');
aws.config.update({region: 'ap-southeast-1'});
const s3 = new aws.S3();

const chromium = require("chrome-aws-lambda");

const nodemailer = require("nodemailer");

module.exports.hello = async (event,context) => {
  
  // Getting Json File
  console.log(event);
  console.log(event['Records'][0]['s3']['object']['key']);
  var object_key = (event['Records'][0]['s3']['object']['key']).replace("+", " ");
  var filename = "KimiaAssessReport " + object_key.split('data')[0] + ".pdf";
  console.log(object_key);
  var bucketParams = {
      Bucket : 'cv-therapist-json',
      Key: object_key
  };

  // Getting Json data
  const data = JSON.parse((await (s3.getObject(bucketParams).promise())).Body.toString('utf-8'));
  console.log(data);
  const email = data['EMAIL'];
  console.log(email)

  const executablePath = await chromium.executablePath;

  // launch a new chrome instance
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath,
    headless: chromium.headless
  });

  try {
    // create a new page
    const page = await browser.newPage()

    const html = await generateHTML(data)

    await page.setContent(html, {
      waitUntil: 'networkidle0'
    })

    // create a pdf buffer
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0.5cm", bottom: "0cm", right: "0.5cm",  left: "0.5cm"}
    });

    var s3Params = {
      Bucket: "cv-therapist-report",
      Key: filename,
      Body: pdf,
      ContentType: "application/pdf",
      ServerSideEncryption: "AES256"
    };
  
    await s3.upload(s3Params).promise().then(function(data) {
        console.log(`File uploaded successfully. ${data.Location}`);
      }, function (err) {
        console.error("Upload failed", err);
      });

    // Create the promise and SES service object
    let transporter = nodemailer.createTransport({
      SES: new aws.SES({apiVersion: '2010-12-01'}),
    })
    let emailProps = await transporter.sendMail({
      from: 'juanwei@kinexcs.com',
      to: email,
      subject: "Kimia Assess Report",
      text: "Report",
      html: "<div>" + "Here is the report generated from the data collect from ...." + "</div>",
      attachments: [
      {
        filename: filename,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
    });
  } catch (error) {
    return context.fail(error);
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
};

// For generating the HTML String and to process the data given
async function generateHTML(data){
  var i = 0;
  var upperLimitArray = {
      "SLLF": 70, 
      "SRLF": 70, 
      "SF": 80, 
      "SE": 45,
      "NLLF": 45, 
      "NRLF": 45,
      "NLR": 90, 
      "NRR": 90, 
      "NF": 70, 
      "NE": 70, 
  };
  var flexionAngleArray = await generateResults(data);
  var picture = "";
  var element = ``; 
  
  // Adding Style to Html String
  element += (`<style>" +
    div {
            margin-left: 20px;
            margin-top: 7px;
    }
    table {
    background-repeat: no-repeat;
    background-size: auto 100%;
    background-position: left top;
    width: 750px ;
    height: 1068px;
    margin-top: -20px;
    margin-left: -10px;
    }
    .cornerimage { 
            position: relative; 
            z-index: 2;
            }
    table { 
    border-collapse: collapse; 
    ;
    }
    
    table {
            border-collapse: collapse;
    }
    tr{
        page-break-inside: avoid; 
        page-break-after: auto;
    }

    figcaption{
            margin-left: 5px;
            margin-top: 10px;
    }
    .rotate {transform: rotate(90deg); text-align: center; padding: 0px;};
  </style>
  <html>
        <body>`);

  //header banner    
  element +=("<table> <tr><td colspan = '3'><h1><img src='https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/header.png' style='width: 850px;'></h1></td></tr>");

  //User Details
  element += ("<tr style = 'height:12px;'><td colspan ='2' style='font-size: 20px; padding-left: 10px; '>Name:</td>"+
      "<td colspan ='1' style='font-size: 20px; '>Gender:</td></tr>"+
      "<tr style='vertical-align: text-top; height:12px;'>"+
      "<td colspan ='2' style='font-size: 20px; padding-left: 10px'>Age: </td>"+
      "<td colspan ='1' style='font-size: 20px;'>Report Date: </td></tr>");

  //Spine picture and header    
  element += "<tr style = 'border-bottom: 1pt solid black; height: 160px'> <td></td> <td><img src = 'https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/spine.jpg'; style = 'width:140px; height:140px; align-content:center;'></td> <td><h1 style = 'margin-left = 5px'> Spine </h1></td> </tr> ";
  for (var dataType in flexionAngleArray) {
      picture = "https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/" + dataType + ".png";
      var max = upperLimitArray[dataType];
      if(flexionAngleArray[dataType] > max){
          var flexionAngle = max;
      }
      else {
          var flexionAngle = flexionAngleArray[dataType];
      }
      element += "<tr>" + "<td class = 'rotate'>" + dataType + "</td>" +
          "<td> <img style='display:block; width:140px;height:140px;padding-top:8px;' src=" + picture + ">" +
          "<div>" +  
          "<td> <figure style = 'align-content: center;font-size: 20px;'>" +
                  "<img class = 'backgroud' style='width:500px;height:50px;' src='https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/flexionbar.png'>"+
                  "<figcaption style = 'text-align: left;margin-left: 20px;'> 0&#176; </figcaption>"+
                  "<figcaption style = 'text-align: right;margin-top: -35px; margin-right: 40px;''>"+ max +"&#176; </figcaption>"+         
                  "<img class = 'cornerimage' style= 'margin-top: -70px; margin-left: " + (flexionAngle / max)*459 + "px; display:block; width:40px;height:40px;'src=' https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/dot.png'>"+
                  "<figcaption style = 'text-align: left; padding-top: 10px ;margin-left:" +  ((flexionAngle / max)*459+8)  + "px;'>" + flexionAngle + "&#176; </figcaption>"
                  ;
                  element += "</figure> </div> </td> </tr>";            
                  if (i == 1){
                      element += "<tr style='border-bottom: 1pt solid black;'><td colspan = 2></td><td style = 'text-align: center;'> Normal Lateral Flexion Range: 35&#176; Left & Right </td></div></tr>";   
                  }
                  if (i == 3){
                      element += "<tr><td colspan = 2></td><td style = 'text-align: center'> Normal Flexion Range: 75&#176; <br> Normal Extension Range: 30&#176; </td> </tr>";   
                  }
                  if (i == 5){
                      element += "<tr style='border-bottom: 1pt solid black;'><td colspan = 2></td><td style = 'text-align: center'> Normal Lateral Flexion Range: 40&#176; Left & Right </td></tr>";   
                  }
                  if (i == 7){
                      element += "<tr style='border-bottom: 1pt solid black;'><td colspan = 2></td><td style = 'text-align: center'> Normal Rotation: 70&#176; Left & Right </td></tr>";   
                  }
                  if (i == 9){
                      element += "<tr><td colspan = 2></td><td style = 'text-align: center'> Normal flexion: 80&#176; <br> Normal extension: 55&#176; </td> </tr>";   
                  }
                  
               
      if(i == 3){
          element += "<tr style ='height: 140px;padding: 0px;'><td colspan = '3'> <img src = 'https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/footer.png' style='width: 850px; size:100%'></td></tr>";
          element += "<tr style='height: 140px;border-bottom: 1pt solid black;'> <td></td> <td> <img src = 'https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/neck.jpg'; style = 'padding-top: 5px;width:140px; height:140px; align-content:center;'> </td> <td> <h1 style = 'margin-left = 5px'> Neck </h1> </td> </tr> ";
      }
      if(i == 9){
          element += "<tr><td colspan = '3'> <img src = 'https://cv-therapist-image.s3.ap-southeast-1.amazonaws.com/image/footer.png' style='width: 850px; size:100%'></td></tr>";
      }
      i++;
  }
  element += "</table>  </body>  </html>";
  return element;
}

async function generateResults(data) {
  const data_obj = data;
  try {
      var flexionAngleArray = {
          "SLLF": 0, 
          "SRLF": 0, 
          "SF": 0, 
          "SE": 0,
          "NLLF": 0, 
          "NRLF": 0,
          "NLR": 0,
          "NRR": 0, 
          "NF": 0, 
          "NE": 0,
      };
      for (const key in flexionAngleArray){
        flexionAngleArray[key] = Math.round(data_obj[key][3]);
      }
      return flexionAngleArray;
  } catch(err){
      console.log(err);
  }
}