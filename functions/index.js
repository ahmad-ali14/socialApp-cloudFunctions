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
        req.user.imageUrl = data.docs[0].data().imageUrl;
        return next();
    })
    .catch((err) => {
        console.log('Error ', err);
        res.status(403).json({"error": err})
    });
    



}


/*
*
*
* Screams Routes
* Screams Functions
*
*
*
*/

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

app.post('/scream', FBauth , (req, res) => {
    let newScream = {
        body: req.body.body,
        createdAt:new Date().toISOString(),
        userHandle: req.user.handle,
        userImage: req.user.imageUrl,
        likeCount:0,
        commentCount:0
    };

    db.collection('screams').add(newScream).then((doc)=>{
        const resScream = newScream;
        resScream.screamId = doc.id;
        res.json(resScream);
    })
    .catch((err) => {
        console.log('Error getting documents', err);
        res.status(500).json({"err": "Somthing went Wrong"})
    });
    

});


/*
* Get One Scream Details
*/

app.get('/scream/:screamId', (req, res) => {
    let screamData = {};

    //fetching DB for a scream
    db.doc(`/screams/${req.params.screamId}`).get().then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: 'Scream not found' });
        }
        screamData = doc.data();
        screamData.screamId = doc.id;

        //Fetching Comments on this scream
        return db.collection('comments').orderBy('createdAt', 'desc')
          .where('screamId', '==', req.params.screamId).get();
      })
      .then((data) => {
        screamData.comments = [];
        data.forEach((doc) => {
          screamData.comments.push(doc.data());
        });
        return res.json(screamData);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
      });
   });


/*
* Post one Comment on A scream 
*/

app.post('/scream/:screamId/comment', FBauth, (req, res) => {
    //validate submitted data
    if (req.body.body.trim() === '')
    return res.status(400).json({ comment: 'Must not be empty' });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl
  };
  //console.log(newComment);

  //query Db for that scream
  db.doc(`/screams/${req.params.screamId}`).get().then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Scream not found' });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: 'Something went wrong' });
    });
    

});

/*
* Delete a scream
*/

app.delete('/scream/:screamId', FBauth, (req, res) => {
    //fetch screams collection for this scream
    const document = db.doc(`/screams/${req.params.screamId}`);
  
    document.get().then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Scream not found' });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'Unauthorized' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'Scream deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
  
});



/*
* Like a scream
*/

app.get('/scream/:screamId/like', FBauth, (req, res) => {

    //fetching likes collection ofr this scream if it's liked by this user or not
    const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1);

  //fetching screams collection for this scream  
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData;

  screamDocument.get().then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Scream not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db.collection('likes').add({
            screamId: req.params.screamId,
            userHandle: req.user.handle
          })
          .then(() => {
            screamData.likeCount++;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      } else {
        return res.status(400).json({ error: 'Scream already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });

});


/*
* Unlike a scream
*/

app.get('/scream/:screamId/unlike', FBauth, (req, res) => {

    //fetching likes collection ofr this scream if it's liked by this user or not
    const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);


     //fetching screams collection for this scream 
    const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData;

  screamDocument.get().then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: 'Scream not found' });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: 'Scream not liked' });
      } else {
        return db.doc(`/likes/${data.docs[0].id}`).delete().then(() => {
            screamData.likeCount--;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            res.json(screamData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });

});



/*
*
*
* validation Functions
*
*
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
*
*
* User Routes
* User Functions
*
*
*
*/

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

     //validate submitted req data
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

    //updata DB with submitted data after validation
     db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: 'Details added successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });

});


/*
* Get OWN user Details
*/
app.get('/user', FBauth, (req, res) =>{
    let userData = {};
    
    //Query users db for user document details, Since it is aprotected route we have accssess to req.user Object.
    db.doc(`/users/${req.user.handle}`).get().then((doc) => {
        if (doc.exists) {
          userData.credentials = doc.data();
          //query likes DB for getting screams that are liked by this user.
          return db.collection('likes').where('userHandle', '==', req.user.handle)
             .get();
        }
      })
      .then((data) => {
        userData.likes = [];
        data.forEach((doc) => {
          userData.likes.push(doc.data());
        });
        return db.collection('notifications').where('recipient', '==', req.user.handle)
          .orderBy('createdAt', 'desc').limit(10).get();
      })
      .then((data) => {
        userData.notifications = [];
        data.forEach((doc) => {
          userData.notifications.push({
            recipient: doc.data().recipient,
            sender: doc.data().sender,
            createdAt: doc.data().createdAt,
            screamId: doc.data().screamId,
            type: doc.data().type,
            read: doc.data().read,
            notificationId: doc.id
          });
        });
        return res.json(userData);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
});


/*
* Get OTHER user Details
*/
app.get('/user/:handle',  (req, res) =>{

    let userData = {};
    //fetch users collection for this user
  db.doc(`/users/${req.params.handle}`).get().then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db.collection('screams')
          .where('userHandle', '==', req.params.handle).orderBy('createdAt', 'desc')
          .get();
      } else {
        return res.status(404).json({ errror: 'User not found' });
      }
    })
    .then((data) => {
      userData.screams = [];
      data.forEach((doc) => {
        userData.screams.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          screamId: doc.id
        });
      });
      return res.json(userData);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
   
});

/*
* Mark notifictions as read
*/
app.post('/notifications', FBauth, (req, res) =>{
    let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch.commit().then(() => {
      return res.json({ message: 'Notifications marked read' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
   
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


/*
* Notifictions Function on Like Scream
*/

exports.createNotificationOnLike = functions.region('europe-west1').firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/screams/${snapshot.data().screamId}`).get().then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => console.error(err));
  });



/*
* delete Notifictions Function on UnLike Scream
*/

  exports.deleteNotificationOnUnLike = functions.region('europe-west1')
  .firestore.document('likes/{id}').onDelete((snapshot) => {
    return db.doc(`/notifications/${snapshot.id}`).delete().catch((err) => {
        console.error(err);
        return;
      });
  });

 /*
* Notifictions Function on Comment on a Scream
*/ 

exports.createNotificationOnComment = functions.region('europe-west1')
  .firestore.document('comments/{id}').onCreate((snapshot) => {
    return db.doc(`/screams/${snapshot.data().screamId}`).get().then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });


/*
* Notifictions Function on Change profile Image for a user
*/ 

exports.onUserImageChange = functions.region('europe-west1')
.firestore.document('/users/{userId}').onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log('image has changed');
      const batch = db.batch();
      return db
        .collection('screams')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

/*
* Notifictions Function on Delete a Scream
*/ 

exports.onScreamDelete = functions.region('europe-west1')
  .firestore.document('/screams/{screamId}').onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('screamId', '==', screamId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('screamId', '==', screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('screamId', '==', screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });