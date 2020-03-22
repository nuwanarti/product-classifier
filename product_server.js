const express = require('express')
const fileUpload = require('express-fileupload');

const fileSystem = require('fs');
const path = require('path');

const csv = require('csvtojson');
const uuidv4 = require('uuid/v4');

// const { Pool, Client } = require('pg');
const Promise = require('promise');

// const pool = new Pool({
//   host : 'flyer-dev.c8amc4ajwlqc.us-east-1.rds.amazonaws.com',
//   user : 'prashan',
//   password : 'yellow45River',
//   database : 'flyer',
//   port : 5432
// });

const pgp = require('pg-promise')(/*options*/);

const cn = {
  host : 'flyer-dev.c8amc4ajwlqc.us-east-1.rds.amazonaws.com',
  user : 'prashan',
  password : 'yellow45River',
  database : 'flyer',
  port : 5432
};
// alternative:
// const cn = 'postgres://username:password@host:port/database';

const db = pgp(cn); // database instance;


const Commands = require('./Commands');

const app = express()
const port = 3000

app.use(fileUpload());
app.get('/', (request, response) => {
  response.send('Hello from Express!')
});


app.post('/upload', function(req, res) {
  if (Object.keys(req.files).length == 0) {
    return res.status(400).send('No files were uploaded.');
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv('/home/nuwanarti/product-classifier/uploads/' + req.body.fileName + '.csv', function(err) {
    if (err)
      return res.status(500).send(err);

    res.send('File uploaded!');
  });
});

app.get('/uploadCSV', function(req, res, next){
  // res.json({success: true})
  if (req.url == '/fileupload') {

    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      var oldpath = files.filetoupload.path;
      console.log('file path ' + oldpath);
      var newpath = '/home/nuwanarti/product-classifier/uploads/' + files.filetoupload.name;
      fs.rename(oldpath, newpath, function (err) {
        if (err) throw err;
        res.write('File uploaded and moved!');
        res.end();
      });
    });

  } else {

    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("<form ref='uploadForm' id='uploadForm' action='/upload' method='post' encType='multipart/form-data'>");
    res.write('<input type="text" name="fileName" placeholder="file name without spaces" /><br/>');
    res.write('<input type="file" name="sampleFile" /><br>');
    res.write("<input type='submit' value='Upload!' />");
    res.write('</form>');
    return res.end();
  }

});

app.get('/classifycsv', function(req, res, next){
  if(!req.query.csvName || !req.query.pickle){
    return res.status(403).json({success: false, message: 'please provide arguments csvName: name of the csv file uploaded , pickle: classifier as category, brand or volume'});
  }

  Commands.classifyFromCSV(req.query.csvName, req.query.pickle);

  res.status(200).json({success: true, message: 'naviget later to this url to download result csv', link: 'http://ec2-52-204-51-163.compute-1.amazonaws.com:3000/downloadResultCSV'})
})

app.get('/classify', function(req, res, next){
  if(!req.query.text || !req.query.pickle){
    return res.status(403).json({success: false, message: 'please provide arguments text: description need to classify , pickle: classifier as category, brand or volume'});
  }
  Commands.classifyText(req.query.text, req.query.pickle, function(err, out){
    if(err)
      return res.status(403).json({success: false, message: JSON.stringify(err)});
    else
      return res.send(out);
    // return res.status(200).json({success: true, result: out});
  });
});

app.get('/train', function(req, res, next){
  res.json({success: false, message: 'still under developing'});
});

app.get('/downloadResultCSV', function(req, res, next){
  var filePath = path.join(__dirname, 'bin/result.csv');
  console.log(filePath);
  var stat = fileSystem.statSync(filePath);

   res.writeHead(200, {
       'Content-Type': 'text/csv',
       'Content-Length': stat.size
   });

   var readStream = fileSystem.createReadStream(filePath);
   // We replaced all the event handlers with a simple call to readStream.pipe()
   readStream.pipe(res);
})

app.get('/updateFlyer', function(req, res, next){
  Commands.updateFlyerDb(req.query.fileName, function(err, doc){
    let unavailableCategories = doc.split('UNAVAILABLE CATEGORIES')[1];
    res.json({success: true, unavailableCategories: unavailableCategories});
  })
});

