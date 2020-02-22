const functions = require('firebase-functions');
const admin = require('firebase-admin');
require('dotenv').config();

/*
* Initialize Firebase App and firestore DB
*/
admin.initializeApp();

let db = admin.firestore();

/*
* Firebase App Configurations
*/

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: "socialapp-2bf83.firebaseapp.com",
    databaseURL: "https://socialapp-2bf83.firebaseio.com",
    projectId: "socialapp-2bf83",
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: "358200962945",
    appId: "1:358200962945:web:bbcdffc621e54ec125c280",
    measurementId: "G-BDN25F9NY0"
  };

/*
* Initialize Express App
*/

const express = require('express');
var app = express();

/*
* Initialize Firebase App
*/
const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

/*
* Authentication meddillware to check if user logged in
*/

const FBauth = (req, res, next)=>{
    //retrive token from request
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.headers.authorization.split('Bearer ')[1];

    }else {
        console.error('No token Found');
        res.status(403).json({error: "unAuthorized"});
    }

    //check if token is valid
    admin.auth().verifyIdToken(idToken)
    .then((decodedToken)=>{
        req.user = decodedToken;
        // console.log(decodedToken);
        return db.collection('users').where('userId', '==', req.user.uid).limit(1).get()
    })
    .then((data)=>{
        req.user.handle = data.docs[0].data().handle;
        return next();
    })
    .catch((err) => {
        console.log('Error ', err);
        res.status(403).json({"error": err})
    });
    



}

/*
* Get Screams
*/

app.get('/screams',  (req, res) => {
    db.collection('screams').orderBy('createdAt', 'desc').get().then((snapshot) => {
        let screams = [];
        snapshot.forEach((doc) => {
          screams.push({
              id: doc.id,
              body: doc.data().body,
              userHandle: doc.data().userHandle,
              createdAt: doc.data().createdAt
          });
        });
        return res.json(screams);
      })
    .catch((err) => {
        console.log('Error getting documents', err);
    });

   });

/*
* Post a new Scream
*/

app.post('/screams', FBauth , (req, res) => {
    let newScream = {
        body: req.body.body,
        createdAt:new Date().toISOString(),
        userHandle: req.user.handle
    };

    db.collection('screams').add(newScream).then((doc)=>{
        res.json({ message: `Document created => ${ doc.id }` })
    })
    .catch((err) => {
        console.log('Error getting documents', err);
        res.status(500).json({"err": "Somthing went Wrong"})
    });
    

});

/*
* validation Functions
*/

const isEmpty = (str)=>{
    if(str.trim() === ""){
        return true;
    } else{
        return false;
    }
}

const isEmail = (email) => {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (email.match(emailRegEx)) {return true;}
    else { return false;}
}

/*
* sign up route
*/

app.post('/signup', (req, res)=> {
    //extracting request data
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    }

    //validate request data
    let errors = {};
    if(isEmpty(newUser.email)){
        errors.email = "must not be empty"
    }
    else if (!isEmail(newUser.email)){
        errors.email = "Email should be Valid!"
    }
   if (isEmpty(newUser.password)){
        errors.password = "Must not be empty"
    }
    if(newUser.password !== newUser.confirmPassword){
        errors.confirmPassword = "confirm password Does not match"
    }
    if(isEmpty(newUser.handle)){
        errors.handle = "must not be empty"
    }

    //break if there is an error
    if (Object.keys(errors).length > 0){ 
        return res.status(400).json(errors);
    }

    let token, userId;
    let noImg ="noImg.webp";

    //check if the username or userHandle existed before
    db.doc(`/users/${newUser.handle}`).get().then((doc)=>{
        //if handle existed, return Err
        if(doc.exists){
            return res.status(400).json({handle: "this userHandle has been taken"});
        } else {
            //else create user into Auth Db
            return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
    })
    //extract user's Token and Id
    .then((data)=>{
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    //saving to our Db, After bieng saved to auth Db
    .then((Token)=>{
        token = Token;
        const userCredentials = {
            handle: newUser.handle,
            email: newUser.email,
            createdAt: new Date().toISOString(),
            userId:userId,
            imageUrl: `https://firebasestorage.googleapis.com/v0/b/${process.env.STORAGE_BUCKET}/o/${noImg}?alt=media`

        }

        //save new user into users collection
        return db.doc(`/users/${newUser.handle}`).set(userCredentials)
    })
    //response
    .then(()=>{
        res.status(201).json({token})
    })
    .catch((err) => {
        console.log('Error getting documents', err);
        if(err.code === "auth/email-already-in-use"){
             res.status(400).json({email: "this email has been taken"});
        }else{
         res.status(500).json({"error": err})
        }
    });

   
});


/*
* Login Route
*/
app.post('/login', (req, res)=> {
    //extracting request data
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        
    }

    //validate request data
    let errors = {};
    if(isEmpty(newUser.email)){
        errors.email = "must not be empty"
    }
    else if (!isEmail(newUser.email)){
        errors.email = "Email should be Valid!"
    }
   if (isEmpty(newUser.password)){
        errors.password = "Must not be empty"
    }
    
    //break if there is an error
    if (Object.keys(errors).length > 0){ 
        return res.status(400).json(errors);
    }

    firebase.auth().signInWithEmailAndPassword(newUser.email, newUser.password)
    .then((data)=>{
        return data.user.getIdToken(); 
    })
    .then((token)=>{
        res.json({token})
    })
    .catch((err) => {
        console.log('Error', err);
        if(err.code === "auth/wrong-password"){
             res.status(403).json({general: "wrong credentials, try again"});
        }else{
         res.status(500).json({"error": err})
        }
    });

});


/*
* Add user Details
*/
app.post('/user', FBauth, (req, res) =>{
     let userDetails = {};

     if(!isEmpty(req.body.bio.trim())){
         userDetails.bio = req.body.bio.trim();
     }

     if(!isEmpty(req.body.website.trim())){
         if(req.body.website.trim().substring(0,4) !== 'http' ){
             userDetails.website = 'http://'+ req.body.website.trim();
         } else{
             userDetails.website = req.body.website.trim();
         }
     }

     if(!isEmpty(req.body.location)){
         userDetails.location = req.body.location;
     }

});


/*
* Upload user Image Route
*/
app.post('/user/image', FBauth , (req, res)=>{
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers });

    let imageToBeUploaded = {};
    let imageFileName;

    busboy.on('file', (fieldname, file, filename, encoding, mimetype)=>{
        // console.log(fieldname, file, filename, encoding, mimetype);
        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
            return res.status(400).json({ error: 'Wrong file type submitted' });
          }

        const imageExtension = filename.split('.')[filename.split('.').length - 1];
        imageFileName = Math.round(Math.random() * 1000000000000).toString().trim()+'.'+imageExtension;
        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));
    })


    busboy.on('finish', () => {
        admin
          .storage()
          .bucket()
          .upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
              metadata: {
                contentType: imageToBeUploaded.mimetype
              }
            }
          })
          .then(() => {
            const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/'+process.env.STORAGE_BUCKET+'/o/'+imageFileName+'?alt=media';
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
          })
          .then(() => {
            return res.json({ message: 'image uploaded successfully' });
          })
          .catch((err) => {
            console.error(err);
            return res.status(500).json({ error: 'something went wrong' });
          });
      });

      busboy.end(req.rawBody);


})

/*
* Exporting /api route to handle other back-end functions
*/

exports.api = functions.region("europe-west1").https.onRequest(app);