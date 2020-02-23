let db ={
    users:[
        {
            userId: 'realjlfdbjldfb',
            email: 'e@m.com',
            handle: 'user',
            createdAt: "2020-02-21T21:56:25.955Z",
            imageUrl: 'https://fdkjdl..',
            bio: 'user\'s bio',
            website: 'ahmad-ali.co.uk',
            location: 'London, UK'

        }
    ], 
    screams:[
        {
            userHandle: 'user',
            body: 'scream body',
            createdAt: "2020-02-21T21:56:25.955Z",
            likeCount: 5,
            commentCCount: 5
        }
    ],
    comments:[
        {
            userHandle: 'user',
            body: 'comment body',
            createdAt: "2020-02-21T21:56:25.955Z",
            screamId: "sjdijdssdgv"
        }

    ],
    notifications: [
        {
            recepient: 'user1',
            sender: 'user2',
            read: 'true | false',
            type: ' like | comment ',
            screamId: "olrfjolijed",
            createdAt: "2020-02-21T21:56:25.955Z"
        }
    ]
}


const userDetails = {
    //redux data
    credentials:  {
        userId: 'realjlfdbjldfb',
        email: 'e@m.com',
        handle: 'user',
        createdAt: "2020-02-21T21:56:25.955Z",
        imageUrl: 'https://fdkjdl..',
        bio: 'user\'s bio',
        website: 'ahmad-ali.co.uk',
        location: 'London, UK'

    },
    likes: [
        {
            userHandle: "user1",
            "screamId": "lkgfjolfgjol"
        },
        {
            userHandle: "user1",
            "screamId": "lkgfjolffdghfhsgsfgjol"
        }
    ]

}