app.get('/insert', function(req, res, next){
  insert(req, res, next);
})


/**
use this endpoint for insert products into the products table
products should be provided in csv file. and headings in the csv file , description, category, imageUrl
**/
app.get('/insertProductsToFlyer', (req, res, next) => {
  insertProductsToFlyer(req, res, next);
})

function insertProductsToFlyer(req, res, next) {
  getJsonFromFile(req.query.fileName, (err, jsonObj) => {
    if(err)
      return res.json({success: false, error: JSON.stringify(err)})

    let productsArray = [];

    jsonObj.forEach((pro) => {
      let product = {};
      product.description = pro.description;
      product.imageUrl = pro.imageUrl;
      product.category = pro.category;

      productsArray.push(product);
    })
    // productsArray.forEach((product) => {
    //   checkForCategoryName(product.category, 0, 'category')
    //   .then(output => {
    //     return res.json(output);
    //   })
    //   .catch(e => {
    //     return res.json(e);
    //   })
    //   return;
    // })
    iterate(productsArray, 0);
    res.json({message: 'items will be updated'});

    // return res.json(productsArray);
  })
}

function iterate(productsArray, index){
  console.log('index : ' + index );
  if(index >= productsArray.length)
    return;
  getCategoryId(productsArray[index].category, (err, row)=>{
    if(err){
      console.log('error occured while inserting ' + index);
      return iterate(productsArray, ++index);
    }
    console.log('get category id ' + row[0].category_id);
      // return callback(err, null);
    if(row.length > 0){

      let catId = row[0].category_id;
      let description = productsArray[index].description;
      let imageUrl = productsArray[index].imageUrl;
      console.log('cat id ' + catId + ' description ' + description + ' imageurl ' + imageUrl);
      isProductAvailable(description, (err, isAvailable) => {
        if(err){
          // return callback(err, null);
          console.log('error occured while looking available products');
        }
        console.log('is available ' + isAvailable);
        if(!isAvailable){
          let product = {

          }
          product.productId = getUUIDvalue();
          product.categoryId = catId;
          product.imageUrl = imageUrl;
          product.name = description;
          product.createdAt = new Date().toLocaleString();
          product.updatedAt = new Date().toLocaleString();

          console.log('stringify object ' + JSON.stringify(product));
          insertIntoProductTable(product, (err, updated) => {
            if(err){
              console.log('error ' + JSON.stringify(err));
              iterate(productsArray, ++index, null);
            }
            iterate(productsArray, ++index, null);

          })
        }else{
          console.log('product name is already exists ' + description);
          return iterate(productsArray, ++index);
          // return callback({error: 'product already exists'}, null);
        }
      })
      // return callback(null, catId);


    }else{
      console.log("category isn't exists");
      return iterate(productsArray, ++index);
      // return callback({error: 'no such a category'}, null);
    }
    // console.log(JSON.stringify(row));
  })
}

function insertIntoProductTable(product, callback){
  let query = "INSERT INTO product (product_id, category_id, name, image_url, enabled, created_at, updated_at)" +
  "VALUES($1, $2, $3, $4, $5, $6, $7)" ;
  let args = [product.productId, product.categoryId, product.name, product.imageUrl, true, product.createdAt, product.updatedAt];
  execQuery(query, args, (err, rows) => {
    if(err)
      console.log('error occured while inserting products ' + JSON.stringify(err));
    console.log('calling for parent function');
    callback(null, rows);
  })

}

function isProductAvailable(description, callback){
  execQuery("SELECT * from product WHERE name=$1", [description], (err, rows)=>{
    if(err)
      return callback(err, null);
    if(rows.length == 0)
      return callback(null, false);
    return callback(null, true);
  });
}


function getCategoryId(category, callback){
  console.log('category is ' + category);
  execQuery("SELECT * from category WHERE name=$1", [category], function(err, rows){
    if(err)
      return callback(err, null);
    return callback(null, rows);

  })
}

