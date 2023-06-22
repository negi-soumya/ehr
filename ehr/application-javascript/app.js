/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { createHash,randomBytes,createCipheriv,createDecipheriv,createDecipher,createCipher } = require('crypto');


const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../../test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildCCPOrg2, buildWallet } = require('../../test-application/javascript/AppUtil.js');

const channelName = process.env.CHANNEL_NAME || 'mychannel';
const chaincodeName = process.env.CHAINCODE_NAME || 'basic';

const mspOrg1 = 'Org1MSP';
const mspOrg2 = 'Org2MSP';
const ccpOrg1 = buildCCPOrg1(); // build an in memory object with the network configuration (also known as a connection profile)
const ccpOrg2 = buildCCPOrg2(); // build an in memory object with the network configuration (also known as a connection profile)
const caOrg1Client = buildCAClient(FabricCAServices, ccpOrg1, 'ca.org1.example.com'); // build an instance of the fabric ca services client based on the information in the network configuration
const caOrg2Client = buildCAClient(FabricCAServices, ccpOrg2, 'ca.org2.example.com'); // build an instance of the fabric ca services client based on the information in the network configuration
const walletPathOrg1 = path.join(__dirname, 'wallet/org1');
const walletPathOrg2 = path.join(__dirname, 'wallet/org2');


const initdata = [
	{ patient_id: 'p1',
                timestamp: '3/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'create',
                },
        { patient_id: 'p2',
                timestamp: '5/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'delete',
                },
        { patient_id: 'p7',
                timestamp: '8/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'change',
                },
        { patient_id: 'p3',
                timestamp: '8/5/2022 18:5:48',
                user_id: 'a1',
                action_type: 'print',
                }
]


// Snippet source https://stackoverflow.com/questions/60369148/how-do-i-replace-deprecated-crypto-createcipher-in-node-js
const algorithm = 'aes-256-ctr';
const ENCRYPTION_KEY = Buffer.from('FoCKvdLslUuB4y3EZlKate7XGottHski1LmyqJHvUhs=', 'base64');; // or generate sample key Buffer.from('FoCKvdLslUuB4y3EZlKate7XGottHski1LmyqJHvUhs=', 'base64');
const IV_LENGTH = 16;

