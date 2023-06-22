From inside the fabric folder(where hyperledger fabric has been downloaded):


1. create network and ledger
	cd /home/negi/Desktop/CSCI531/Project/fabric/fabric-samples/test-network
	./network.sh down
	./network.sh up createChannel -c mychannel -ca

2. deploy the smart contract:
	./network.sh deployCC -ccn basic -ccp ../ehr/chaincode-javascript/ -ccl javascript  

3. Start the Fabric application from another terminal
We will interact with the auction smart contract through a set of Node.js applications. Change into the `application-javascript` directory:
	cd fabric-samples/ehr/application-javascript

INstall node.js and application specific dependencies
	npm install
	npm install -g nodemon
	npm install express --save
Every time we want to run application( make sure wallet folder is deleted from the js application if run previously)
	node app.js



{"patient_id":"p3","timestamp":"8/5/2022 18:5:48","user_id":"a1","action_type":"print"}	
