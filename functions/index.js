const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

let db = admin.firestore();

const express = require('express');
var app = express();

app.get('/screams', (request, response) => {
    db.collection('screams').get().then((snapshot) => {
        let screams = [];
        snapshot.forEach((doc) => {
          console.log(doc.id, '=>', doc.data());
          screams.push(doc.data());
        });
        return response.json(screams);
      })
    .catch((err) => {
        console.log('Error getting documents', err);
    });

   });



   exports.createScreams = functions.https.onRequest((request, response) => {
        let newScream = {
            body: request.body.body,
            createdAt:admin.firestore.Timestamp.fromDate(new Date()),
            userHandle: request.body.userHandle
        };

        db.collection('screams').add(newScream).then((doc)=>{
            response.json({ message: `Document created => ${ doc.data() }` })
        })
        .catch((err) => {
            console.log('Error getting documents', err);
            response.status(500).json({"err": "Somthing went Wrong"})
        });
        

   });

   exports.api = functions.https.onRequest(app);