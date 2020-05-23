const express = require('express');
const mongodb = require("mongodb");
const formidableMiddleware = require('express-formidable');
const fs = require('fs');
const cors = require('cors');
const path = require('path')


const app = express();
app.use(formidableMiddleware());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')))


const url ="mongodb+srv://iamdavonokeke:chibueze110500@cluster0-0r4zn.mongodb.net/test?retryWrites=true&w=majority"
const client =  new mongodb.MongoClient(url, { useUnifiedTopology: true}, { useNewUrlParser: true }, { connectTimeoutMS: 30000 }, { keepAlive: 1});
client.connect();
console.log("Connected correctly to server");

async function createMaterial(client, filePath, fileName, materialcourse, callback){
    try{
        db = client.db('chez');
        var bucket = new mongodb.GridFSBucket(db);
        fs.createReadStream(filePath).pipe(bucket.openUploadStream(fileName)).
            on('error', function (error) {
                console.log(error);
            }).
            on('finish', function () {
                db.collection('fs.files').findOneAndUpdate({ filename: fileName }, { $set: { course: materialcourse } }, { upsert: true, returnOriginal: false }, callback);
            })
            }
    catch(error){
        console.log(error);
    }
    finally {
     //client.close();
    }
}

async function getMaterials(client, materialcourse, cb){
    try{
        db = client.db('chez');
        await db.collection('fs.files').find({course:materialcourse}).toArray(cb)
        }
    catch(error){
        console.log(error);
    }
    finally {
        // client.close();
    }
}

async function getPdf(client, fileName, filePath, cb){
    try{
        db = client.db('chez');
        const bucket = new mongodb.GridFSBucket(db)
        bucket.openDownloadStreamByName(fileName).
            pipe(fs.createWriteStream(filePath)).
            on('finish', cb).
            on('error', cb);
        }
    catch(error){
        console.log(error);
    }
    finally {
         //client.close();
    }
}


app.post('/admin', (req, res)=>{
    if (req.fields.username === 'medicine' && req.fields.password === 'medicine'){
        res.status(200).json("success logging  in");
    }else{
        res.status(400).json('error logging in');
    }
})

app.get('/courses/:materialcourse', (req, res)=>{
   const materialcourse = req.params.materialcourse
   getMaterials(client, materialcourse, function(err, data){
    if (err) {
        console.log(err);
        return res(err);
    } else {
        return res.json(data);
    }
    })
});

app.get('/pdf/:pdfmaterial', (req, res)=>{
    const pdfmaterial = req.params.pdfmaterial
    getPdf(client, pdfmaterial, `./public/${pdfmaterial}`, function(err){
        if(err){
            console.log(err)
        }else{
            console.log('file done')
        return res.download(path.join(__dirname, `./public/${pdfmaterial}`))}
    })
 });
    

app.post('/upload', (req, res)=>{

    if(req.files === null){
        return res.status(400).json({msg : 'No file uploaded'});
    } 
    const file = req.files.file;
    const  fields = req.fields
    createMaterial(client, file.path, file.name, fields.course, function(err){
        if (err) {
            console.log(err);
            return res(err);
        } else {
            return res.json({msg: 'received file', fileName: file.name, filepath: file.path});
        }
    }
    );}
)
async function run() {
    try {
        app.listen(5000, () => console.log(`Example app listening on port 5000!`));

    } catch (err) {
        console.log(err.stack);
    }
    finally {
        await client.close();
    }
}

run()