function insert(req, res, next){
  getJsonFromFile(req.query.fileName, function(err, jsonObj){
    console.log('came here');
    console.log(JSON.stringify(jsonObj));
    // return;
    if(err){
      return res.json(err);
    }
    let promises = [];
    let csvRowIndex = 0;
    let failedRows = [];
    let rowPromises = [];

    let goodCategories = {};
    let out = jsonObj.map(cat => {
      csvRowIndex ++ ;
      let categoriesToLook = [];
      categoriesToLook.push(cat.parentCategory);
      categoriesToLook = [...categoriesToLook, ...cat.path.split('.')];
      categoriesToLook = [...new Set(categoriesToLook)];
            categoriesToLook.filter(function(xxx){
                console.log('PRINTING PATH : ' + xxx)
            })
            console.log('CATEGORIES : ' + JSON.stringify(categoriesToLook));

            let load = categoriesToLook.map(catId => checkForCategory(catId, csvRowIndex, cat));
            console.log(JSON.stringify(load));
            // return load;
            Promise.all(load).then(e => {
              console.log('executed xxxxx ' + JSON.stringify(e));

              return e;
            });

    })

    // jsonObj.filter((cat) => {
    //   // execQuery("SELECT name from category WHERE category_id=$1", [cat.parentCategory], function(err, rows){
    //   //   console.log('rows ' + JSON.stringify(rows))
    //   // })
    //   csvRowIndex ++ ;
    //   let categoriesToLook = [];
    //   // categoriesToLook.push({index: csvRowIndex, categoryId: cat.parentCategory, categoryName: cat.categoryName, cat: cat});
    //   categoriesToLook.push(cat.parentCategory);
    //   // categoriesToLook = [...categoriesToLook, ...cat.path.replace(/_/g,'-').split('.')];
    //   // cat.path.split('.').filter(function(path){
    //   //   let p = path.replace(/_/g, '-');
    //   //   console.log('printing path : ' + p);
    //   //   categoriesToLook.push(p);
    //   // })
    //   categoriesToLook = [...categoriesToLook, ...cat.path.split('.')];
    //
    //   categoriesToLook = [...new Set(categoriesToLook)];
    //   categoriesToLook.filter(function(xxx){
    //       console.log('PRINTING PATH : ' + xxx)
    //   })
    //   console.log('CATEGORIES : ' + JSON.stringify(categoriesToLook));
    //
    //   let load = categoriesToLook.map(catId => checkForCategory(catId, csvRowIndex, cat));
    //   console.log(JSON.stringify(load));
    //   Promise.all(load).then(e => {
    //     console.log('executed xxxxx ' + JSON.stringify(e));
    //
    //   });
    //   // category looking promise
    //   // let categoryPromise = [];
    //   // // categoriesToLook.filter(function({index, categoryId, categoryName, cat}){
    //   // categoriesToLook.filter(function(categoryId){
    //   //   categoryPromise.push(checkForCategory(categoryId, csvRowIndex, cat));
    //   // })
    //   // categoryPromise.push(checkForCategoryName(cat.categoryName, csvRowIndex, cat));
    //   // Promise.all(categoryPromise)
    //   //   .then(allPromises => {
    //   //     // if all validates then insert category row
    //   //     let isAllPromisesSuccess = true;
    //   //     let categoryRowToInsert = {};
    //   //     allPromises.filter(function({success, index, nameAvailable, categories, cat}){
    //   //       categoryRowToInsert = cat;
    //   //       console.log('success value is : ' + success);
    //   //       console.log('index value is : ' + index);
    //   //       console.log('nameAvailable value is : ' + nameAvailable);
    //   //       console.log('categories value is : ' + categories);
    //   //
    //   //       if(!success){
    //   //         console.log('came to fail success');
    //   //         isAllPromisesSuccess = false;
    //   //         let failedReason = {
    //   //           index: index,
    //   //           failedCategories: categories
    //   //         }
    //   //         if(nameAvailable){
    //   //           failedReason.reason = "Category name is already inserted";
    //   //         }else{
    //   //           failedReason.reason = "Parent category is not available";
    //   //         }
    //   //
    //   //         failedRows.push(failedReason);
    //   //       }
    //   //     })
    //   //     if(isAllPromisesSuccess){
    //   //       // let categoryPromises = ;
    //   //       console.log('SUCCESS UPDATING');
    //   //       rowPromises.push(insertCategoryToFlyer(categoryRowToInsert));
    //   //
    //   //     }else{
    //   //       console.log('failed all')
    //   //     }
    //   //     // sleep(3000);
    //   //
    //   //
    //   //   })
    //   //   .catch(e => {
    //   //     console.log('ERROR OCCURED IN CATEGORY PROMISE ' + JSON.stringify(e));
    //   //   })
    //   // promises.push(checkForCategory(cat.parentCategory, csvRowIndex));
    //     // await cat;
    // });
    // sleep(3000);
    // setTimeout(function(){
      // console.log('counting');
      // Promise.all(rowPromises)
      //   .then((allPromises)=>{
      //     console.log(allPromises);
      //     console.log('CAME HERE TO ALL PROMISES');
      //     return res.json({promises: allPromises, failedRows: failedRows});
      //   })
      //   .catch((e)=>{
      //     console.log("we had these errors " + JSON.stringify(e));
      //     return res.json({success: false, unavailableCategories: e})
      //   })
    // }, 3000)

    // res.json(jsonObj);
  })
}
app.get('/insertCategories', function(req, res, next){

   getJsonFromFile(req.query.fileName, function(err, jsonObj){
     console.log(JSON.stringify(jsonObj));
     if(err){
       return res.json(err);
     }
     let promises = [];
     let csvRowIndex = 0;
     let rowCount = 0;
     let failedRows = [];
     let rowPromises = [];
      jsonObj.filter(function(cat){
       // execQuery("SELECT name from category WHERE category_id=$1", [cat.parentCategory], function(err, rows){
       //   console.log('rows ' + JSON.stringify(rows))
       // })
       csvRowIndex ++ ;
       let categoriesToLook = [];
       // categoriesToLook.push({index: csvRowIndex, categoryId: cat.parentCategory, categoryName: cat.categoryName, cat: cat});
       categoriesToLook.push(cat.parentCategory);
       categoriesToLook = [...categoriesToLook, ...cat.path.replace(/_/g,'-').split('.')];
       // categoriesToLook = [...categoriesToLook, ...cat.path.split('.')];

       categoriesToLook = [...new Set(categoriesToLook)];
       console.log('CATEGORIES : ' + JSON.stringify(categoriesToLook));
       // category looking promise
       let categoryPromise = [];
       // categoriesToLook.filter(function({index, categoryId, categoryName, cat}){
       categoriesToLook.filter(function(categoryId){
         categoryPromise.push(checkForCategory(categoryId, csvRowIndex, cat));
       })
       categoryPromise.push(checkForCategoryName(cat.categoryName, csvRowIndex, cat));
       Promise.all(categoryPromise)
         .then(allPromises => {
           // if all validates then insert category row
           let isAllPromisesSuccess = true;
           let categoryRowToInsert = {};
           allPromises.filter(function({success, index, nameAvailable, categories, cat}){
             categoryRowToInsert = cat;
             console.log('success value is : ' + success);
             console.log('index value is : ' + index);
             console.log('nameAvailable value is : ' + nameAvailable);
             console.log('categories value is : ' + categories);

             if(!success){
               console.log('came to fail success');
               isAllPromisesSuccess = false;
               let failedReason = {
                 index: index,
                 failedCategories: categories
               }
               if(nameAvailable){
                 failedReason.reason = "Category name is already inserted";
               }else{
                 failedReason.reason = "Parent category is not available";
               }

               failedRows.push(failedReason);
             }
           })
           if(isAllPromisesSuccess){
             // let categoryPromises = ;
             console.log('SUCCESS UPDATING');
             rowPromises.push(insertCategoryToFlyer(categoryRowToInsert));
             rowCount ++;
           }else{
             console.log('failed all')
             rowCount ++;
             console.log('row count ' + rowCount + ' length ' + jsonObj.length);

           }

           if(rowCount == jsonObj.length){
             execThis(rowPromises, req, res, next, failedRows);
           }
           // sleep(3000);


         })
         .catch(e => {
           console.log('ERROR OCCURED IN CATEGORY PROMISE ' + JSON.stringify(e));
         })
       // promises.push(checkForCategory(cat.parentCategory, csvRowIndex));

     });
     // sleep(3000);
     // setTimeout(function(){
     //   console.log('counting');
     //   Promise.all(rowPromises)
     //     .then((allPromises)=>{
     //       console.log(allPromises);
     //       console.log('CAME HERE TO ALL PROMISES');
     //       return res.json({promises: allPromises, failedRows: failedRows});
     //     })
     //     .catch((e)=>{
     //       console.log("we had these errors " + JSON.stringify(e));
     //       return res.json({success: false, unavailableCategories: e})
     //     })
     // }, 10000)

     // res.json(jsonObj);
   })
});

