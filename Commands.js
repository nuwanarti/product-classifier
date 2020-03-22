const exec = require('child_process').exec;
var fs = require('fs');

var commands = {}
commands.executeShell = function(arg){
  let command = 'sh /home/nuwanarti/Wifidog-node-mongodb-auth-server/server/uploadToKinesis.sh ' + arg
  exec(command,
          (error, stdout, stderr) => {
              console.log(`${JSON.stringify(stdout)}`);
              console.log(`${JSON.stringify(stderr)}`);
              if (error !== null) {
                  console.log(`exec error: ${error}`);
              }
          });
}

commands.classifyFromCSV = function(csvName, pickleName){
  let command = './bin/classify.py classify --explain "red rice 1kg nipuna" --model ./fixtures/' + pickleName + '.pickle' + ' --input ./uploads/' + csvName + ' --task convertFromCSV';
  exec(command,
          (error, stdout, stderr) => {
              console.log(`${JSON.stringify(stdout)}`);
              console.log(`${JSON.stringify(stderr)}`);
              if (error !== null) {
                  console.log(`exec error: ${error}`);
              }
          });
}

commands.classifyText = function(text, pickleName, callback){
  execute(
    './bin/classify.py classify --explain "' + text + '" --model ./fixtures/' + pickleName + '.pickle' + ' --input sendOut --task sendOut',
    function(err, out){
      callback(err, out);
    }
  )
}

commands.updateFlyerDb = function(filename, callback){
  execute(
    './bin/classify.py classify --explain dummy --model ./fixtures/category.pickle --input ./uploads/' + filename + '.csv --task updateFlyerDb',
    function(err, out){
      callback(err, out);
    }
  )
}
// need to complete this method
commands.trainNewModel = function(inputFile, outputFile){
  execute(
    './bin/classify.py build --corpus ./uploads/' + inputFile + '.csv --outpath ./fixtures/' + outputFile + '.pickle',
    function(err, out){

    }
  )
}

function execute(command, callback){
  console.log('command ' + command);
  exec(command,
          (error, stdout, stderr) => {
              console.log(`${JSON.stringify(stdout)}`);
              console.log(`${JSON.stringify(stderr)}`);
              if (error !== null) {
                  console.log(`exec error: ${error}`);
                  callback(error, {});
              }else{
                callback(null, stdout);
              }
          });
}



module.exports = commands;
