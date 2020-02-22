const functions = require('firebase-functions');
const admin = require('firebase-admin');

/*
* Initialize Firebase App and firestore DB
*/
admin.initializeApp();

let db = admin.firestore();

/*
* Firebase App Configurations
*/

const firebaseConfig = {
    apiKey: "AIzaSyB9RaIZ4Tb3wQq_fNYJqf7UMlAUOGCSdgI",
    authDomain: "socialapp-2bf83.firebaseapp.com",
    databaseURL: "https://socialapp-2bf83.firebaseio.com",
    projectId: "socialapp-2bf83",
    storageBucket: "socialapp-2bf83.appspot.com",
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
* Get Screams
*/

app.get('/screams', (req, res) => {
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

app.post('/screams', (req, res) => {
    let newScream = {
        body: req.body.body,
        createdAt:new Date().toISOString(),
        userHandle: req.body.userHandle
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
            return res.status(400).json({email: "this email has been taken"});
        }else{
        res.status(500).json({"error": err})
        }
    });

   
});
 

/*
* Exporting /api route to handle other back-end functions
*/

exports.api = functions.region("europe-west1").https.onRequest(app);