function execThis(rowPromises, req, res, next, failedRows){
  // setTimeout(function(){
    console.log('counting');
    Promise.all(rowPromises)
      .then((allPromises)=>{
        console.log(allPromises);
        console.log('CAME HERE TO ALL PROMISES');
        return res.json({promises: allPromises, failedRows: failedRows});
      })
      .catch((e)=>{
        console.log("we had these errors " + JSON.stringify(e));
        return res.json({success: false, unavailableCategories: e})
      })
  // }, 10000)
}

 function dummy(req, res, next){
  getJsonFromFile(req.query.fileName, function(err, jsonObj){
    console.log(JSON.stringify(jsonObj));
    if(err){
      return res.json(err);
    }
    let promises = [];
    let csvRowIndex = 0;
    let failedRows = [];
    let rowPromises = [];
     jsonObj.filter(function(cat){
      // execQuery("SELECT name from category WHERE category_id=$1", [cat.parentCategory], function(err, rows){
      //   console.log('rows ' + JSON.stringify(rows))
      // })
      csvRowIndex ++ ;
      let categoriesToLook = [];
      // categoriesToLook.push({index: csvRowIndex, categoryId: cat.parentCategory, categoryName: cat.categoryName, cat: cat});
      categoriesToLook.push(cat.parentCategory);
      // categoriesToLook = [...categoriesToLook, ...cat.path.replace(/_/g,'-').split('.')];
      categoriesToLook = [...categoriesToLook, ...cat.path.split('.')];

      categoriesToLook = [...new Set(categoriesToLook)];
      console.log('CATEGORIES : ' + JSON.stringify(categoriesToLook));
      // category looking promise
      let categoryPromise = [];
      // categoriesToLook.filter(function({index, categoryId, categoryName, cat}){
      categoriesToLook.filter(function(categoryId){
        categoryPromise.push(checkForCategory(categoryId, csvRowIndex, cat));
      })
      categoryPromise.push(checkForCategoryName(cat.categoryName, csvRowIndex, cat));
      Promise.all(categoryPromise)
        .then(allPromises => {
          // if all validates then insert category row
          let isAllPromisesSuccess = true;
          let categoryRowToInsert = {};
          allPromises.filter(function({success, index, nameAvailable, categories, cat}){
            categoryRowToInsert = cat;
            console.log('success value is : ' + success);
            console.log('index value is : ' + index);
            console.log('nameAvailable value is : ' + nameAvailable);
            console.log('categories value is : ' + categories);

            if(!success){
              console.log('came to fail success');
              isAllPromisesSuccess = false;
              let failedReason = {
                index: index,
                failedCategories: categories
              }
              if(nameAvailable){
                failedReason.reason = "Category name is already inserted";
              }else{
                failedReason.reason = "Parent category is not available";
              }

              failedRows.push(failedReason);
            }
          })
          if(isAllPromisesSuccess){
            // let categoryPromises = ;
            console.log('SUCCESS UPDATING');
            rowPromises.push(insertCategoryToFlyer(categoryRowToInsert));

          }else{
            console.log('failed all')
          }

        })
        .catch(e => {
          console.log('ERROR OCCURED IN CATEGORY PROMISE ' + JSON.stringify(e));
        })
      // promises.push(checkForCategory(cat.parentCategory, csvRowIndex));

    });
    Promise.all(rowPromises)
      .then((allPromises)=>{
        console.log(allPromises);
        console.log('CAME HERE TO ALL PROMISES');
        return res.json({promises: allPromises, failedRows: failedRows});
      })
      .catch((e)=>{
        console.log("we had these errors " + JSON.stringify(e));
        return res.json({success: false, unavailableCategories: e})
      })
    // res.json(jsonObj);
  })
}
function checkForCategory(category, index, cat){
  const promise = new Promise((resolve, reject)=>{
    execQuery("SELECT name from category WHERE category_id=$1", [category], function(err, rows){
      if(err){
        console.log('ERRORS ' + JSON.stringify(err));
        reject({error: err, index: index});
      }else {
        console.log('ROW SSSSS checkForCategory: ' + JSON.stringify(rows) + ' category ' + category);
        if(rows.length > 0){
          resolve({success: true, categories: rows, index: index, cat: cat});
          return ;
        }else{
          // reject(category);
          resolve({success: false, categories: category, index: index, cat: cat});
          return ;

        }
        // console.log('came to resolve ');
        // resolve(rows);

      }
    })
  })
  return promise;
}

