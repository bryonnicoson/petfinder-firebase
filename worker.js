/*
	petfinder-firebase worker.js - node js script - bryon.nicoson@gmail.com
	running this on heroku express server - request launches process

	1) retrieve petfinder api data for shelter animals
	2) format/edit data 
	3) update firebase with formatted data
	4) remove placed animals from firebase
 */

const express = require('express')
const PORT = process.env.PORT || 5000
const admin = require("firebase-admin");
	
express().get('/', (req, res) => {
	main()
		.catch(e => {console.log(e)});
	res.send('process initiated');
	}).listen(PORT, () => console.log(`Express listening on port ${ PORT }`));

/* main script execution  
*/
async function main() {

	const fetch = require("node-fetch");
	const url = process.env.PETFINDER_URL;

	const response = await fetch(url);
	const txt = await response.text();
	const data = await JSON.parse(txt.substring(2, txt.length-2));
	const dogs = data.petfinder.pets.pet;

	await update_firebase(dogs); 
	await admin.app().delete();
}
	
/* update firebase, editing and removing data as required
 */
async function update_firebase(dogs){

	admin.initializeApp({
  		credential: admin.credential.cert({
  			"private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  			"client_email": process.env.FIREBASE_CLIENT_EMAIL
  		}),
  		databaseURL: process.env.FIREBASE_URL
	});

	const database = admin.database();
	const ref = database.ref('dogs');
	
	for (var i = 0; i < dogs.length; i++) {

		var key = await ref.child(dogs[i].id.$t).update({

			age: dogs[i].age.$t,	
			breed: edit_breed(dogs[i].breeds.breed),				
			description: edit_description(dogs[i].description.$t),
			id: dogs[i].id.$t,
			mix: dogs[i].mix.$t,
			name: dogs[i].name.$t,
			options: edit_options(dogs[i].options.option),
			photos: edit_photos(dogs[i].media.photos.photo),
			sex: edit_sex(dogs[i].sex.$t),
			shelterPetId: dogs[i].shelterPetId.$t,
			size: edit_size(dogs[i].size.$t)
			
		});
	}

	// make an array of keys from petfinder dogs
	var dog_ids = [];
	for (var i = 0; i < dogs.length; i++) {
		dog_ids.push(dogs[i].id.$t);
	}

	// if firebase snapshot key isn't in petfinder, remove it
	var query = ref.orderByKey();
	await query.once("value")
	.then(function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			if (!(dog_ids.includes(childSnapshot.key))){
				ref.child(childSnapshot.key).remove();
			}
		});
	});
}

/* make sex (M/F) explicit
*/
var edit_sex = function(sex){
	return sex == 'M' ? 'Male' : 'Female';
};

/* make size explicit
*/
var edit_size = function(size){
    switch (size){
    	case 'S':
        	return 'Small';
        	break;
      	case 'M':
        	return 'Medium';
        	break;
      	case 'L':
        	return 'Large';
        	break;
      	case 'XL':
        	return 'Extra Large';
        	break;
    }
};

/*  cleanup the description 
 *  - remove everything from first occurence of "linkSentenceStarters" to end  
 */
var edit_description = function(description) {

    var linkSentenceStarters = [    
      	"To fill out our",            // these phrases precede the inclusion of urls, 
      	"For adoption information",   // which we don't need to include
      	"For information about"
    ];
    var firstMention = 9999;

    for (var i = 0; i < linkSentenceStarters.length; i++) {
    	var match = description.indexOf(linkSentenceStarters[i]);

      	if (match != -1 && match < firstMention) {
        	firstMention = match;
      	}
    }
    
    description = description.slice(0, firstMention);
    return description;
};

/* create breed arrays - petfinder single breed stored as string - standardize to array
 */
var edit_breed = function(breed) {
	var b = [];
	if (Array.isArray(breed)) {
		for (var i = 0; i < breed.length; i++) {
			b.push(breed[i].$t);
		}
	} else {
		b.push(breed.$t);
	}
	return b;
};

/* create pet options arrays (altered, houstrained, shots, special needs, etc.)
*/
var edit_options = function(options) {
	var o = [];
	for (var i = 0; i < options.length; i++) {
		o.push(options[i].$t);
	} 	
	return o;
};

/* petfinder stores multiple sizes of each pic - we just need one
*/
var edit_photos = function(photos) {
    var p = [];
    for (var i = 0; i < photos.length; i++) {
    	if (photos[i]['@size'] == 'x'){
    		p.push(photos[i].$t);
    	}
  	}
  	return p;
};