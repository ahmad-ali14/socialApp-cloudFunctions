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

app.get('/screams', (request, response) => {
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
        return response.json(screams);
      })
    .catch((err) => {
        console.log('Error getting documents', err);
    });

   });

/*
* Post a new Scream
*/

app.post('/screams', (request, response) => {
    let newScream = {
        body: request.body.body,
        createdAt:new Date().toISOString(),
        userHandle: request.body.userHandle
    };

    db.collection('screams').add(newScream).then((doc)=>{
        response.json({ message: `Document created => ${ doc.id }` })
    })
    .catch((err) => {
        console.log('Error getting documents', err);
        response.status(500).json({"err": "Somthing went Wrong"})
    });
    

});

/*
* sign up route
*/

app.post('/signup', (req, res)=> {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    }

    firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password).then((data)=>{
        res.status(201).json({message: `User ${data.user.uid} Created Successfully`})
    }) 
    .catch((err) => {
        console.log('Error getting documents', err);
        response.status(500).json({"error": err.code})
    });
});
 

/*
* Exporting /api route to handle other back-end functions
*/

exports.api = functions.region("europe-west1").https.onRequest(app);