function checkForCategoryName(categoryName, index, cat){
  const promise = new Promise((resolve, reject)=>{
    execQuery("SELECT name from category WHERE name=$1", [categoryName], function(err, rows){
      if(err){
        console.log('ERRORS ' + JSON.stringify(err));
        reject({error: err, index: index});
      }else {
        console.log('ROW SSSSS checkForCategoryName: ' + JSON.stringify(rows) + ' category ' + categoryName);

        if(rows.length > 0){
          resolve({success: false, categories: categoryName, index: index, nameAvailable: true, cat: cat, row: rows});
        }else{
          // reject(category);
          resolve({success: true, categories: categoryName, index: index, nameAvailable: false, cat: cat});

        }
        // console.log('came to resolve ');
        // resolve(rows);

      }
    })
  })
  return promise;
}

function insertCategoryToFlyer({categoryName, parentCategory, imageUrl, path}){
  const promise = new Promise((resolve, reject)=>{
    let id = getUUIDvalue();
    db.one('INSERT INTO category(category_id, name, image_url, enabled, parent_id, path) VALUES($1, $2, $3, $4, $5, $6) RETURNING category_id',
    [id, categoryName, imageUrl, true, parentCategory, (path + '.' + id.replace(/-/g, '_'))])
    .then(data => {
        console.log('inserted category ' +data.id); // print new user id;
        resolve(data.id);
    })
    .catch(error => {
        console.log('ERROR:', error); // print error;
        reject(error);
    });
  })
  return promise;
}