function encrypt(text) {
    let iv = randomBytes(IV_LENGTH);
    let cipher = createCipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = createDecipheriv(algorithm, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

// pre-requisites:
// - fabric-sample two organization test-network setup with two peers, ordering service,
//   and 2 certificate authorities
//         ===> from directory /fabric-samples/test-network
//         ./network.sh up createChannel -ca
// - Use any of the asset-transfer-basic chaincodes deployed on the channel "mychannel"
//   with the chaincode name of "basic". The following deploy command will package,
//   install, approve, and commit the javascript chaincode, all the actions it takes
//   to deploy a chaincode to a channel.
//         ===> from directory /fabric-samples/test-network
//         ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-javascript/ -ccl javascript
// - Be sure that node.js is installed
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         node -v
// - npm installed code dependencies
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         npm install
// - to run this test application
//         ===> from directory /fabric-samples/asset-transfer-basic/application-javascript
//         node app.js

// NOTE: If you see  kind an error like these:
/*
    2020-08-07T20:23:17.590Z - error: [DiscoveryService]: send[mychannel] - Channel:mychannel received discovery error:access denied
    ******** FAILED to run the application: Error: DiscoveryService: mychannel error: access denied

   OR

   Failed to register user : Error: fabric-ca request register failed with errors [[ { code: 20, message: 'Authentication failure' } ]]
   ******** FAILED to run the application: Error: Identity not found in wallet: appUser
*/
// Delete the /fabric-samples/asset-transfer-basic/application-javascript/wallet directory
// and retry this application.
//
// The certificate authority must have been restarted and the saved certificates for the
// admin and application user are not valid. Deleting the wallet store will force these to be reset
// with the new certificate authority.
//

/**
 *  A test application to show basic queries operations with any of the asset-transfer-basic chaincodes
 *   -- How to submit a transaction
 *   -- How to query and check the results
 *
 * To see the SDK workings, try setting the logging to show on the console before running
 *        export HFC_LOGGING='{"debug":"console"}'
 */

async function connectToOrg1CA(UserID,walletOrg1) {
	console.log('\n--> Register and enrolling new user');
	await registerAndEnrollUser(caOrg1Client, walletOrg1, mspOrg1, UserID, 'org1.department1');
}

async function connectToOrg2CA(UserID,walletOrg2) {
	console.log('\n--> Register and enrolling new user');

	await registerAndEnrollUser(caOrg2Client, walletOrg2, mspOrg2, UserID, 'org2.department1');

	
}
async function enrollUsers(walletOrg1,walletOrg2) {
	try {
		// Enroll 10 patients in org1
		
		await connectToOrg1CA('p1',walletOrg1);
		await connectToOrg1CA('p2',walletOrg1);
		await connectToOrg1CA('p3',walletOrg1);
		await connectToOrg1CA('p4',walletOrg1);
		await connectToOrg1CA('p5',walletOrg1);
		await connectToOrg1CA('p6',walletOrg1);
		await connectToOrg1CA('p7',walletOrg1);
		await connectToOrg1CA('p8',walletOrg1);
		await connectToOrg1CA('p9',walletOrg1);
		await connectToOrg1CA('p10',walletOrg1);
		
		// Enrol 3 auditors in org2
		
		await connectToOrg2CA('a1',walletOrg2);
		await connectToOrg2CA('a2',walletOrg2);
		await connectToOrg2CA('a3',walletOrg2);
		
	} catch (error) {
		console.error(`Error in enrolling admin: ${error}`);
		process.exit(1);
	}
}

async function enrollAdmins(walletOrg1,walletOrg2) {
	console.log('\n--> Enrolling the Org1 CA admin');	
	await enrollAdmin(caOrg1Client, walletOrg1, mspOrg1);
	
	console.log('\n--> Enrolling the Org2 CA admin');
	await enrollAdmin(caOrg2Client, walletOrg2, mspOrg2);

}

async function initializeLedger(walletOrg1) {
		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccpOrg1, {
				wallet: walletOrg1,
				identity: 'p1',
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);
/*	
			// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
			// This type of transaction would only be run once by an application the first time it was started after it
			// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
			// an "init" type function.
			console.log('\n--> Submit Transaction: InitLedger, function created the initial set of assets on the ledger');
			await contract.submitTransaction('InitLedger');
			console.log('*** Result: committed');
*/
			
			for(let record_value of initdata) {
			let ts = timestamp();
			let ID = createHash('sha256').update((ts)).digest('hex');
	                let val = JSON.stringify(record_value);
	                try {
				console.log('\n--> Submit Transaction: CreateAsset for init, with ID(hash of userid+timestamp), and record_value');
				let result = await contract.submitTransaction('CreateAsset', ID, encrypt(val));
				console.log(result.toString());
				console.log('*** Result: committed');
			} catch(error){
				console.log(`*** Successfully caught the error in initialize(): \n    ${error}`);
			}			
			}
			
		} catch (error) {
		console.error(`******** FAILED to connect to gateway: ${error}`);
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
}


async function main() {
	try {
		const walletOrg1 = await buildWallet(Wallets, walletPathOrg1);
		const walletOrg2 = await buildWallet(Wallets, walletPathOrg2);
				
		// Enroll admins. // in a real application this would be done on an administrative flow, and only once
		await enrollAdmins(walletOrg1,walletOrg2);
		
		// Enroll users. There are 13 hardcoded users: 10 patients and 3 auditors. in a real application this would be done only when a new user was required to be added and would be part of an administrative flow
		await enrollUsers(walletOrg1,walletOrg2);
		await initializeLedger(walletOrg1);
		
	} catch (error) {
		console.error(`******** FAILED to run the application: ${error}`);
		process.exit(1);
	}
}

/*
	
		// Create a new gateway instance for interacting with the fabric network.
		// In a real application this would be done as the backend server session is setup for
		// a user that has been verified.
		const gateway = new Gateway();

		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
				wallet,
				identity: org1UserId,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});

			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);

			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);

			// Initialize a set of asset data on the channel using the chaincode 'InitLedger' function.
			// This type of transaction would only be run once by an application the first time it was started after it
			// deployed the first time. Any updates to the chaincode deployed later would likely not need to run
			// an "init" type function.
			console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
			await contract.submitTransaction('InitLedger');
			console.log('*** Result: committed');

			// Let's try a query type operation (function).
			// This will be sent to just one peer and the results will be shown.
			console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
			let result = await contract.evaluateTransaction('GetAllAssets');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);

			// Now let's try to submit a transaction.
			// This will be sent to both peers and if both peers endorse the transaction, the endorsed proposal will be sent
			// to the orderer to be committed by each of the peer's to the channel ledger.
			console.log('\n--> Submit Transaction: CreateAsset, creates new asset with ID, color, owner, size, and appraisedValue arguments');
			result = await contract.submitTransaction('CreateAsset', 'asset313', 'yellow', '5', 'Tom', '1300');
			console.log('*** Result: committed');
			if (`${result}` !== '') {
				console.log(`*** Result: ${prettyJSONString(result.toString())}`);
			}

			console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given assetID');
			result = await contract.evaluateTransaction('ReadAsset', 'asset313');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);

			console.log('\n--> Evaluate Transaction: AssetExists, function returns "true" if an asset with given assetID exist');
			result = await contract.evaluateTransaction('AssetExists', 'asset1');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);

			console.log('\n--> Submit Transaction: UpdateAsset asset1, change the appraisedValue to 350');
			await contract.submitTransaction('UpdateAsset', 'asset1', 'blue', '5', 'Tomoko', '350');
			console.log('*** Result: committed');

			console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
			result = await contract.evaluateTransaction('ReadAsset', 'asset1');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);

			try {
				// How about we try a transactions where the executing chaincode throws an error
				// Notice how the submitTransaction will throw an error containing the error thrown by the chaincode
				console.log('\n--> Submit Transaction: UpdateAsset asset70, asset70 does not exist and should return an error');
				await contract.submitTransaction('UpdateAsset', 'asset70', 'blue', '5', 'Tomoko', '300');
				console.log('******** FAILED to return an error');
			} catch (error) {
				console.log(`*** Successfully caught the error: \n    ${error}`);
			}

			console.log('\n--> Submit Transaction: TransferAsset asset1, transfer to new owner of Tom');
			await contract.submitTransaction('TransferAsset', 'asset1', 'Tom');
			console.log('*** Result: committed');

			console.log('\n--> Evaluate Transaction: ReadAsset, function returns "asset1" attributes');
			result = await contract.evaluateTransaction('ReadAsset', 'asset1');
			console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	
}
*/


async function print_audit_log(userid,role) {
	const gateway = new Gateway();
	const walletOrg1 = await Wallets.newFileSystemWallet( walletPathOrg1);
	const walletOrg2 = await Wallets.newFileSystemWallet( walletPathOrg2);
	let audit_log = 'Audit log is empty';
	
	//Set org of userid as per role(will verify role later)
	let w = walletOrg2;
	let ccp = ccpOrg2;
	if (role == "patient") {
		w = walletOrg1;
		ccp = ccpOrg1;
	}
	
	try {
		
		await gateway.connect(ccp, {
				wallet: w,
				identity: userid,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
	
		const network = await gateway.getNetwork(channelName);
		const contract = network.getContract(chaincodeName);
		
		// This will be sent to just one peer and the results will be shown.
		console.log('\n--> Evaluate Transaction: GetAllAssets, function returns all the current assets on the ledger');
		let result = await contract.evaluateTransaction('GetAllAssets');
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		audit_log = result.toString();

	} catch (error) {
		console.log(`*** Successfully caught the error: \n    ${error}`);
		return(`*** Successfully caught the error: \n    ${error}`);	
	} finally {

		gateway.disconnect();
		return(audit_log);
	}
	
	return audit_log;
}

function timestamp(){
	let currentDate = new Date();
	let cDay = currentDate.getDate();
	let cMonth = currentDate.getMonth() + 1;
	let cYear = currentDate.getFullYear();
        let ts = cDay + "/" + cMonth + "/" + cYear + " " + currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
        return ts;
}

async function get_all_records(allrecords) {
	let records = JSON.parse(allrecords)
	
	let jsond = []
	for (const rec of records) {
		let decrypted_data = decrypt(rec.record)
		let json_of_decrypted = JSON.parse(decrypted_data);
		let tmp = rec;
		tmp.record = json_of_decrypted;
		jsond.push(tmp);
	}
	
	return(JSON.stringify(jsond));
}

async function get_user_records(userid,allrecords) {
	let records = JSON.parse(allrecords)
	
	let jsond = []
	for (const rec of records) {
		let decrypted_data = decrypt(rec.record)
		let json_of_decrypted = JSON.parse(decrypted_data);
		if(json_of_decrypted.patient_id == userid) {
			let tmp = rec;
			tmp.record = json_of_decrypted;
			jsond.push(tmp);
		}
	}
	
	return(JSON.stringify(jsond));
}

async function add_audit_data(userid,allrecords,contract){
	let records = JSON.parse(allrecords)
	
	for (let rec of records) {
		//add audit record after querying
		let ts = timestamp();
		let ID = createHash('sha256').update((userid+ts)).digest('hex');
		let record_value = { patient_id: rec.record.patient_id,
                	timestamp: ts,
                	user_id: userid,
                	action_type: 'query',
                }
                let val = JSON.stringify(record_value);
                
                try {
			console.log('\n--> Submit Transaction: CreateAsset after querying, with ID(hash of userid+timestamp), and record_value');
			let result = await contract.submitTransaction('CreateAsset', ID, encrypt(val));
			console.log(result.toString());
			console.log('*** Result: committed');
		} catch(error){
			console.log(`*** Successfully caught the error: \n    ${error}`);
		}
	}
}

async function query_audit_log(userid,role) {
	const gateway = new Gateway();
	const walletOrg1 = await Wallets.newFileSystemWallet( walletPathOrg1);
	const walletOrg2 = await Wallets.newFileSystemWallet( walletPathOrg2);
	let audit_records = 'Audit records are empty';
	
	//Set org of userid as per role(will verify role later)
	let w = walletOrg2;
	let ccp = ccpOrg2;
	if (role == "patient") {
		w = walletOrg1;
		ccp = ccpOrg1;
	}
	
	try {
		
		await gateway.connect(ccp, {
				wallet: w,
				identity: userid,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
	
		const network = await gateway.getNetwork(channelName);
		const contract = network.getContract(chaincodeName);
		
		// This will be sent to just one peer and the results will be shown.
		console.log('\n--> Evaluate Transaction: GetAllAssets for querying, function returns all the current assets on the ledger');
		let result = await contract.evaluateTransaction('GetAllAssets');
		
		console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		if (role == "auditor") {
			
			audit_records = await get_all_records(result.toString());
		} else{

			audit_records = await get_user_records(userid,result.toString());
		}
		
		await add_audit_data(userid,audit_records,contract);
	} catch (error) {
		console.log(`*** Successfully caught the error in query_audit_log(): \n    ${error}`);
		audit_records = `Failed to Connect: \n    ${error}`;
	} finally {
		gateway.disconnect();
		return(audit_records);
	}
	
	return audit_records;
}

async function print_history(res){
	let i=1;
	let str='';
	for(let it of res){
		str += `Record ${i} = ${it},`;
		i+=1;
	}
	return str;
}

async function test_immutability(userid,role,recid) {
	
	const gateway = new Gateway();
	const walletOrg1 = await Wallets.newFileSystemWallet( walletPathOrg1);
	const walletOrg2 = await Wallets.newFileSystemWallet( walletPathOrg2);
	let test_res = 'Test records are empty';
	
	//Set org of userid as per role(will verify role later)
	let w = walletOrg2;
	let ccp = ccpOrg2;
	if (role == "patient") {
		w = walletOrg1;
		ccp = ccpOrg1;
	}
	
	try {
		
		await gateway.connect(ccp, {
				wallet: w,
				identity: userid,
				discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
	
		const network = await gateway.getNetwork(channelName);
		const contract = network.getContract(chaincodeName);
		
		// Test history before deleting
		console.log('\n--> Evaluate Transaction: GetModificationHistory for recid, before deleting');
		let result1 = await contract.evaluateTransaction('GetModificationHistory',recid);
		console.log(`*** Immut. Test Results: ${JSON.parse(result1)}`);
		let result1json = JSON.parse(result1);
		test_res = 'Modification history of record before deleting\n';
		test_res += ` ${await print_history(result1json)}`;
		
		//delete the record
		console.log('\n--> Evaluate Transaction: DeleteAsset for recid');
		let result = await contract.submitTransaction('DeleteAsset',recid);
		
		console.log(`*** Delete Results: ${result.toString()}`);
		test_res +=  ('\n' + `${recid.toString()}` + 'has been deleted\n\n');
		
		// Test history after deleting
		console.log('\n--> Evaluate Transaction: GetModificationHistory for recid, after deleting');
		let result2 = await contract.evaluateTransaction('GetModificationHistory',recid);
		let result2json = JSON.parse(result2);
		
		console.log(`*** Immut. Test Results: ${JSON.parse(result2)}`);
		
		test_res += ( 'Modification history of record after deleting\n' + `${await print_history(result2json)}`);
		test_res += '\nThe most recent entry is a null string i.e. record has been deleted';
				
		
	} catch (error) {
		console.log(`*** Successfully caught the error in test_immutability(): \n    ${error}`);
		test_res = `Failed to Connect: \n    ${error}`;
	} finally {
		gateway.disconnect();
		return(test_res);
	}
	
	return test_res;
}


app.get('/', (req,res) => {
	res.sendFile(path.join(__dirname, '/frontend/form.html'))
	
})

app.get('/userid/:userid/action/:action/role/:role/recid/:recid', async function (req,res) {
	console.log('Form submitted successfully');
	if (req.params.action == 'ae') {
		let resp = await print_audit_log(req.params.userid,req.params.role);
		res.send(resp);
		
	}
	if (req.params.action == 'default') {
		let resp = await query_audit_log(req.params.userid,req.params.role);
		res.send(resp);
	}
	
	if (req.params.action == 'hm') {
		let resp = await test_immutability(req.params.userid,req.params.role,req.params.recid);
		res.send(resp);
	}
	
	
})

app.use( express.static('frontend'));

app.listen(port, () => {
	console.log(`Backend listening on http://localhost:${port}`)
})

main();