function getUUIDvalue(){
  // const v4options = {
  //   random: [
  //     0x10, 0x91, 0x56, 0xbe, 0xc4, 0xfb, 0xc1, 0xea,
  //     0x71, 0xb4, 0xef, 0xe1, 0x67, 0x1c, 0x58, 0x36
  //   ]
  // };
  let value = uuidv4();
  return value;
}

app.get('/testDb', function(req, res, next){

  // execQuery("select * from product where product_id='d8791ce3-f011-4b15-bb93-f6a0e1c25af6'", function(err, response){
  //   return res.json(response);
  // })
  execQuery("delete from `product` where `product.product_id`='60574e20-f123-495a-87ca-7c7399f7517d'", function(err, response){
    if(err)
      return res.json(err);
    return res.json(response);
  })


})

app.use('/images', express.static('/home/nuwanarti/product-classifier/uploads/images'));

function execQuery(query, values, callback){
  db.any(query, values)
  .then(data => {
    // , (err, respond) => {
      // console.log(err, res)
      // console.log('ERRORS WERE : ' + JSON.stringify(err));
      console.log("came here : " + JSON.stringify(data));
      callback(null, data);
      // pool.end()
    // }
  })
  .catch(error => {
        console.log('ERROR: ', error);
      callback(error, null);
  });
}


function getJsonFromFile(fileName, callback){
  csv()
    .fromFile('/home/nuwanarti/product-classifier/uploads/' + fileName)
    .then((jsonObj)=>{
        console.log(jsonObj);
        callback(null, jsonObj);
        // return res.json(jsonObj);
        /**
         * [
         * 	{a:"1", b:"2", c:"3"},
         * 	{a:"4", b:"5". c:"6"}
         * ]
         */
       })
    .catch(e => {
      callback(e, null);
    })
}
// category name, parent category id, image URL


app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})
